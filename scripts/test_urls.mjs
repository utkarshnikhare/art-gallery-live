import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const oppsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/opportunities.json'), 'utf8')).opportunities || [];
const designersData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/designers.json'), 'utf8')).designers || [];
const artworksData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/artworks.json'), 'utf8')).artworks || [];

async function checkUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow'
    });
    return { status: res.status, ok: res.ok };
  } catch (err) {
    return { status: 'ERR', error: err.message };
  }
}

async function run() {
  console.log('--- Checking Opportunities URLs ---');
  for (const o of oppsData) {
    const targetUrl = o.submissionUrl || o.officialGuidelinesUrl;
    const res = await checkUrl(targetUrl);
    console.log(`[${o.id}] ${o.title} -> ${res.status} (${targetUrl})`);
  }

  console.log('\n--- Checking Designers URLs ---');
  for (const d of designersData) {
    const res = await checkUrl(d.officialWebsite);
    console.log(`[${d.id}] ${d.studioName} -> ${res.status} (${d.officialWebsite})`);
  }

  console.log('\n--- Checking Artworks URLs ---');
  for (const a of artworksData) {
    const res = await checkUrl(a.sourceUrl);
    console.log(`[${a.id}] ${a.title} -> ${res.status} (${a.sourceUrl})`);
  }
}

run();
