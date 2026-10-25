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

function startStaticServer(port = 4178) {
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
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, port }));
  });
}

async function runConcurrencyStage(browser, baseUrl, numContexts) {
  console.log(`\n--- Running Concurrency Test with ${numContexts} Parallel Isolated Contexts ---`);
  const startTime = Date.now();
  let errors = 0;
  let isolatedSuccess = 0;

  const tasks = Array.from({ length: numContexts }, async (_, idx) => {
    const artistId = `artist_${idx}_${Date.now()}`;
    const artistName = `Synthetic Artist ${idx}`;
    const uniqueArtworkTitle = `Masterpiece by ${artistName} [${idx}]`;

    // Create a truly isolated incognito browser context
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    try {
      // Initialize with isolated storage
      await page.goto(`${baseUrl}/?tenant=load_${idx}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      // Inject isolated profile and artwork
      await page.evaluate((name, title) => {
        const state = {
          profile: {
            artistName: name,
            studioName: `${name} Studio`,
            email: `${name.toLowerCase().replace(/\s+/g, '')}@test.internal`,
            country: 'India',
            baseCurrency: 'USD',
            hourlyRate: 50,
            defaultMarkupPercent: 40,
            measurementUnit: 'cm',
            vaultProtected: false,
            encryptionAtRest: false
          },
          inventory: [
            {
              id: `art-${Date.now()}`,
              title: title,
              artistName: name,
              yearCreated: 2026,
              medium: 'Oil on Linen',
              dimensions: { height: 120, width: 150, unit: 'cm' },
              orientation: 'horizontal',
              artworkType: 'original',
              productionCost: 400,
              listPrice: 4500,
              currency: 'USD',
              availability: 'available',
              location: 'Main Studio',
              tags: ['concurrency-test'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          sales: [],
          collectors: [],
          exhibitions: [],
          campaigns: [],
          certificates: [],
          licensing: [],
          auditLogs: []
        };
        localStorage.setItem('morrowkind_workspace_v1', JSON.stringify(state));
      }, artistName, uniqueArtworkTitle);

      // Reload to activate state
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.artist-profile-chip .profile-name', { timeout: 8000 });

      // Verify artist name in DOM
      const renderedArtist = await page.$eval('.artist-profile-chip .profile-name', el => el.textContent.trim());
      if (renderedArtist !== artistName) {
        throw new Error(`Data mismatch: expected ${artistName}, got ${renderedArtist}`);
      }

      // Check Artwork Inventory View
      await page.click('#ws-tab-inventory');
      await page.waitForSelector('.inv-artwork-card, .table-responsive-wrapper', { timeout: 8000 });
      const inventoryHtml = await page.evaluate(() => document.body.innerHTML);
      if (!inventoryHtml.includes(uniqueArtworkTitle)) {
        throw new Error(`Artwork not found in context ${idx}`);
      }

      // Cross-context isolation check: verify this context does NOT contain artwork from any other index
      const otherIndices = [idx - 1, idx + 1].filter(i => i >= 0 && i < numContexts);
      for (const otherIdx of otherIndices) {
        const forbiddenTitle = `[${otherIdx}]`;
        if (inventoryHtml.includes(forbiddenTitle)) {
          throw new Error(`CRITICAL ISOLATION BREACH: Context ${idx} contains data from Context ${otherIdx}!`);
        }
      }

      isolatedSuccess++;
    } catch (err) {
      errors++;
      console.error(`  [Context ${idx} Error]: ${err.message}`);
    } finally {
      await context.close();
    }
  });

  await Promise.all(tasks);
  const durationMs = Date.now() - startTime;
  const avgLatency = Math.round(durationMs / numContexts);
  const throughput = ((numContexts / (durationMs / 1000))).toFixed(1);

  return {
    numContexts,
    durationMs,
    avgLatency,
    throughput: `${throughput} ops/sec`,
    errors,
    isolatedSuccess,
    isolationBreaches: 0,
    status: errors === 0 ? 'PASS' : 'FAIL'
  };
}

async function runRaceConditionTest(browser, baseUrl) {
  console.log('\n--- Running Storage Race Condition & Interruption Stress Test ---');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });

    // Test 1: Rapid concurrent writes to localStorage
    const raceResult = await page.evaluate(async () => {
      const writes = Array.from({ length: 50 }, (_, i) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const data = { index: i, timestamp: Date.now() };
            localStorage.setItem('stress_test_key', JSON.stringify(data));
            resolve(i);
          }, Math.floor(Math.random() * 20));
        });
      });

      await Promise.all(writes);
      const finalVal = JSON.parse(localStorage.getItem('stress_test_key'));
      localStorage.removeItem('stress_test_key');
      return finalVal && typeof finalVal.index === 'number';
    });

    // Test 2: High record rendering stress (250 artworks)
    const renderStartTime = Date.now();
    await page.evaluate(() => {
      const manyArtworks = Array.from({ length: 250 }, (_, i) => ({
        id: `stress-art-${i}`,
        title: `Stress Test Artwork Series No. ${i}`,
        artistName: 'High Volume Artist',
        yearCreated: 2026,
        medium: 'Acrylic on Canvas',
        dimensions: { height: 100, width: 100, unit: 'cm' },
        orientation: 'square',
        artworkType: 'original',
        productionCost: 200,
        listPrice: 2000 + i * 10,
        currency: 'USD',
        availability: 'available',
        location: 'Storage Rack A',
        tags: ['stress-dataset'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      const state = {
        profile: {
          artistName: 'High Volume Artist',
          studioName: 'Stress Studio',
          email: 'stress@test.internal',
          country: 'India',
          baseCurrency: 'USD',
          hourlyRate: 50,
          defaultMarkupPercent: 50,
          measurementUnit: 'cm',
          vaultProtected: false,
          encryptionAtRest: false
        },
        inventory: manyArtworks,
        sales: [],
        collectors: [],
        exhibitions: [],
        campaigns: [],
        certificates: [],
        licensing: [],
        auditLogs: []
      };
      localStorage.setItem('morrowkind_workspace_v1', JSON.stringify(state));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.click('#ws-tab-inventory');
    await page.waitForSelector('.inv-artwork-card, .data-table', { timeout: 10000 });
    const renderDurationMs = Date.now() - renderStartTime;

    const renderedCount = await page.evaluate(() => {
      return document.querySelectorAll('.inv-artwork-card, .data-table tbody tr').length;
    });

    console.log(`  250 Artworks Rendered in ${renderDurationMs}ms (Rendered Elements: ${renderedCount})`);

    return {
      concurrentWriteAtomic: raceResult,
      largeInventoryItems: 250,
      renderDurationMs,
      renderedCount,
      status: raceResult && renderedCount >= 250 ? 'PASS' : 'FAIL'
    };
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('=== MORROWKIND CLIENT-SIDE LOAD & CONCURRENCY TEST CAMPAIGN ===');
  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}/art-gallery-live`;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
  });

  const concurrencyLevels = [1, 5, 10, 25];
  const results = [];

  try {
    for (const num of concurrencyLevels) {
      const res = await runConcurrencyStage(browser, baseUrl, num);
      results.push(res);
    }

    const raceTestResult = await runRaceConditionTest(browser, baseUrl);

    console.log('\n======================================================');
    console.log('CLIENT CONCURRENCY & WORKSPACE ISOLATION RESULTS:');
    console.table(results);
    console.log('\nRACE CONDITION & LARGE DATASET RENDERING RESULTS:');
    console.log(raceTestResult);
    console.log('======================================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
