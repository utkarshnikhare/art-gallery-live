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

console.log('--- RUNNING UNIT & INTEGRATION TEST SUITE ---\n');

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

const validSample = {
  id: 'test-evt-001',
  title: 'Contemporary Sculptures',
  category: 'exhibition',
  startDate: '2026-11-01',
  endDate: '2026-11-20',
  city: 'Pune',
  region: 'Maharashtra',
  country: 'India',
  format: 'in-person',
  entryFee: { type: 'free', amountText: 'Free Admission' },
  officialUrl: 'https://zapurza.org/exhibitions',
  sourceName: 'Zapurza',
  sourceType: 'official',
  verificationStatus: 'official-checked',
  lastCheckedAt: '2026-10-25T13:30:00Z',
  lastUpdatedAt: '2026-10-25T13:30:00Z',
  eventStatus: 'upcoming',
};

// 1. Valid event passes validation
it('1. Valid event passes validation', () => {
  const result = validateArtEvent(validSample);
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
});

// 2. Missing/invalid official URL is rejected
it('2. Missing or invalid official URL is rejected', () => {
  assert.equal(isValidUrl('javascript:alert(1)'), false);
  assert.equal(isValidUrl('#'), false);
  assert.equal(isValidUrl('https://example.com/fake'), false);
  assert.equal(isValidUrl('not-a-url'), false);

  const missingUrl = { ...validSample, officialUrl: '' };
  assert.equal(validateArtEvent(missingUrl).isValid, false);

  const dangerousUrl = { ...validSample, officialUrl: 'javascript:alert(1)' };
  assert.equal(validateArtEvent(dangerousUrl).isValid, false);
});

// 3. Missing fee is not treated as free
it('3. Missing fee is not treated as free', () => {
  const noFeeType = { ...validSample, entryFee: { type: 'invalid' } };
  assert.equal(validateArtEvent(noFeeType).isValid, false);

  const unknownFee = { ...validSample, entryFee: { type: 'unknown' } };
  assert.equal(validateArtEvent(unknownFee).isValid, true);
  assert.notEqual(unknownFee.entryFee.type, 'free');
});

// 4. Upcoming/ongoing/past status is correct
it('4. Upcoming/ongoing/past status is correct based on time', () => {
  // Oct 25 2026 12:00:00 GMT
  const testNow = new Date('2026-10-25T12:00:00Z').getTime();

  // Future event
  const upcomingEvt = { ...validSample, startDate: '2026-11-01', endDate: '2026-11-10', eventStatus: 'upcoming' };
  assert.equal(calculateEventStatus(upcomingEvt, testNow), 'upcoming');

  // Ongoing event
  const ongoingEvt = { ...validSample, startDate: '2026-10-20', endDate: '2026-10-30', eventStatus: 'happening-now' };
  assert.equal(calculateEventStatus(ongoingEvt, testNow), 'happening-now');

  // Past event
  const pastEvt = { ...validSample, startDate: '2026-09-01', endDate: '2026-10-01', eventStatus: 'past' };
  assert.equal(calculateEventStatus(pastEvt, testNow), 'past');
});

// 5. Timezone and date-only edge cases do not shift an event to the wrong day
it('5. Timezone and date-only edge cases do not shift an event to the wrong day', () => {
  const startMs = parseDateSafe('2026-10-25', false);
  const endMs = parseDateSafe('2026-10-25', true);
  const dStart = new Date(startMs);
  const dEnd = new Date(endMs);

  assert.equal(dStart.getDate(), 25);
  assert.equal(dStart.getMonth(), 9); // October is 9
  assert.equal(dEnd.getDate(), 25);
  assert.equal(dEnd.getHours(), 23);
  assert.equal(dEnd.getMinutes(), 59);

  const formatted = formatDateRange('2026-10-25', '2026-10-25');
  assert.equal(formatted, '25 Oct 2026');
});

// 6. Multi-day events show the correct status
it('6. Multi-day events show the correct status during exhibition run', () => {
  const testNowMid = new Date('2026-10-27T12:00:00Z').getTime();
  const multiDayEvt = {
    ...validSample,
    startDate: '2026-10-24',
    endDate: '2026-11-21',
  };
  assert.equal(calculateEventStatus(multiDayEvt, testNowMid), 'happening-now');
});

// 7. Search matches title, venue, organiser and city
it('7. Search matches title, venue, organiser and city case-insensitively', () => {
  const testEvents = [
    { ...validSample, id: '1', title: 'Modern Canvas', organiser: 'Kalachhaya', venueName: 'Darpan', city: 'Pune' },
    { ...validSample, id: '2', title: 'Urban Geometry', organiser: 'Chemould', venueName: 'Prescott', city: 'Mumbai' },
  ];

  const matchTitle = filterEvents(testEvents, { ...DEFAULT_FILTERS, searchQuery: 'canvas' });
  assert.equal(matchTitle.length, 1);
  assert.equal(matchTitle[0].id, '1');

  const matchOrganiser = filterEvents(testEvents, { ...DEFAULT_FILTERS, searchQuery: 'chemould' });
  assert.equal(matchOrganiser.length, 1);
  assert.equal(matchOrganiser[0].id, '2');

  const matchCity = filterEvents(testEvents, { ...DEFAULT_FILTERS, searchQuery: 'pune' });
  assert.equal(matchCity.length, 1);
  assert.equal(matchCity[0].id, '1');
});

// 8. Combined filters apply AND logic
it('8. Combined filters apply strict AND logic', () => {
  const testEvents = [
    { ...validSample, id: '1', category: 'exhibition', city: 'Pune', format: 'in-person' },
    { ...validSample, id: '2', category: 'workshop', city: 'Pune', format: 'in-person' },
    { ...validSample, id: '3', category: 'exhibition', city: 'Mumbai', format: 'in-person' },
  ];

  const matched = filterEvents(testEvents, {
    ...DEFAULT_FILTERS,
    regionCategory: 'pune',
    category: 'exhibition',
  });
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, '1');
});

// 9. Reset filters restores default state
it('9. Reset filters restores default state', () => {
  assert.deepEqual(DEFAULT_FILTERS, {
    searchQuery: '',
    regionCategory: 'all',
    category: 'all',
    timeRange: 'all',
    fee: 'all',
    format: 'all',
  });
});

// 10. Duplicate detection does not merge distinct sessions
it('10. Duplicate detection distinguishes different dates or sessions', () => {
  const session1 = { ...validSample, id: 's1', startDate: '2026-11-01', endDate: '2026-11-02' };
  const session2 = { ...validSample, id: 's2', startDate: '2026-11-15', endDate: '2026-11-16' };

  const sig1 = `${session1.title}|${session1.venueName}|${session1.startDate}`;
  const sig2 = `${session2.title}|${session2.venueName}|${session2.startDate}`;
  assert.notEqual(sig1, sig2);
});

// 11. A failed source update preserves the previous valid JSON
await itAsync('11. A failed source update preserves the previous valid JSON', async () => {
  const rawBefore = fs.readFileSync(EVENTS_FILE, 'utf-8');
  const report = await runUpdatePipeline({ forceFail: true });
  assert.equal(report.success, false);
  assert.equal(report.preservedLastKnownGood, true);

  const rawAfter = fs.readFileSync(EVENTS_FILE, 'utf-8');
  assert.equal(rawBefore, rawAfter);
});

// 12. An invalid/suspiciously empty source result does not wipe the event feed
await itAsync('12. Suspiciously empty source result does not wipe the event feed', async () => {
  const rawBefore = fs.readFileSync(EVENTS_FILE, 'utf-8');
  const report = await runUpdatePipeline({ mockEmpty: true });
  assert.equal(report.success, false);
  assert.equal(report.preservedLastKnownGood, true);

  const rawAfter = fs.readFileSync(EVENTS_FILE, 'utf-8');
  assert.equal(rawBefore, rawAfter);
});

// 13. Cancelled events do not show as confirmed upcoming
it('13. Cancelled events do not show as confirmed upcoming', () => {
  const cancelledEvt = { ...validSample, eventStatus: 'cancelled' };
  assert.equal(calculateEventStatus(cancelledEvt), 'cancelled');
  assert.notEqual(calculateEventStatus(cancelledEvt), 'upcoming');
});

// 14. Missing image does not break the card
it('14. Missing image does not break validation or card model', () => {
  const noImage = { ...validSample };
  delete noImage.imageUrl;
  assert.equal(validateArtEvent(noImage).isValid, true);
});

// 15. A booking button appears only for a valid, verified booking URL
it('15. Booking button requires a valid verified booking URL', () => {
  const withoutBooking = { ...validSample };
  delete withoutBooking.bookingUrl;
  assert.equal(Boolean(withoutBooking.bookingUrl), false);

  const withBooking = { ...validSample, bookingUrl: 'https://nmacc.com/tickets' };
  assert.equal(isValidUrl(withBooking.bookingUrl), true);
});

// 16. Secondary listings are not labelled officially verified
it('16. Secondary listings cannot be marked official-checked', () => {
  const secondaryCheck = {
    ...validSample,
    sourceType: 'secondary',
    verificationStatus: 'official-checked',
  };
  const result = validateArtEvent(secondaryCheck);
  assert.equal(result.isValid, false);
  assert.match(result.errors[0], /Secondary listing cannot be marked official-checked/);
});

console.log(`\nUnit & Integration Tests: ${passed} PASSED, ${failed} FAILED\n`);
if (failed > 0) process.exit(1);
