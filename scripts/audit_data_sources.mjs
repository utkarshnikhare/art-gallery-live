import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const eventsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/events.json'), 'utf8'));
const oppsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/opportunities.json'), 'utf8'));
const designersData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/designers.json'), 'utf8'));
const artworksData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/artworks.json'), 'utf8'));

const events = eventsData.events || [];
const opps = oppsData.opportunities || [];
const designers = designersData.designers || [];
const artworks = artworksData.artworks || [];

console.log('=== DATA INTEGRITY AUDIT ===\n');

console.log(`Total Events in Feed: ${events.length}`);
console.log(`Total Opportunities: ${opps.length}`);
console.log(`Total Designers: ${designers.length}`);
console.log(`Total Artworks: ${artworks.length}\n`);

console.log('--- 1. EXHIBITION EVENTS AUDIT ---');
const auditedEvents = events.map(e => ({
  id: e.id,
  title: e.title,
  venue: e.venueName,
  city: e.city,
  dates: `${e.startDate} to ${e.endDate}`,
  admission: e.entryFee?.amountText || (e.entryFee?.isFree ? 'Free' : 'Paid'),
  officialUrl: e.officialUrl,
  verifiedFields: (e.verifiedFields || []).join(', '),
  status: e.verificationStatus,
  lastVerifiedAt: e.lastVerifiedAt
}));
console.table(auditedEvents);

console.log('\n--- 2. ART OPPORTUNITIES (OPEN CALLS) AUDIT ---');
const auditedOpps = opps.map(o => ({
  id: o.id,
  title: o.title,
  organizer: o.organiser,
  deadline: o.submissionDeadline,
  status: o.deadlineStatus,
  location: `${o.city}, ${o.country}`,
  fee: o.entryFee?.amountText,
  officialUrl: o.submissionUrl || o.officialGuidelinesUrl,
  verifiedFields: (o.verifiedFields || []).join(', ')
}));
console.table(auditedOpps);

console.log('\n--- 3. INTERIOR DESIGN & ART SPECIFIERS AUDIT ---');
const auditedDesigners = designers.map(d => ({
  id: d.id,
  studioName: d.studioName,
  city: d.city,
  roleBadge: d.roleBadge,
  email: d.contactEmail,
  website: d.officialWebsite,
  verifiedFields: (d.verifiedFields || []).join(', ')
}));
console.table(auditedDesigners);

console.log('\n--- 4. ARTWORK SOURCING CATALOG AUDIT ---');
const auditedArtworks = artworks.map(a => ({
  id: a.id,
  title: a.title,
  artist: a.artist,
  medium: a.medium,
  dims: a.dimensionsText || `${a.dimensionsCm?.height} x ${a.dimensionsCm?.width} cm`,
  pricing: a.price ? `${a.currency} ${a.price}` : a.priceType,
  sourceUrl: a.sourceUrl,
  verifiedFields: (a.verifiedFields || []).join(', ')
}));
console.table(auditedArtworks);
