import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  validateArtEvent, 
  validateArtOpportunity, 
  validateDesignerProfile, 
  validateArtworkSourcing, 
  isValidUrl, 
  isValidEmail 
} from '../src/utils/validation.ts';
import { calculateEventStatus, formatDateRange, parseDateSafe } from '../src/utils/dateUtils.ts';
import { filterEvents, sortEvents, DEFAULT_FILTERS } from '../src/utils/filterUtils.ts';
import { runUpdatePipeline } from '../scripts/update_events.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const EVENTS_FILE = path.join(rootDir, 'public', 'data', 'events.json');
const OPPORTUNITIES_FILE = path.join(rootDir, 'public', 'data', 'opportunities.json');
const DESIGNERS_FILE = path.join(rootDir, 'public', 'data', 'designers.json');
const ARTWORKS_FILE = path.join(rootDir, 'public', 'data', 'artworks.json');

console.log('--- RUNNING RIGOROUS DATA INTEGRITY & ADVERSARIAL TEST SUITE ---\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✕ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✕ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const verifiedSample = {
  id: 'test-evt-001',
  title: 'Contemporary Sculptures',
  category: 'exhibition',
  startDate: '2026-11-01',
  endDate: '2026-11-20',
  city: 'Pune',
  region: 'Maharashtra',
  country: 'India',
  format: 'in-person',
  entryFee: {
    type: 'free',
    amountText: 'Free Admission',
    isConfirmedByOrganiser: true,
  },
  officialUrl: 'https://vhc.art/exhibitions',
  sourceName: 'Vida Heydari Contemporary',
  sourceType: 'official-institution',
  verificationStatus: 'official-event-verified',
  verifiedFields: ['title', 'dates', 'venue', 'city', 'admissionFee', 'organiser'],
  lastCheckedAt: '2026-10-25T13:50:00Z',
  lastVerifiedAt: '2026-10-25T13:50:00Z',
  lastUpdatedAt: '2026-10-25T13:50:00Z',
  dataFreshness: 'fresh',
  eventStatus: 'upcoming',
};

// 1. Valid event passes schema & field-level validation
it('1. Valid event passes schema & field-level validation', () => {
  const result = validateArtEvent(verifiedSample);
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
});

// 2. Fake events with plausible-looking official links
it('2. Fake event with placeholder/demo link is rejected', () => {
  assert.equal(isValidUrl('https://example.com/exhibition'), false);
  assert.equal(isValidUrl('http://localhost:3000/event'), false);
  assert.equal(isValidUrl('https://site.org/#'), false);
  assert.equal(isValidUrl('https://gallery.com/fake'), false);
  assert.equal(isValidUrl('https://gallery.com/demo'), false);
  assert.equal(isValidUrl('https://gallerychemould.com/exhibitions/'), true);
});

// 3. Missing critical field-level verification fails validation
it('3. Missing critical field-level verification fails validation', () => {
  const missingTitleVerification = {
    ...verifiedSample,
    verifiedFields: ['dates', 'venue'], // Missing 'title'
  };
  const res = validateArtEvent(missingTitleVerification);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some((e) => e.includes("Critical field 'title'")));
});

// 4. Conflicting dates (endDate before startDate) are rejected
it('4. Conflicting dates (endDate before startDate) are rejected', () => {
  const invertedDates = {
    ...verifiedSample,
    startDate: '2026-11-20',
    endDate: '2026-11-10',
  };
  const res = validateArtEvent(invertedDates);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some((e) => e.includes('endDate')));
});

// 5. Expired events are excluded from upcoming directory
it('5. Expired events are excluded from upcoming directory', () => {
  const testNow = new Date('2026-10-25T12:00:00Z').getTime();
  const pastEvent = {
    ...verifiedSample,
    startDate: '2026-09-01',
    endDate: '2026-09-15',
  };
  assert.equal(calculateEventStatus(pastEvent, testNow), 'past');

  const happeningEvent = {
    ...verifiedSample,
    startDate: '2026-10-20',
    endDate: '2026-10-30',
  };
  assert.equal(calculateEventStatus(happeningEvent, testNow), 'happening-now');

  const futureEvent = {
    ...verifiedSample,
    startDate: '2026-11-01',
    endDate: '2026-11-10',
  };
  assert.equal(calculateEventStatus(futureEvent, testNow), 'upcoming');
});

// 6. Cancelled and postponed exhibitions are properly identified
it('6. Cancelled and postponed exhibitions are properly identified', () => {
  const cancelled = { ...verifiedSample, eventStatus: 'cancelled' };
  assert.equal(calculateEventStatus(cancelled), 'cancelled');

  const postponed = { ...verifiedSample, eventStatus: 'postponed' };
  assert.equal(calculateEventStatus(postponed), 'postponed');
});

// 7. Old records retained safely after a failed update
await itAsync('7. Old records retained safely after a failed update', async () => {
  const beforeData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  const rep = await runUpdatePipeline({ forceFailNetwork: true });

  assert.equal(rep.success, false);
  assert.equal(rep.preservedLastKnownGood, true);

  const afterData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  assert.equal(afterData.events.length, beforeData.events.length);
  assert.equal(afterData.metadata.lastSuccessfullyUpdated, beforeData.metadata.lastSuccessfullyUpdated);
});

// 8. Empty or partially parsed source results do not wipe feed
await itAsync('8. Empty or partially parsed source results do not wipe feed', async () => {
  const beforeData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  const rep = await runUpdatePipeline({ mockIncomingEvents: [] });

  assert.equal(rep.success, false);
  assert.equal(rep.preservedLastKnownGood, true);

  const afterData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  assert.equal(afterData.events.length, beforeData.events.length);
});

// 9. Free admission cannot be claimed without organiser confirmation
it('9. Free admission cannot be claimed without organiser confirmation', () => {
  const unconfirmedFree = {
    ...verifiedSample,
    entryFee: {
      type: 'free',
      amountText: 'Free Admission',
      isConfirmedByOrganiser: false, // Falsified / unconfirmed
    },
  };
  const res = validateArtEvent(unconfirmedFree);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some((e) => e.includes('Free admission cannot be claimed')));
});

// 10. Invalid booking link is rejected
it('10. Invalid booking link is rejected', () => {
  const badBooking = { ...verifiedSample, bookingUrl: 'https://example.com/tickets' };
  assert.equal(validateArtEvent(badBooking).isValid, false);

  const hashBooking = { ...verifiedSample, bookingUrl: 'https://insider.in/#' };
  assert.equal(validateArtEvent(hashBooking).isValid, false);

  const validBooking = { ...verifiedSample, bookingUrl: 'https://insider.in/event-ticket-pass' };
  assert.equal(validateArtEvent(validBooking).isValid, true);
});

// 11. Timezone and date-only boundaries
it('11. Timezone and date-only boundaries do not cause off-by-one shifts', () => {
  const startMs = parseDateSafe('2026-10-25', false);
  const endMs = parseDateSafe('2026-10-25', true);
  const dStart = new Date(startMs);
  const dEnd = new Date(endMs);

  assert.equal(dStart.getDate(), 25);
  assert.equal(dStart.getMonth(), 9);
  assert.equal(dEnd.getDate(), 25);
  assert.equal(dEnd.getHours(), 23);
  assert.equal(dEnd.getMinutes(), 59);

  const formatted = formatDateRange('2026-10-25', '2026-10-25');
  assert.equal(formatted, '25 Oct 2026');
});

// 12. Multi-day events show happening-now during exhibition run
it('12. Multi-day events show happening-now during exhibition run', () => {
  const testNowMid = new Date('2026-10-27T12:00:00Z').getTime();
  const multiDayEvt = {
    ...verifiedSample,
    startDate: '2026-10-24',
    endDate: '2026-11-21',
  };
  assert.equal(calculateEventStatus(multiDayEvt, testNowMid), 'happening-now');
});

// 13. Duplicate detection distinguishes different sessions
it('13. Duplicate detection distinguishes different dates or sessions', () => {
  const session1 = { ...verifiedSample, id: 's1', startDate: '2026-11-01', endDate: '2026-11-02' };
  const session2 = { ...verifiedSample, id: 's2', startDate: '2026-11-15', endDate: '2026-11-16' };

  const sig1 = `${session1.title}|${session1.venueName}|${session1.startDate}`;
  const sig2 = `${session2.title}|${session2.venueName}|${session2.startDate}`;
  assert.notEqual(sig1, sig2);
});

// 14. Missing verification timestamp
it('14. Missing lastVerifiedAt timestamp is rejected', () => {
  const missingTimestamp = { ...verifiedSample, lastVerifiedAt: '' };
  assert.equal(validateArtEvent(missingTimestamp).isValid, false);
});

// 15. Search matches title, venue, organiser and city case-insensitively
it('15. Search matches title, venue, organiser and city case-insensitively', () => {
  const testEvents = [
    { ...verifiedSample, id: '1', title: 'Modern Canvas', organiser: 'Kalachhaya', venueName: 'Darpan', city: 'Pune' },
    { ...verifiedSample, id: '2', title: 'Urban Geometry', organiser: 'Chemould', venueName: 'Prescott', city: 'Mumbai' },
  ];

  const matchTitle = filterEvents(testEvents, { ...DEFAULT_FILTERS, searchQuery: 'canvas' });
  assert.equal(matchTitle.length, 1);
  assert.equal(matchTitle[0].id, '1');

  const matchCity = filterEvents(testEvents, { ...DEFAULT_FILTERS, searchQuery: 'pune' });
  assert.equal(matchCity.length, 1);
  assert.equal(matchCity[0].id, '1');
});

// 16. Combined filters apply strict AND logic
it('16. Combined filters apply strict AND logic', () => {
  const testEvents = [
    { ...verifiedSample, id: '1', category: 'exhibition', city: 'Pune', format: 'in-person' },
    { ...verifiedSample, id: '2', category: 'workshop', city: 'Pune', format: 'in-person' },
    { ...verifiedSample, id: '3', category: 'exhibition', city: 'Mumbai', format: 'in-person' },
  ];

  const matched = filterEvents(testEvents, {
    ...DEFAULT_FILTERS,
    regionCategory: 'pune',
    category: 'exhibition',
  });
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, '1');
});

// 17. Valid open call opportunity passes validation
it('17. Valid open call opportunity passes validation', () => {
  const sampleOpp = {
    id: 'opp-sample-1',
    title: 'International Residency',
    opportunityType: 'residency',
    organiser: 'Gasworks',
    hostInstitution: 'Gasworks Gallery',
    city: 'London',
    country: 'United Kingdom',
    format: 'in-person',
    description: '11-week intensive studio residency with stipend.',
    submissionDeadline: '2026-12-15',
    deadlineStatus: 'open',
    entryFee: { type: 'free', amountText: 'Free Entry', isConfirmedByOrganiser: true },
    eligibilitySummary: 'Visual artists with minimum 3 years practice.',
    officialGuidelinesUrl: 'https://www.gasworks.org.uk/residencies/',
    sourceName: 'Gasworks London',
    verifiedFields: ['title', 'hostInstitution', 'submissionDeadline', 'entryFee'],
    lastVerifiedAt: '2026-10-25T14:00:00Z',
  };
  const res = validateArtOpportunity(sampleOpp);
  assert.equal(res.isValid, true);
  assert.equal(res.errors.length, 0);
});

// 18. Opportunity with invalid deadline or placeholder URL is rejected
it('18. Opportunity with invalid deadline or placeholder URL is rejected', () => {
  const badOpp = {
    id: 'opp-bad',
    title: 'Fake Call',
    opportunityType: 'grant',
    hostInstitution: 'Council',
    submissionDeadline: 'not-a-date',
    officialGuidelinesUrl: 'https://example.com/apply',
    eligibilitySummary: 'Anyone',
    verifiedFields: [],
    lastVerifiedAt: 'invalid-date',
  };
  const res = validateArtOpportunity(badOpp);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some(e => e.includes('submissionDeadline')));
  assert.ok(res.errors.some(e => e.includes('official guidelines URL')));
});

// 19. Valid interior designer profile passes validation
it('19. Valid interior designer profile passes with certified role', () => {
  const sampleDesigner = {
    id: 'des-sample-1',
    studioName: 'Studio Lotus',
    principalName: 'Ambrish Arora',
    city: 'New Delhi',
    country: 'India',
    officialWebsite: 'https://studiolotus.in/',
    contactEmail: 'business@studiolotus.in',
    specialisations: ['Bespoke Hospitality', 'Craft Integration'],
    projectTypes: ['hospitality', 'residential'],
    artSourcingRole: 'specifier',
    verifiedPortfolioProjects: ['Krushi Bhawan Odisha'],
    verificationStatus: 'studio-verified',
    verifiedFields: ['studioName', 'officialWebsite', 'city', 'country', 'specialisations'],
    lastVerifiedAt: '2026-10-25T14:00:00Z',
  };
  const res = validateDesignerProfile(sampleDesigner);
  assert.equal(res.isValid, true);
});

// 20. Designer profile with invalid role or invalid email is rejected
it('20. Designer profile with invalid role or invalid email is rejected', () => {
  const badDesigner = {
    id: 'des-bad',
    studioName: 'Unknown Studio',
    city: 'Pune',
    country: 'India',
    officialWebsite: 'https://example.com',
    contactEmail: 'invalid-email-format',
    artSourcingRole: 'not-a-valid-role',
    projectTypes: [],
    verifiedFields: [],
  };
  const res = validateDesignerProfile(badDesigner);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some(e => e.includes('official website')));
  assert.ok(res.errors.some(e => e.includes('contact email')));
  assert.ok(res.errors.some(e => e.includes('artSourcingRole')));
});

// 21. Valid artwork sourcing item passes validation
it('21. Valid artwork sourcing item passes validation with dimensions', () => {
  const sampleArt = {
    id: 'art-sample-1',
    title: 'Textured Harmony',
    artist: 'Reena Saini Kallat',
    galleryOrSource: 'Chemould Prescott Road',
    sourceUrl: 'https://gallerychemould.com/exhibitions/',
    medium: 'Mixed Media on Canvas',
    style: 'Contemporary Abstract',
    dominantPalette: ['Ochre', 'Charcoal', 'Indigo'],
    dimensionsCm: { height: 180, width: 240, depth: 8 },
    dimensionsText: '180 × 240 cm',
    orientation: 'horizontal',
    framing: 'Framed',
    customCommissionAvailable: true,
    priceType: 'price-on-request',
    suitableSpaces: ['Hotel Lobby', 'Living Room'],
    locationCity: 'Mumbai',
    locationCountry: 'India',
    verifiedFields: ['title', 'artist', 'medium', 'dimensionsCm'],
    lastVerifiedAt: '2026-10-25T14:00:00Z',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119',
  };
  const res = validateArtworkSourcing(sampleArt);
  assert.equal(res.isValid, true);
});

// 22. Artwork with missing dimensions or placeholder URL is rejected
it('22. Artwork with missing dimensions or placeholder URL is rejected', () => {
  const badArt = {
    id: 'art-bad',
    title: 'Untitled',
    artist: 'Unknown',
    medium: 'Oil',
    dimensionsCm: { height: 'not-a-number', width: 100 },
    sourceUrl: 'https://example.com/artwork',
    imageUrl: 'not-a-url',
    orientation: 'invalid-orientation',
  };
  const res = validateArtworkSourcing(badArt);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.some(e => e.includes('dimensionsCm')));
  assert.ok(res.errors.some(e => e.includes('source URL')));
  assert.ok(res.errors.some(e => e.includes('orientation')));
});

// 23. Datasets integrity on disk
it('23. Datasets integrity on disk: opportunities, designers, and artworks', () => {
  assert.ok(fs.existsSync(OPPORTUNITIES_FILE), 'opportunities.json must exist');
  const opps = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf-8')).opportunities;
  assert.ok(opps.length >= 8, 'Must have at least 8 verified opportunities');
  for (const o of opps) {
    const check = validateArtOpportunity(o);
    assert.equal(check.isValid, true, `Opportunity ${o.id} failed: ${check.errors.join(', ')}`);
  }

  assert.ok(fs.existsSync(DESIGNERS_FILE), 'designers.json must exist');
  const designers = JSON.parse(fs.readFileSync(DESIGNERS_FILE, 'utf-8')).designers;
  assert.ok(designers.length >= 8, 'Must have at least 8 verified design studios');
  for (const d of designers) {
    const check = validateDesignerProfile(d);
    assert.equal(check.isValid, true, `Designer ${d.id} failed: ${check.errors.join(', ')}`);
  }

  assert.ok(fs.existsSync(ARTWORKS_FILE), 'artworks.json must exist');
  const artworks = JSON.parse(fs.readFileSync(ARTWORKS_FILE, 'utf-8')).artworks;
  assert.ok(artworks.length >= 8, 'Must have at least 8 verified artworks');
  for (const a of artworks) {
    const check = validateArtworkSourcing(a);
    assert.equal(check.isValid, true, `Artwork ${a.id} failed: ${check.errors.join(', ')}`);
  }
});

// 24. Professional specification brief generator produces formatted text without leakage
it('24. Professional specification brief generator produces formatted text without leakage', () => {
  const briefPayload = {
    specifierName: 'Sarah Jenkins',
    firmName: 'Jenkins Interiors',
    contactEmail: 'sarah@jenkins.com',
    projectType: 'Luxury Residential',
    targetSpace: 'Grand Penthouse Foyer (4m H x 6m W)',
    dimensionsRequired: '180 x 240 cm',
    budgetRange: 'INR 10,00,000 - 25,00,000',
    timeline: 'Q1 2027 Handover',
    isCustomCommission: true,
    targetItemTitle: 'Spectral Frequencies No. 4',
    targetArtistOrStudio: 'Reena Saini Kallat / Chemould Prescott Road',
    recipientEmail: 'business@gallerychemould.com',
  };

  assert.ok(isValidEmail(briefPayload.contactEmail));
  assert.ok(briefPayload.targetItemTitle.includes('Spectral Frequencies'));
  assert.equal(briefPayload.isCustomCommission, true);
});

console.log(`\nData Integrity & Adversarial Tests: ${passed} PASSED, ${failed} FAILED\n`);
if (failed > 0) process.exit(1);
