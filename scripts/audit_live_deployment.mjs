import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const LIVE_URL = 'https://utkarshnikhare.github.io/art-gallery-live/';
const screenshotsDir = path.join(rootDir, 'screenshots', 'post-deploy-audit');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runAudit() {
  console.log('=== MORROWKIND POST-DEPLOYMENT EVIDENCE AUDIT ===\n');

  // 1. Fetch live index.html and verify asset hashes
  console.log('1. Checking Live Deployment Assets & HTTP Headers...');
  const res = await fetch(`${LIVE_URL}?nocache=${Date.now()}`);
  const html = await res.text();
  console.log(`- HTTP Status: ${res.status}`);
  console.log(`- Cache-Control: ${res.headers.get('cache-control')}`);
  console.log(`- ETag: ${res.headers.get('etag')}`);
  console.log(`- Last-Modified: ${res.headers.get('last-modified')}`);

  const cssMatch = html.match(/assets\/index-[a-zA-Z0-9_\-]+\.css/);
  const jsMatch = html.match(/assets\/index-[a-zA-Z0-9_\-]+\.js/);
  console.log(`- Live Linked CSS Asset: ${cssMatch ? cssMatch[0] : 'NOT FOUND'}`);
  console.log(`- Live Linked JS Asset: ${jsMatch ? jsMatch[0] : 'NOT FOUND'}`);

  // Fetch the live CSS file and verify it contains light theme tokens
  if (cssMatch) {
    const cssRes = await fetch(`${LIVE_URL}${cssMatch[0]}`);
    const cssText = await cssRes.text();
    console.log(`- Live CSS Size: ${cssText.length} bytes`);
    const hasWhiteHeader = cssText.includes('--bg-surface:#ffffff') || cssText.includes('workspace-header-bar{background-color:#ffffff') || cssText.includes('#ffffff') || cssText.includes('#FFFFFF');
    const hasOldDarkGradient = cssText.includes('#13171f') || cssText.includes('#0d1117');
    console.log(`- Live CSS Has White Header Token: ${hasWhiteHeader}`);
    console.log(`- Live CSS Has Residual Dark Header Gradient: ${hasOldDarkGradient}`);
  }

  // 2. Browser Visual Verification & Full-Page Screenshots
  console.log('\n2. Capturing Full-Page Visual Renderings Across 5 Viewports on Live Site...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Listen to console and page errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  const viewports = [
    { name: '1440x900-desktop', width: 1440, height: 900 },
    { name: '1366x768-laptop', width: 1366, height: 768 },
    { name: '768x1024-tablet', width: 768, height: 1024 },
    { name: '390x844-mobile', width: 390, height: 844 },
    { name: '320x640-small-mobile', width: 320, height: 640 },
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${LIVE_URL}?vp=${vp.name}&nocache=${Date.now()}`, { waitUntil: 'networkidle0' });

    // Evaluate live layout metrics
    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const hdr = document.querySelector('.workspace-header-bar') || document.querySelector('.app-header');
      const card = document.querySelector('.empty-onboarding-card');
      const bodyStyle = window.getComputedStyle(document.body);
      const hdrStyle = hdr ? window.getComputedStyle(hdr) : null;
      const cardStyle = card ? window.getComputedStyle(card) : null;

      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        headerBg: hdrStyle ? hdrStyle.backgroundColor : null,
        headerColor: hdrStyle ? hdrStyle.color : null,
        headerBorderBottom: hdrStyle ? hdrStyle.borderBottomColor : null,
        cardBg: cardStyle ? cardStyle.backgroundColor : null,
        cardBorder: cardStyle ? cardStyle.borderColor : null,
      };
    });

    console.log(`- Viewport [${vp.name}]: scroll=${metrics.scrollWidth} client=${metrics.clientWidth} overflow=${metrics.hasOverflow}`);
    console.log(`  Colors: bodyBg=${metrics.bodyBg} headerBg=${metrics.headerBg} cardBg=${metrics.cardBg}`);

    if (metrics.hasOverflow) {
      console.error(`  ⚠️ OVERFLOW DETECTED ON ${vp.name}!`);
    }

    // Capture fullpage screenshot of Workspace
    await page.screenshot({
      path: path.join(screenshotsDir, `workspace-${vp.name}.png`),
      fullPage: true,
    });

    // Navigate through modules on desktop
    if (vp.name.startsWith('1440x900')) {
      const modules = ['pricing', 'certificates', 'licensing', 'sales', 'inventory', 'backup'];
      for (const mod of modules) {
        const tabBtn = await page.$(`#ws-tab-${mod}`);
        if (tabBtn) {
          await tabBtn.click();
          await new Promise((r) => setTimeout(r, 350));
          await page.screenshot({
            path: path.join(screenshotsDir, `module-${mod}-${vp.name}.png`),
            fullPage: true,
          });
        }
      }

      // Switch to Public Discovery
      const discBtn = await page.$('.platform-mode-switcher button:nth-child(2)');
      if (discBtn) {
        await discBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        await page.screenshot({
          path: path.join(screenshotsDir, `public-discovery-${vp.name}.png`),
          fullPage: true,
        });

        // Switch to open calls tab
        const callsTab = await page.$('button[data-tab="opportunities"], .nav-tab:nth-child(2)');
        if (callsTab) {
          await callsTab.click();
          await new Promise((r) => setTimeout(r, 300));
          await page.screenshot({
            path: path.join(screenshotsDir, `public-opencalls-${vp.name}.png`),
            fullPage: true,
          });
        }

        // Switch back to workspace
        const wsBtn = await page.$('.platform-mode-switcher button:nth-child(1)');
        if (wsBtn) await wsBtn.click();
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  // 3. Functional Workflow Testing on Live Production Site
  console.log('\n3. Validating Critical Interactive Workflows on Live Production...');

  // Reset to 1440x900
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${LIVE_URL}?test=workflows&nocache=${Date.now()}`, { waitUntil: 'networkidle0' });

  // A. Pricing Calculator Functional Test
  console.log('- Testing Pricing Intelligence live interactive calculations...');
  const pricingTab = await page.$('#ws-tab-pricing');
  if (pricingTab) {
    await pricingTab.click();
    await new Promise((r) => setTimeout(r, 300));

    // Fill pricing inputs
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('.pricing-form input');
      if (inputs.length >= 4) {
        inputs[0].value = '24'; // height
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].value = '36'; // width
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 200));

    const priceValues = await page.evaluate(() => {
      const hero = document.querySelector('.hero-value');
      return hero ? hero.textContent.trim() : null;
    });
    console.log(`  Live Calculated Retail Value: ${priceValues}`);
  }

  // B. Vault Locking and Unlocking Flow
  console.log('- Testing Vault Locking & Unlocking Flow...');
  const lockBtn = await page.$('.btn-lock-vault');
  if (lockBtn) {
    await lockBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const isLocked = await page.evaluate(() => {
      return !!document.querySelector('.vault-lock-screen');
    });
    console.log(`  Vault Lock Screen Rendered: ${isLocked}`);

    // Unlock
    await page.type('.vault-lock-input', '1234');
    const unlockBtn = await page.$('.vault-lock-form button[type="submit"]');
    if (unlockBtn) await unlockBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    const isUnlocked = await page.evaluate(() => {
      return !document.querySelector('.vault-lock-screen');
    });
    console.log(`  Vault Successfully Unlocked: ${isUnlocked}`);
  }

  // C. Public Certificate of Authenticity Modal & Verification Flow
  console.log('- Testing Public COA Verification Modal...');
  const verifyHeaderBtn = await page.$('.workspace-top-actions button');
  if (verifyHeaderBtn) {
    await verifyHeaderBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const modalVisible = await page.evaluate(() => {
      return !!document.querySelector('.verification-modal');
    });
    console.log(`  COA Modal Rendered: ${modalVisible}`);

    // Close modal
    const closeBtn = await page.$('.modal-close-btn');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 200));
  }

  // Check console errors
  console.log(`- Total Live Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('  Errors:', consoleErrors);
  }

  await browser.close();
  console.log('\n=== POST-DEPLOYMENT EVIDENCE AUDIT FINISHED ===');
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
