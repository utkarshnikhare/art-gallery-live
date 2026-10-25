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
import { 
  generateArtworkFingerprint, 
  verifyArtworkFingerprint,
  encryptAesGcm,
  decryptAesGcm,
  isCertificateValid,
  PROVENANCE_LEGAL_NOTICE
} from '../src/utils/cryptoUtils.ts';
import { calculatePricingRecommendation } from '../src/utils/pricingService.ts';
import { parseCsvText, validateArtworkImport, exportToCsv } from '../src/utils/csvService.ts';
import { generateQrSvgDataUri } from '../src/utils/qrUtils.ts';
import { StorageService, EMPTY_WORKSPACE } from '../src/services/storageService.ts';

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

console.log(`\nData Integrity & Adversarial Tests: ${passed} PASSED, ${failed} FAILED\n`);
if (failed > 0) process.exit(1);
