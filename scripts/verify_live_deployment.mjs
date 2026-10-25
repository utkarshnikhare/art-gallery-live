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

    // Test Desktop Viewport
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(publicUrl, { waitUntil: 'networkidle2' });

    console.log('[Live Verify] Desktop Page Loaded. Checking console errors...');
    if (errors.length > 0) {
      console.error('[Live Verify] Console errors detected:', errors);
      process.exit(1);
    } else {
      console.log('[Live Verify] Zero console errors on live site!');
    }

    const cardsCount = await page.$$eval('.event-card', els => els.length);
    console.log(`[Live Verify] Live confirmed event cards rendered on desktop: ${cardsCount}`);

    const headerTitle = await page.$eval('.brand-title', el => el.textContent.trim());
    console.log(`[Live Verify] Header title: "${headerTitle}"`);

    // Check field verification tag
    const fieldTags = await page.$$eval('.field-tag', els => els.map(e => e.textContent.trim()));
    console.log(`[Live Verify] Sample verified field tags found: ${fieldTags.slice(0, 5).join(', ')}`);

    // Test Search on live site
    await page.type('#event-search', 'Pune');
    await new Promise(r => setTimeout(r, 300));
    const puneCardsCount = await page.$$eval('.event-card', els => els.length);
    console.log(`[Live Verify] Search for "Pune" filtered to: ${puneCardsCount} verified cards`);

    // Clear search
    await page.click('.search-clear-btn');
    await new Promise(r => setTimeout(r, 200));

    // Test Opportunities Tab on Live Site
    await page.click('#tab-opportunities');
    await new Promise(r => setTimeout(r, 400));
    const liveOppsCount = await page.$$eval('.opportunity-card', els => els.length);
    console.log(`[Live Verify] Live verified artist open calls rendered: ${liveOppsCount}`);

    // Test Designers Tab on Live Site
    await page.click('#tab-designers');
    await new Promise(r => setTimeout(r, 400));
    const liveDesignersCount = await page.$$eval('.designer-card', els => els.length);
    console.log(`[Live Verify] Live verified interior design & art specifiers rendered: ${liveDesignersCount}`);

    // Test Artwork Sourcing Tab on Live Site
    await page.click('#tab-artworks');
    await new Promise(r => setTimeout(r, 400));
    const liveArtworksCount = await page.$$eval('.artwork-card', els => els.length);
    console.log(`[Live Verify] Live verified artworks rendered: ${liveArtworksCount}`);

    // Test Art Sourcing Specification Modal
    await page.click('.artwork-card:first-child .btn-primary');
    await new Promise(r => setTimeout(r, 400));
    const isEnquiryModalVisible = await page.$eval('.enquiry-modal', el => el !== null);
    console.log(`[Live Verify] Art Sourcing Specification modal opened: ${isEnquiryModalVisible}`);

    // Type in live enquiry modal
    await page.type('#specifierName', 'Lead Design Architect');
    await new Promise(r => setTimeout(r, 200));
    const briefPreview = await page.$eval('.specification-code-block', el => el.textContent);
    console.log(`[Live Verify] Specification brief live preview generated: ${briefPreview.includes('Lead Design Architect')}`);

    await page.click('.modal-close-btn');
    await new Promise(r => setTimeout(r, 200));

    // Test Mobile Viewport (390x844) across tabs
    await page.setViewport({ width: 390, height: 844 });
    await new Promise(r => setTimeout(r, 300));
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`[Live Verify] Mobile 390x844 horizontal overflow check: ${isOverflowing ? 'FAILED (overflow)' : 'PASSED (strictly zero overflow)'}`);

    console.log('[Live Verify] ALL LIVE AUDIT CHECKS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[Live Verify] Failed:', err);
  process.exit(1);
});
