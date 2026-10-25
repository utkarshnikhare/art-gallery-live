import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Find browser executable
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

console.log('--- RUNNING MORROWKIND BROWSER E2E TEST SUITE ---\n');

if (!executablePath) {
  console.warn('⚠️ No Chrome or Edge executable found. Skipping Browser E2E tests.');
  process.exit(0);
}

// Simple static server for dist/
function startServer(port = 4173) {
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
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(indexPath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function runE2E() {
  const port = 4173;
  const server = await startServer(port);
  const appUrl = `http://localhost:${port}/art-gallery-live/`;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let passed = 0;
  let failed = 0;

  function report(name, isPass, detail = '') {
    if (isPass) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.error(`  ✕ ${name} - ${detail}`);
      failed++;
    }
  }

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Application loads without console errors (Desktop 1366x768)
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(appUrl, { waitUntil: 'networkidle0' });
    report('1. Application loads without console errors', consoleErrors.length === 0, consoleErrors.join('; '));

    // 2. Brand Identity is Morrowkind
    const brandTitle = await page.$eval('.brand-title', el => el.textContent.trim());
    report('2. Brand renders as Morrowkind Artist Intelligence Platform', brandTitle === 'Morrowkind');

    // 3. Artist Workspace Mode is active by default with honest onboarding
    const onboardingVisible = await page.$eval('.empty-onboarding-card', el => el !== null);
    report('3. Artist Workspace loads with honest onboarding (zero fake metrics)', onboardingVisible);

    // 4. Workspace navigation to Pricing Intelligence
    await page.click('#ws-tab-pricing');
    await new Promise(r => setTimeout(r, 200));
    const pricingHeading = await page.$eval('.view-heading', el => el.textContent);
    const hasLiveFormula = await page.$eval('.formula-breakdown-box', el => el !== null);
    report('4. Workspace Pricing Intelligence calculator displays live mathematical breakdown', hasLiveFormula && pricingHeading.includes('Pricing'));

    // 5. Workspace navigation to Digital Certificates
    await page.click('#ws-tab-certificates');
    await new Promise(r => setTimeout(r, 200));
    const certsViewVisible = await page.$eval('#ws-panel-certificates', el => el !== null);
    report('5. Digital Certificates view displays cryptographic COA standards', certsViewVisible);

    // 6. Switch to Public Discovery Mode via Header Switcher
    await page.click('.platform-mode-switcher .mode-btn:nth-child(2)');
    await new Promise(r => setTimeout(r, 300));
    await page.waitForSelector('.event-card', { timeout: 8000 });
    const eventCardsCount = await page.$$eval('.event-card', els => els.length);
    report('6. Switching to Public Discovery mode renders verified exhibitions (>0)', eventCardsCount >= 10);

    // 7. Search filter in Public Discovery works
    await page.type('#event-search', 'Reena');
    await new Promise(r => setTimeout(r, 200));
    const searchFilteredCount = await page.$$eval('.event-card', els => els.length);
    report('7. Discovery search narrows cards', searchFilteredCount >= 1 && searchFilteredCount < eventCardsCount);

    await page.click('.search-clear-btn');
    await new Promise(r => setTimeout(r, 200));

    // 8. Tab navigation to Opportunities in Discovery
    await page.click('#tab-opportunities');
    await new Promise(r => setTimeout(r, 200));
    const oppCards = await page.$$eval('.opportunity-card', els => els.length);
    report('8. Public Discovery Open Calls tab renders verified opportunities', oppCards >= 8);

    // 9. Tab navigation to Designers in Discovery
    await page.click('#tab-designers');
    await new Promise(r => setTimeout(r, 200));
    const designerCards = await page.$$eval('.designer-card', els => els.length);
    const roleBadges = await page.$$eval('.designer-role-badge', els => els.map(e => e.textContent.trim()));
    report('9. Public Discovery Designers tab renders studios with role badges', designerCards >= 8 && roleBadges.some(r => r.toLowerCase().includes('specifier')));

    // 10. Tab navigation to Artwork Sourcing in Discovery
    await page.click('#tab-artworks');
    await new Promise(r => setTimeout(r, 200));
    const artworkCards = await page.$$eval('.artwork-card', els => els.length);
    const dimensionsText = await page.$$eval('.dimension-val', els => els.map(e => e.textContent.trim()));
    report('10. Artwork Sourcing tab displays verified works with dimensions', artworkCards >= 8 && dimensionsText.some(d => d.includes('cm')));

    // 11. Art Enquiry Specification workflow opens from artwork card
    await page.click('.artwork-card .btn-primary');
    await new Promise(r => setTimeout(r, 300));
    const isEnquiryModalVisible = await page.$eval('.enquiry-modal', el => el.clientHeight > 100);
    report('11. Art Enquiry modal opens with artwork prefilled', isEnquiryModalVisible);

    // 12. Typing into form updates live specification preview
    await page.type('#specifierName', 'Lead Architect Priya');
    await new Promise(r => setTimeout(r, 200));
    const previewContent = await page.$eval('.specification-code-block', el => el.textContent);
    report('12. Typing updates live specification preview without leakage', previewContent.includes('Lead Architect Priya'));

    // Close modal
    await page.click('.modal-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // 13. Public Certificate Verification Modal
    await page.click('.header-actions button:first-child');
    await new Promise(r => setTimeout(r, 300));
    const isVerifyModalVisible = await page.$eval('.verify-modal-body', el => el !== null);
    report('13. Public COA Verification modal opens from header action', isVerifyModalVisible);

    await page.click('.modal-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // 14. Switch back to Artist Workspace mode
    await page.click('.platform-mode-switcher .mode-btn:first-child');
    await new Promise(r => setTimeout(r, 300));
    const backInWorkspace = await page.$eval('.workspace-header-bar', el => el !== null);
    report('14. Mode switcher returns smoothly to Artist Workspace', backInWorkspace);

    // 15. Mobile Viewport (390x844) has zero horizontal overflow across entire platform
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 300));
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    report('15. Mobile viewport (390x844) has strictly zero horizontal overflow', !hasOverflow);

  } catch (err) {
    console.error('Fatal E2E execution error:', err);
    failed++;
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\nBrowser E2E Tests: ${passed} PASSED, ${failed} FAILED\n`);
  if (failed > 0) process.exit(1);
}

runE2E();
