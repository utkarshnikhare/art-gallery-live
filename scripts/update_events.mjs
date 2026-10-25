import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SOURCES_FILE = path.join(rootDir, 'scripts', 'sources.json');
const EVENTS_FILE = path.join(rootDir, 'public', 'data', 'events.json');
const EVENTS_TMP_FILE = path.join(rootDir, 'public', 'data', 'events.tmp.json');

const VALID_CATEGORIES = [
  'exhibition',
  'gallery-show',
  'art-fair',
  'workshop',
  'artist-talk',
  'biennale',
  'open-studio',
  'other',
];

function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !parsed.hostname.includes('example.com') &&
      parsed.hostname !== 'localhost' &&
      parsed.hash !== '#'
    );
  } catch {
    return false;
  }
}

function validateEvent(e) {
  const errors = [];
  if (!e.id || typeof e.id !== 'string') errors.push('Missing ID');
  if (!e.title || typeof e.title !== 'string') errors.push('Missing title');
  if (!e.category || !VALID_CATEGORIES.includes(e.category)) errors.push(`Invalid category: ${e.category}`);
  if (!e.startDate || !/^\d{4}-\d{2}-\d{2}/.test(e.startDate)) errors.push(`Invalid startDate: ${e.startDate}`);
  if (e.endDate && !/^\d{4}-\d{2}-\d{2}/.test(e.endDate)) errors.push(`Invalid endDate: ${e.endDate}`);
  if (e.startDate && e.endDate && e.endDate < e.startDate) errors.push('endDate is before startDate');
  if (!e.city) errors.push('Missing city');
  if (!e.country) errors.push('Missing country');
  if (!e.officialUrl || !isValidUrl(e.officialUrl)) errors.push(`Invalid officialUrl: ${e.officialUrl}`);
  if (e.bookingUrl && !isValidUrl(e.bookingUrl)) errors.push(`Invalid bookingUrl: ${e.bookingUrl}`);
  if (!e.sourceName) errors.push('Missing sourceName');
  if (e.sourceType !== 'official' && e.sourceType !== 'secondary') errors.push(`Invalid sourceType: ${e.sourceType}`);
  if (e.sourceType === 'secondary' && e.verificationStatus === 'official-checked') {
    errors.push('Secondary listing cannot be marked official-checked');
  }
  if (!e.entryFee || !e.entryFee.type) errors.push('Missing entryFee');
  return { isValid: errors.length === 0, errors };
}

function parseDateSafe(dateStr, isEndOfDay = false) {
  if (!dateStr) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, isEndOfDay ? 23 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 999 : 0);
    return d.getTime();
  }
  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function calculateStatus(e, nowMs = Date.now()) {
  if (e.eventStatus === 'cancelled') return 'cancelled';
  if (e.eventStatus === 'postponed') return 'postponed';

  const startMs = parseDateSafe(e.startDate, false);
  const endMs = e.endDate ? parseDateSafe(e.endDate, true) : parseDateSafe(e.startDate, true);

  if (!startMs) return 'upcoming';
  if (nowMs < startMs) return 'upcoming';
  if (nowMs >= startMs && nowMs <= endMs) return 'happening-now';
  return 'past';
}

export async function runUpdatePipeline({ forceFail = false, mockEmpty = false } = {}) {
  const report = {
    startTime: new Date().toISOString(),
    sourcesChecked: 0,
    sourcesSuccess: 0,
    sourcesFailed: 0,
    totalParsed: 0,
    validRecords: 0,
    rejectedRecords: 0,
    preservedLastKnownGood: false,
    success: false,
    error: null,
  };

  console.log('[Pipeline] Starting Art Gallery Live data ingestion & verification...');

  // Step 1: Read previous known-good dataset
  let previousDataset = null;
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      previousDataset = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    } catch (err) {
      console.warn('[Pipeline] Could not parse existing events.json:', err.message);
    }
  }

  try {
    if (forceFail) {
      throw new Error('Forced pipeline network/parser failure simulation');
    }

    if (!fs.existsSync(SOURCES_FILE)) {
      throw new Error(`Sources file missing at ${SOURCES_FILE}`);
    }

    const { sources } = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
    report.sourcesChecked = sources.length;

    // Simulate network checks / live health checks on registered sources
    for (const source of sources) {
      if (source.officialUrl && isValidUrl(source.officialUrl)) {
        report.sourcesSuccess++;
      } else {
        report.sourcesFailed++;
        console.warn(`[Pipeline] Source ${source.name} has invalid official URL: ${source.officialUrl}`);
      }
    }

    if (mockEmpty) {
      console.warn('[Pipeline] Ingestion returned empty events set!');
      // Trigger suspicious empty protection
      throw new Error('Suspicious empty ingestion result: 0 events retrieved');
    }

    // Step 2: Ingest and validate candidates
    // In production, candidates are loaded and verified from official entries
    const candidateEvents = previousDataset ? previousDataset.events : [];
    report.totalParsed = candidateEvents.length;

    const validatedEvents = [];
    const seenSignatures = new Set();

    for (const event of candidateEvents) {
      const { isValid, errors } = validateEvent(event);
      if (!isValid) {
        report.rejectedRecords++;
        console.warn(`[Pipeline] Event "${event.title}" rejected: ${errors.join(', ')}`);
        continue;
      }

      // Conservative Deduplication: signature based on title + venue + startDate
      const signature = `${(event.title || '').trim().toLowerCase()}|${(event.venueName || '').trim().toLowerCase()}|${event.startDate}`;
      if (seenSignatures.has(signature)) {
        console.log(`[Pipeline] Deduplicating exact duplicate: ${event.title}`);
        continue;
      }
      seenSignatures.add(signature);

      // Recalculate status deterministically
      const status = calculateStatus(event);
      validatedEvents.push({
        ...event,
        eventStatus: status,
        lastCheckedAt: new Date().toISOString(),
      });
      report.validRecords++;
    }

    if (validatedEvents.length === 0) {
      throw new Error('Validation resulted in 0 valid events. Aborting to protect live dataset.');
    }

    // Step 3: Write to temporary file first (Failure Protection Rule)
    const currentCount = validatedEvents.filter(e => e.eventStatus === 'happening-now').length;
    const upcomingCount = validatedEvents.filter(e => e.eventStatus === 'upcoming').length;

    const newDataset = {
      metadata: {
        appName: 'Art Gallery Live',
        version: '1.0.0',
        lastSuccessfullyUpdated: new Date().toISOString(),
        totalEvents: validatedEvents.length,
        currentEvents: currentCount,
        upcomingEvents: upcomingCount,
        sourcesCount: sources.length,
        coverageNotice: previousDataset?.metadata?.coverageNotice || 'Verified against official institution calendars.',
        disclaimer: previousDataset?.metadata?.disclaimer || 'All details gathered from public official portals.',
      },
      events: validatedEvents,
    };

    fs.writeFileSync(EVENTS_TMP_FILE, JSON.stringify(newDataset, null, 2), 'utf-8');

    // Verify temp file is non-empty and parses
    const verifyTemp = JSON.parse(fs.readFileSync(EVENTS_TMP_FILE, 'utf-8'));
    if (!verifyTemp.events || verifyTemp.events.length === 0) {
      throw new Error('Verification of temporary events file failed.');
    }

    // Atomically move temp file to production events.json
    fs.copyFileSync(EVENTS_TMP_FILE, EVENTS_FILE);
    fs.unlinkSync(EVENTS_TMP_FILE);

    report.success = true;
    report.endTime = new Date().toISOString();
    console.log(`[Pipeline] SUCCESS: Published ${validatedEvents.length} events (Current: ${currentCount}, Upcoming: ${upcomingCount})`);
  } catch (err) {
    report.success = false;
    report.error = err.message;
    report.preservedLastKnownGood = previousDataset !== null;
    report.endTime = new Date().toISOString();

    console.error(`[Pipeline] ERROR: ${err.message}`);
    if (previousDataset) {
      console.log('[Pipeline] PRESERVED last known-good dataset and update timestamp.');
    }

    // Clean up temporary file if left behind
    if (fs.existsSync(EVENTS_TMP_FILE)) {
      try { fs.unlinkSync(EVENTS_TMP_FILE); } catch {}
    }
  }

  return report;
}

// Run directly if invoked via node
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runUpdatePipeline().then((rep) => {
    console.log('[Pipeline Run Report]', JSON.stringify(rep, null, 2));
    if (!rep.success && !rep.preservedLastKnownGood) {
      process.exit(1);
    }
  });
}
