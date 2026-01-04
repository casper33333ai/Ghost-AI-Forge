const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function initiateQuantumForge() {
  console.log('🏗️ [V14.5-BUILDER] Patching Android Native Source...');
  
  const exec = (cmd) => execSync(cmd, { stdio: 'inherit' });

  try {
    if (!fs.existsSync('android')) exec('npx cap add android');
    exec('npx cap sync android');

    const manifestPath = 'android/app/src/main/AndroidManifest.xml';
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    if (!manifest.includes('android:usesCleartextTraffic="true"')) {
      manifest = manifest.replace('<application', '<application android:usesCleartextTraffic="true"');
      fs.writeFileSync(manifestPath, manifest);
    }

    const javaPath = 'android/app/src/main/java/com/forge/ghost/v14/MainActivity.java';
    if (fs.existsSync(javaPath)) {
      let javaCode = fs.readFileSync(javaPath, 'utf8');
      if (!javaCode.includes('CookieManager')) {
        const importPatch = 'import android.webkit.CookieManager;\nimport android.webkit.WebSettings;\nimport com.getcapacitor.BridgeActivity;';
        javaCode = javaCode.replace('import com.getcapacitor.BridgeActivity;', importPatch);
        
        const initPatch = `
    @Override
    public void onResume() {
        super.onResume();
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(this.bridge.getWebView(), true);
        WebSettings settings = this.bridge.getWebView().getSettings();
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setUserAgentString("Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36");
    }
`;
        javaCode = javaCode.replace('public class MainActivity extends BridgeActivity {}', 'public class MainActivity extends BridgeActivity {' + initPatch + '}');
        fs.writeFileSync(javaPath, javaCode);
      }
    }

    if (process.platform !== 'win32') exec('chmod -R 777 android');
    
    const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    exec('cd android && ' + gradlew + ' assembleDebug --no-daemon');
    
    console.log('✨ [SUCCESS] Forge Complete.');
  } catch (e) {
    console.error('❌ [ERROR] Build failure:', e.message);
    process.exit(1);
  }
}
initiateQuantumForge();