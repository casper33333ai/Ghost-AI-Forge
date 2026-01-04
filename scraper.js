const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function ghostScrape() {
  const url = process.env.AI_URL || "https://aistudio.google.com/u/1/apps/drive/1C95LlT34ylBJSzh30JU2J1ZlwMZSIQrx?showPreview=true&showAssistant=true";
  const rawCookies = process.env.SESSION_COOKIES || '[]';
  const userDataDir = path.join(process.cwd(), '.chrome-session');
  
  console.log('👻 [GHOST-PROTOCOL] Initializing Human-Emulation Engine...');
  
  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: '/usr/bin/google-chrome',
    userDataDir: userDataDir,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', 
      '--disable-gpu',
      '--disable-web-security',
      '--disable-blink-features=AutomationControlled', // Critical: Hides automation flag
      '--disable-features=IsolateOrigins,site-per-process',
      '--lang=en-US,en;q=0.9'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a high-fidelity Mobile Android User-Agent
    const androidUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';
    await page.setUserAgent(androidUA);

    // Overwrite the navigator.webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    if (rawCookies && rawCookies.length > 20) {
      console.log('🍪 [AUTH] Injecting Session Vault...');
      const cookies = JSON.parse(rawCookies);
      await page.setCookie(...cookies.map(c => ({
        ...c, 
        domain: c.domain || '.google.com',
        secure: true,
        httpOnly: c.httpOnly || false,
        sameSite: 'Lax'
      })));
      
      // Random delay to simulate human "pasting/loading" time
      const jitter = Math.floor(Math.random() * 3000) + 2000;
      console.log(`⏳ [EMULATE] Waiting ${jitter}ms for session stabilization...`);
      await delay(jitter);
    }

    console.log('🌐 [CONNECT] Tunnelling to: ' + url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 150000 });
    
    // Additional delay after navigation to handle SPA hydration
    await delay(5000);

    console.log('⏳ [HYDRATE] Waiting for DOM Stability...');
    try {
      await page.waitForSelector('app-root', { timeout: 60000 });
    } catch (e) {
      console.log('⚠️ Marker "app-root" not found, continuing with partial capture.');
    }

    const bundleData = await page.evaluate(() => {
      return {
        html: document.body.innerHTML,
        head: document.head.innerHTML,
        origin: window.location.origin,
        cookies: document.cookie
      };
    });

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${bundleData.origin}/">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <title>Ghost AI Native</title>
  ${bundleData.head}
  <script>
    (function() {
      const cookies = ${JSON.stringify(bundleData.cookies)};
      if (cookies) {
        cookies.split(';').forEach(c => {
          document.cookie = c.trim() + "; domain=.google.com; path=/; SameSite=Lax";
        });
      }
    })();
  </script>
  <style>
    body { background: #000 !important; color: #fff !important; margin: 0; padding: 0; }
    #forge-container { width: 100vw; height: 100vh; overflow: auto; -webkit-overflow-scrolling: touch; }
  </style>
</head>
<body class="ghost-v14-5">
  <div id="forge-container">${bundleData.html}</div>
</body>
</html>`;

    if (!fs.existsSync('www')) fs.mkdirSync('www', { recursive: true });
    fs.writeFileSync(path.join('www', 'index.html'), finalHtml);
    console.log('✅ [MANIFEST] Interface captured using Ghost Protocol.');
  } catch (err) {
    console.error('❌ [FATAL] Ghost Protocol failed:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}
ghostScrape();