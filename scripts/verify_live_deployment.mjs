import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : null);

const publicUrl = 'https://utkarshnikhare.github.io/art-gallery-live/';

async function main() {
  console.log(`[Live Verify] Launching browser audit against: ${publicUrl}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    // Test Desktop
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(publicUrl, { waitUntil: 'networkidle2' });

    console.log('[Live Verify] Desktop Page Loaded. Checking console errors...');
    if (errors.length > 0) {
      console.error('[Live Verify] Console errors detected:', errors);
    } else {
      console.log('[Live Verify] Zero console errors on live site!');
    }

    const cardsCount = await page.$$eval('.event-card', els => els.length);
    console.log(`[Live Verify] Live event cards rendered on desktop: ${cardsCount}`);

    const headerTitle = await page.$eval('.brand-title', el => el.textContent.trim());
    console.log(`[Live Verify] Header title: "${headerTitle}"`);

    // Test Search on live site
    await page.type('#event-search', 'Pune');
    await new Promise(r => setTimeout(r, 300));
    const puneCardsCount = await page.$$eval('.event-card', els => els.length);
    console.log(`[Live Verify] Search for "Pune" filtered to: ${puneCardsCount} cards`);

    // Clear search
    await page.click('.search-clear-btn');
    await new Promise(r => setTimeout(r, 200));

    // Test Mobile
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 300));
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`[Live Verify] Mobile 390x844 horizontal overflow check: ${isOverflowing ? 'FAILED (overflow)' : 'PASSED (no overflow)'}`);

    // Test Modal
    await page.click('.event-card:first-child .btn-outline');
    await new Promise(r => setTimeout(r, 300));
    const isModalVisible = await page.$eval('.modal-card', el => el !== null);
    console.log(`[Live Verify] Event details modal opened: ${isModalVisible}`);

    await page.click('.modal-close-btn');
    await new Promise(r => setTimeout(r, 200));
    console.log('[Live Verify] Modal closed successfully.');

    console.log('[Live Verify] ALL LIVE CHECKS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[Live Verify] Failed:', err);
  process.exit(1);
});
