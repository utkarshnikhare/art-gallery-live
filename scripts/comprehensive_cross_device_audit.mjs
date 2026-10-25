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

const screenshotsDir = path.join(rootDir, 'screenshots', 'cross-device-audit');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function startServer(port = 4175) {
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

const VIEWPORTS = [
  { category: 'Small Phone', name: 'small-phone-320x640', width: 320, height: 640, isMobile: true },
  { category: 'Common Phone', name: 'common-phone-360x800', width: 360, height: 800, isMobile: true },
  { category: 'Modern Phone', name: 'modern-phone-390x844', width: 390, height: 844, isMobile: true },
  { category: 'Large Phone', name: 'large-phone-430x932', width: 430, height: 932, isMobile: true },
  { category: 'Small Tablet', name: 'small-tablet-600x960', width: 600, height: 960, isTablet: true },
  { category: 'Tablet Portrait', name: 'tablet-portrait-768x1024', width: 768, height: 1024, isTablet: true },
  { category: 'Tablet Landscape', name: 'tablet-landscape-1024x768', width: 1024, height: 768, isTablet: true },
  { category: 'Small Laptop', name: 'small-laptop-1280x720', width: 1280, height: 720 },
  { category: 'Standard Laptop', name: 'standard-laptop-1366x768', width: 1366, height: 768 },
  { category: 'Desktop', name: 'desktop-1440x900', width: 1440, height: 900 },
  { category: 'Large Display', name: 'large-display-1920x1080', width: 1920, height: 1080 },
];

async function runAudit() {
  console.log('=== UNIVERSAL CROSS-DEVICE RESPONSIVE AUDIT ===\n');
  const server = await startServer(4175);
  const appUrl = 'http://localhost:4175/art-gallery-live/';

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const results = [];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(appUrl, { waitUntil: 'networkidle0' });

    // Inspect layout and overflow
    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
      const clientW = doc.clientWidth;
      const overflow = scrollW > clientW;

      // Find any elements wider than viewport
      const overflowingElements = [];
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const rect = el.getBoundingClientRect();
        if (rect.right > clientW + 1) {
          overflowingElements.push({
            tag: el.tagName,
            cls: el.className,
            id: el.id,
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
          if (overflowingElements.length >= 5) break;
        }
      }

      // Check header visibility and wrap
      const hdr = document.querySelector('.workspace-header-bar');
      const hdrRect = hdr ? hdr.getBoundingClientRect() : null;

      // Check small touch targets (<40px)
      const touchTargets = Array.from(document.querySelectorAll('button, a, input, select'));
      const smallTargets = touchTargets
        .filter((t) => {
          const r = t.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32);
        })
        .map((t) => ({ tag: t.tagName, cls: t.className, w: Math.round(t.getBoundingClientRect().width), h: Math.round(t.getBoundingClientRect().height) }))
        .slice(0, 5);

      return {
        scrollW,
        clientW,
        overflow,
        overflowingElements,
        headerHeight: hdrRect ? Math.round(hdrRect.height) : 0,
        smallTargetsCount: smallTargets.length,
        smallTargetsSample: smallTargets,
      };
    });

    results.push({
      category: vp.category,
      viewport: `${vp.width}x${vp.height}`,
      overflow: layout.overflow ? `FAIL (${layout.scrollW}px > ${layout.clientW}px)` : 'PASS (0px overflow)',
      headerHeight: `${layout.headerHeight}px`,
      overflowElements: layout.overflowingElements,
      smallTargets: layout.smallTargetsSample,
    });

    // Capture screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, `workspace-${vp.name}.png`),
      fullPage: false,
    });

    // Switch to discovery
    const discBtn = await page.$('.platform-mode-switcher .mode-btn:nth-child(2)');
    if (discBtn) {
      await discBtn.click();
      await new Promise((r) => setTimeout(r, 200));
      await page.screenshot({
        path: path.join(screenshotsDir, `discovery-${vp.name}.png`),
        fullPage: false,
      });
      // Switch back
      const wsBtn = await page.$('.platform-mode-switcher .mode-btn:nth-child(1)');
      if (wsBtn) await wsBtn.click();
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // 12. Zoom Level Testing (125%, 150%, 200%) on Standard Laptop 1366x768
  console.log('\nTesting Browser Zoom Levels (125%, 150%, 200%)...');
  const zoomLevels = [1.25, 1.5, 2.0];
  const zoomResults = [];
  for (const zoom of zoomLevels) {
    await page.setViewport({ width: Math.round(1366 / zoom), height: Math.round(768 / zoom), deviceScaleFactor: zoom });
    await page.goto(appUrl, { waitUntil: 'networkidle0' });

    const zoomLayout = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollW: doc.scrollWidth,
        clientW: doc.clientWidth,
        overflow: doc.scrollWidth > doc.clientWidth,
      };
    });

    zoomResults.push({
      zoom: `${zoom * 100}%`,
      dimensions: `${Math.round(1366 / zoom)}x${Math.round(768 / zoom)}`,
      overflow: zoomLayout.overflow ? `FAIL (${zoomLayout.scrollW} > ${zoomLayout.clientW})` : 'PASS',
    });

    await page.screenshot({
      path: path.join(screenshotsDir, `zoom-${zoom * 100}pct.png`),
      fullPage: false,
    });
  }

  console.table(results.map(r => ({ Category: r.category, Viewport: r.viewport, Overflow: r.overflow, HeaderHeight: r.headerHeight })));
  console.log('\nZoom Test Results:');
  console.table(zoomResults);

  // Check if any overflow was found
  const anyOverflow = results.some((r) => r.overflow.startsWith('FAIL')) || zoomResults.some((z) => z.overflow.startsWith('FAIL'));
  console.log(`\nAny Overflow Found Across 11 Viewports & 3 Zoom Levels: ${anyOverflow}`);

  await browser.close();
  server.close();
  process.exit(anyOverflow ? 1 : 0);
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
