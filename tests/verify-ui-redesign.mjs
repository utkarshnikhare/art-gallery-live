import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

function startServer(port = 4174) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath.startsWith('/art-gallery-live/')) {
      reqPath = reqPath.replace('/art-gallery-live', '');
    }
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const filePath = path.join(distDir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const indexPath = path.join(distDir, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  console.log('--- STARTING LIGHT THEME VISUAL AUDIT & VIEWPORT VERIFICATION ---');

  const server = await startServer(4174);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'small-mobile', width: 320, height: 640 },
  ];

  const screenshotsDir = path.resolve(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:4174/art-gallery-live/', { waitUntil: 'networkidle0' });

    // Check horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const hasHorizontalOverflow = scrollWidth > clientWidth;
    console.log(`Viewport [${vp.name}] ${vp.width}x${vp.height}: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, overflow=${hasHorizontalOverflow}`);

    if (hasHorizontalOverflow) {
      console.error(`ERROR: Horizontal overflow detected on ${vp.name}! (scroll: ${scrollWidth}, client: ${clientWidth})`);
      const wide = await page.evaluate((cw) => {
        return Array.from(document.querySelectorAll('*'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.right > cw + 1;
          })
          .map((el) => ({
            tag: el.tagName,
            cls: el.className,
            right: el.getBoundingClientRect().right,
            width: el.getBoundingClientRect().width,
          }))
          .slice(0, 10);
      }, clientWidth);
      console.log('Wide elements:', JSON.stringify(wide, null, 2));
    }

    // Capture screenshot of Workspace
    await page.screenshot({ path: path.join(screenshotsDir, `workspace-${vp.name}.png`), fullPage: false });

    // Switch to Discovery
    const discoveryBtn = await page.$('.platform-mode-switcher button:nth-child(2)');
    if (discoveryBtn) {
      await discoveryBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      await page.screenshot({ path: path.join(screenshotsDir, `discovery-${vp.name}.png`), fullPage: false });
      
      // Switch back
      const wsBtn = await page.$('.platform-mode-switcher button:nth-child(1)');
      if (wsBtn) await wsBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // Inspect header background color computed style
  const headerBg = await page.evaluate(() => {
    const el = document.querySelector('.workspace-header-bar');
    return el ? window.getComputedStyle(el).backgroundColor : 'not found';
  });
  console.log('Computed workspace header background color:', headerBg);

  // Inspect onboarding card background computed style
  const onboardingBg = await page.evaluate(() => {
    const el = document.querySelector('.empty-onboarding-card');
    return el ? window.getComputedStyle(el).backgroundColor : 'not found';
  });
  console.log('Computed empty onboarding background color:', onboardingBg);

  // Inspect body background computed style
  const bodyBg = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  console.log('Computed body background color:', bodyBg);

  await browser.close();
  server.close();
  console.log('--- VISUAL AUDIT & VIEWPORT VERIFICATION COMPLETE ---');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
