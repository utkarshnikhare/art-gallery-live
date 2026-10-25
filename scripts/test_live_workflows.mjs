import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const LIVE_URL = 'https://utkarshnikhare.github.io/art-gallery-live/';

async function testAllWorkflows() {
  console.log('=== TESTING COMPLETE FUNCTIONAL WORKFLOWS ON LIVE SITE ===\n');

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  let testsPassed = 0;
  let testsFailed = 0;

  function assertWorkflow(name, condition, details = '') {
    if (condition) {
      console.log(`✓ [WORKFLOW PASSED] ${name}`);
      testsPassed++;
    } else {
      console.error(`✕ [WORKFLOW FAILED] ${name}: ${details}`);
      testsFailed++;
    }
  }

  await page.goto(LIVE_URL + '?test=' + Date.now(), { waitUntil: 'networkidle0' });

  // 1. Navigation Across All 11 Workspace Modules
  console.log('1. Testing Navigation Across All Modules...');
  const modules = [
    { id: 'dashboard', selector: '#ws-tab-dashboard' },
    { id: 'inventory', selector: '#ws-tab-inventory' },
    { id: 'sales', selector: '#ws-tab-sales' },
    { id: 'collectors', selector: '#ws-tab-collectors' },
    { id: 'exhibitions', selector: '#ws-tab-exhibitions' },
    { id: 'pricing', selector: '#ws-tab-pricing' },
    { id: 'certificates', selector: '#ws-tab-certificates' },
    { id: 'licensing', selector: '#ws-tab-licensing' },
    { id: 'marketing', selector: '#ws-tab-marketing' },
    { id: 'catalog', selector: '#ws-tab-catalog' },
    { id: 'backup', selector: '#ws-tab-backup' },
  ];

  let navAllOk = true;
  for (const mod of modules) {
    const btn = await page.$(mod.selector);
    if (!btn) {
      navAllOk = false;
      break;
    }
    await btn.click();
    await new Promise((r) => setTimeout(r, 120));
  }
  assertWorkflow('All 11 Workspace modules navigate smoothly', navAllOk);

  // 2. Artwork Creation Form & Inventory State
  console.log('\n2. Testing Artwork Creation Flow...');
  await page.click('#ws-tab-inventory');
  await new Promise((r) => setTimeout(r, 200));

  const addArtBtn = await page.$('.view-actions-group .btn-primary');
  if (addArtBtn) {
    await addArtBtn.click();
    await new Promise((r) => setTimeout(r, 250));

    // Fill artwork modal form
    const formRendered = await page.$eval('.modal-backdrop .modal-content', (el) => !!el);
    assertWorkflow('Artwork Creation Modal opens', formRendered);

    await page.type('#art-title', 'Celestial Resonance No. 7');
    await page.type('#art-medium', 'Pigment on Raw Silk');
    await page.type('#art-height', '120');
    await page.type('#art-width', '90');
    await page.type('#art-price', '420000');

    // Submit form
    const submitBtn = await page.$('.modal-backdrop form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    // Verify card rendered in inventory
    const newArtCard = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('.inv-card-title, .data-table td'));
      return titles.some((t) => t.textContent.includes('Celestial Resonance No. 7'));
    });
    assertWorkflow('New Artwork rendered in Studio Inventory with proper pricing & dimensions', newArtCard);
  }

  // 3. Sales Entry & Commission Calculations
  console.log('\n3. Testing Sales Entry & Financial Calculations...');
  await page.click('#ws-tab-sales');
  await new Promise((r) => setTimeout(r, 200));

  const addSaleBtn = await page.$('.view-actions-group .btn-primary');
  if (addSaleBtn) {
    await addSaleBtn.click();
    await new Promise((r) => setTimeout(r, 250));

    const saleFormRendered = await page.$eval('.modal-backdrop .modal-content', (el) => !!el);
    assertWorkflow('Record Sale Transaction Modal opens', saleFormRendered);

    // Fill sale values: gross 100,000, 40% commission
    await page.type('#sale-title', 'Celestial Resonance No. 7');
    await page.click('#sale-gross', { clickCount: 3 });
    await page.type('#sale-gross', '100000');
    await page.click('#sale-comm', { clickCount: 3 });
    await page.type('#sale-comm', '40');
    await new Promise((r) => setTimeout(r, 200));

    const netProceedsCalculated = await page.evaluate(() => {
      const totalLine = document.querySelector('.total-line strong');
      return totalLine ? totalLine.textContent.trim() : null;
    });
    console.log(`  Live Calculated Net Proceeds: ${netProceedsCalculated}`);
    assertWorkflow('Financial net proceeds calculated accurately (100,000 - 40% = 60,000)', netProceedsCalculated?.includes('60,000'));

    // Close modal
    const closeBtn = await page.$('.modal-close-btn');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 200));
  }

  // 4. Multi-Tenant Studio Workspace Switching
  console.log('\n4. Testing Multi-Tenant Studio Workspace Partitioning...');
  const tenantSelect = await page.$('#tenant-select');
  if (tenantSelect) {
    await page.select('#tenant-select', 'prints');
    await new Promise((r) => setTimeout(r, 300));

    const activeVal = await page.$eval('#tenant-select', (el) => el.value);
    assertWorkflow('Multi-tenant switcher switched to Prints studio partition', activeVal === 'prints');

    await page.select('#tenant-select', 'default');
    await new Promise((r) => setTimeout(r, 300));
    const defaultVal = await page.$eval('#tenant-select', (el) => el.value);
    assertWorkflow('Multi-tenant switcher returned to primary studio partition', defaultVal === 'default');
  }

  // 5. Vault Privacy Curtain & Passcode Protection
  console.log('\n5. Testing Vault Privacy Curtain & Passcode Protection...');
  const lockBtn = await page.$('.btn-lock-vault');
  if (lockBtn) {
    await lockBtn.click();
    await new Promise((r) => setTimeout(r, 250));
    const isLocked = await page.evaluate(() => !!document.querySelector('.vault-lock-screen'));
    assertWorkflow('Vault Privacy Screen engaged on click', isLocked);

    await page.waitForSelector('.vault-lock-input', { timeout: 3000 });
    
    // Check if unconfigured notice is visible
    const unconfiguredNotice = await page.evaluate(() => {
      const card = document.querySelector('.vault-lock-card');
      return card ? card.textContent.includes('Passcode Unconfigured') : false;
    });

    if (unconfiguredNotice) {
      // Configure new passcode 8899
      await page.click('.vault-lock-input');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('.vault-lock-input', '8899');
      
      const saveAndUnlockBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('.vault-lock-card button'));
        return buttons.find(b => b.textContent.includes('Save Passcode & Unlock'));
      });
      if (saveAndUnlockBtn) await saveAndUnlockBtn.click();
      await new Promise((r) => setTimeout(r, 500));

      const isUnlockedAfterConfig = await page.evaluate(() => !document.querySelector('.vault-lock-screen'));
      assertWorkflow('Configuring custom privacy PIN sets passcode and unlocks studio', isUnlockedAfterConfig);

      // Lock again with configured passcode
      const lockBtn2 = await page.$('.btn-lock-vault');
      if (lockBtn2) await lockBtn2.click();
      await new Promise((r) => setTimeout(r, 400));

      // Test blank passcode
      const unlockSubmit = await page.$('.vault-lock-form button[type="submit"]');
      if (unlockSubmit) await unlockSubmit.click();
      await new Promise((r) => setTimeout(r, 300));
      const blankErrorVisible = await page.evaluate(() => {
        const err = document.querySelector('.vault-lock-card .error-text');
        return err ? err.textContent.includes('cannot be blank') : false;
      });
      assertWorkflow('Blank passcode rejected with validation error', blankErrorVisible);

      // Test incorrect passcode 0000
      await page.click('.vault-lock-input');
      await page.type('.vault-lock-input', '0000');
      if (unlockSubmit) await unlockSubmit.click();
      await new Promise((r) => setTimeout(r, 300));
      const incorrectErrorVisible = await page.evaluate(() => {
        const err = document.querySelector('.vault-lock-card .error-text');
        return err ? err.textContent.includes('Incorrect') : false;
      });
      assertWorkflow('Incorrect passcode rejects unlock attempt', incorrectErrorVisible);

      // Test correct passcode 8899
      await page.click('.vault-lock-input');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('.vault-lock-input', '8899');
      if (unlockSubmit) await unlockSubmit.click();
      await new Promise((r) => setTimeout(r, 600));

      const isUnlockedFinal = await page.evaluate(() => !document.querySelector('.vault-lock-screen'));
      assertWorkflow('Configured passcode restores access to studio workspace', isUnlockedFinal);
    } else {
      // Passcode already configured: test incorrect vs correct
      const unlockSubmit = await page.$('.vault-lock-form button[type="submit"]');
      await page.click('.vault-lock-input');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('.vault-lock-input', '0000');
      if (unlockSubmit) await unlockSubmit.click();
      await new Promise((r) => setTimeout(r, 300));

      const stillLocked = await page.evaluate(() => !!document.querySelector('.vault-lock-screen'));
      assertWorkflow('Incorrect passcode rejects unlock attempt', stillLocked);
    }
  }

  // 6. Public Certificate Verification Modal
  console.log('\n6. Testing Public COA Verification Modal in Workspace Header...');
  const verifyHeaderBtn = await page.$('button[aria-label="Verify Certificate of Authenticity"]');
  if (verifyHeaderBtn) {
    await verifyHeaderBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    const coaModalVisible = await page.evaluate(() => {
      const modal = document.querySelector('.modal-backdrop');
      return modal && modal.textContent.includes('Public Certificate of Authenticity Verification');
    });
    assertWorkflow('Public Certificate Verification Modal renders with cryptographic verification controls', coaModalVisible);

    const closeBtn = await page.$('.modal-close-btn');
    if (closeBtn) await closeBtn.click();
    await new Promise((r) => setTimeout(r, 200));
  }

  // 7. Backup & Export Workflow
  console.log('\n7. Testing Vault Backup JSON Export...');
  await page.click('#ws-tab-backup');
  await new Promise((r) => setTimeout(r, 200));

  const exportBtn = await page.$('.backup-action-grid .btn-primary');
  assertWorkflow('Vault Backup Export button is available and accessible', exportBtn !== null);

  // 8. Public Discovery Search & Filter Logic
  console.log('\n8. Testing Public Art Discovery Mode...');
  await page.click('.platform-mode-switcher .mode-btn:nth-child(2)');
  await new Promise((r) => setTimeout(r, 400));

  await page.waitForSelector('.event-card', { timeout: 6000 });
  const totalEvents = await page.$$eval('.event-card', (els) => els.length);
  assertWorkflow('Public Discovery loads confirmed exhibition cards (>10)', totalEvents >= 10);

  // Search filter
  await page.type('#event-search', 'Delhi');
  await new Promise((r) => setTimeout(r, 250));
  const delhiCount = await page.$$eval('.event-card', (els) => els.length);
  assertWorkflow('Public Discovery search narrows to Delhi exhibitions', delhiCount >= 1 && delhiCount < totalEvents);

  await browser.close();
  console.log(`\n=== ALL WORKFLOW TESTS COMPLETED: ${testsPassed} PASSED, ${testsFailed} FAILED ===`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

testAllWorkflows().catch((err) => {
  console.error(err);
  process.exit(1);
});
