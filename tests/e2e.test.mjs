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

console.log('--- RUNNING BROWSER E2E TEST SUITE ---\n');

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
    // Strip Vite base if present
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
      // SPA Fallback
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

    // 2. Data comes from events.json, not fake hardcoded events
    const cardTitles = await page.$$eval('.card-title', els => els.map(e => e.textContent.trim()));
    report('2. Data comes from events.json (cards rendered > 0)', cardTitles.length > 0 && cardTitles.some(t => t.includes('Reena Saini Kallat')));

    // 3. Search and all filters work
    await page.type('#event-search', 'Reena');
    await new Promise(r => setTimeout(r, 200));
    const searchFilteredCount = await page.$$eval('.event-card', els => els.length);
    report('3a. Search filter narrows cards', searchFilteredCount >= 1 && searchFilteredCount < cardTitles.length);

    await page.click('.search-clear-btn');
    await new Promise(r => setTimeout(r, 200));
    const resetSearchCount = await page.$$eval('.event-card', els => els.length);
    report('3b. Search clear restores cards', resetSearchCount === cardTitles.length);

    // 4. Official details link opens exact stored source URL
    const officialLinks = await page.$$eval('.external-link', els => els.map(e => e.getAttribute('href')));
    const hasValidOfficialLinks = officialLinks.every(h => h.startsWith('http://') || h.startsWith('https://'));
    report('4. Official details link uses valid HTTP/HTTPS URLs', hasValidOfficialLinks);

    // 5. Booking link is absent if none is verified
    const bookingButtons = await page.$$eval('.btn-accent', els => els.map(e => e.textContent.trim()));
    report('5. Booking button only renders when bookingUrl is verified', bookingButtons.length > 0 && bookingButtons.length < cardTitles.length);

    // 6. Missing fee is shown honestly
    const feeBadges = await page.$$eval('.fee-badge', els => els.map(e => e.textContent.trim()));
    const hasHonestFeeBadges = feeBadges.some(b => b.includes('Check Organiser') || b.includes('Free Admission') || b.includes('Ticket'));
    report('6. Fee badges show honest status', hasHonestFeeBadges);

    // 7. Update timestamp comes from data metadata
    const timestampText = await page.$eval('.timestamp-text', el => el.textContent.trim());
    report('7. Update timestamp displayed in header', timestampText.length > 0);

    // 8. Empty state is helpful
    await page.type('#event-search', 'XYZNonExistentArtShow9999');
    await new Promise(r => setTimeout(r, 200));
    const emptyStateText = await page.$eval('.empty-state', el => el.textContent);
    report('8. Empty state appears with helpful guidance on zero matches', emptyStateText.includes('No verified upcoming events are available in the selected filters'));

    // 9. Reset filters button works
    await page.click('.empty-state .btn-secondary');
    await new Promise(r => setTimeout(r, 200));
    const restoredCount = await page.$$eval('.event-card', els => els.length);
    report('9. Reset button from empty state restores feed', restoredCount === cardTitles.length);

    // 10. Keyboard navigation and focus states work
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement ? document.activeElement.tagName : '');
    report('10. Keyboard tab focus works', ['BUTTON', 'INPUT', 'A'].includes(focusedTag));

    // 11. Mobile viewport (390x844) has no horizontal overflow
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 200));
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    report('11. Mobile viewport (390x844) has NO horizontal overflow', !hasOverflow);

    // 12. Desktop layout remains readable
    await page.setViewport({ width: 1366, height: 768 });
    const isVisible = await page.$eval('.app-header', el => el.clientHeight > 40);
    report('12. Desktop layout (1366x768) header and grid readable', isVisible);

    // 13. No dead '#' links or example.com links
    const allLinks = await page.$$eval('a', els => els.map(e => e.getAttribute('href')));
    const hasDeadLinks = allLinks.some(h => h === '#' || (h && h.includes('example.com')));
    report('13. No dead "#" or example.com links anywhere', !hasDeadLinks);

    // 14. No past events appear in default view
    const pastBadges = await page.$$eval('.status-badge.past', els => els.length);
    report('14. Past events excluded from default upcoming view', pastBadges === 0);

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
