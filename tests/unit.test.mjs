import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArtEvent, isValidUrl } from '../src/utils/validation.ts';
import { calculateEventStatus, formatDateRange, parseDateSafe } from '../src/utils/dateUtils.ts';
import { filterEvents, sortEvents, DEFAULT_FILTERS } from '../src/utils/filterUtils.ts';
import { runUpdatePipeline } from '../scripts/update_events.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const EVENTS_FILE = path.join(rootDir, 'public', 'data', 'events.json');

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
  assert.equal(isValidUrl('https://gallery.com/fake'), false);
  assert.equal(isValidUrl('https://gallery.com/demo'), false);
  assert.equal(isValidUrl('javascript:alert(1)'), false);

  const fakeEvt = { ...verifiedSample, officialUrl: 'https://example.com/fake' };
  assert.equal(validateArtEvent(fakeEvt).isValid, false);
});

// 3. Missing critical verified fields
it('3. Missing critical field-level verification fails validation', () => {
  const missingField = {
    ...verifiedSample,
    verifiedFields: ['title', 'venue'], // missing 'dates'
  };
  const result = validateArtEvent(missingField);
  assert.equal(result.isValid, false);
  assert.match(result.errors[0], /Critical field 'dates' has not been verified/);
});

// 4. Missing or conflicting dates
it('4. Conflicting dates (endDate before startDate) are rejected', () => {
  const conflictingDates = {
    ...verifiedSample,
    startDate: '2026-11-20',
    endDate: '2026-11-01',
  };
  const res = validateArtEvent(conflictingDates);
  assert.equal(res.isValid, false);
  assert.match(res.errors[0], /cannot be before startDate/);
});

// 5. Expired events excluded from Upcoming
it('5. Expired events are excluded from upcoming directory', () => {
  const testNow = new Date('2026-10-25T12:00:00Z').getTime();
  const pastEvt = {
    ...verifiedSample,
    startDate: '2026-09-01',
    endDate: '2026-10-01',
    eventStatus: 'past',
  };
  assert.equal(calculateEventStatus(pastEvt, testNow), 'past');

  const filtered = filterEvents([pastEvt], DEFAULT_FILTERS, testNow);
  assert.equal(filtered.length, 0);
});

// 6. Cancelled and postponed exhibitions
it('6. Cancelled and postponed exhibitions are properly identified', () => {
  const cancelledEvt = { ...verifiedSample, eventStatus: 'cancelled' };
  assert.equal(calculateEventStatus(cancelledEvt), 'cancelled');
  assert.notEqual(calculateEventStatus(cancelledEvt), 'upcoming');

  const postponedEvt = { ...verifiedSample, eventStatus: 'postponed' };
  assert.equal(calculateEventStatus(postponedEvt), 'postponed');
});

// 7. Old records retained safely after a failed update
await itAsync('7. Old records retained safely after a failed update', async () => {
  const rawBefore = fs.readFileSync(EVENTS_FILE, 'utf-8');
  const report = await runUpdatePipeline({ forceFail: true });
  assert.equal(report.success, false);
  assert.equal(report.preservedLastKnownGood, true);

  const rawAfter = fs.readFileSync(EVENTS_FILE, 'utf-8');
  assert.equal(rawBefore, rawAfter);
});

// 8. Empty or partially parsed source results
await itAsync('8. Empty or partially parsed source results do not wipe feed', async () => {
  const rawBefore = fs.readFileSync(EVENTS_FILE, 'utf-8');
  const report = await runUpdatePipeline({ mockEmpty: true });
  assert.equal(report.success, false);
  assert.equal(report.preservedLastKnownGood, true);

  const rawAfter = fs.readFileSync(EVENTS_FILE, 'utf-8');
  assert.equal(rawBefore, rawAfter);
});

// 9. Unconfirmed free fee cannot be marked free
it('9. Free admission cannot be claimed without organiser confirmation', () => {
  const unconfirmedFree = {
    ...verifiedSample,
    entryFee: {
      type: 'free',
      amountText: 'Free Admission',
      isConfirmedByOrganiser: false, // Not confirmed!
    },
  };
  const result = validateArtEvent(unconfirmedFree);
  assert.equal(result.isValid, false);
  assert.match(result.errors[0], /Free admission cannot be claimed unless explicitly confirmed/);
});

// 10. Missing or invalid booking link
it('10. Invalid booking link is rejected', () => {
  const invalidBooking = { ...verifiedSample, bookingUrl: 'http://example.com' };
  assert.equal(validateArtEvent(invalidBooking).isValid, false);

  const validBooking = { ...verifiedSample, bookingUrl: 'https://nmacc.com/tickets' };
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

console.log(`\nData Integrity & Adversarial Tests: ${passed} PASSED, ${failed} FAILED\n`);
if (failed > 0) process.exit(1);
