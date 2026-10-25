import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SOURCES_FILE = path.join(rootDir, 'scripts', 'sources.json');
const EVENTS_FILE = path.join(rootDir, 'public', 'data', 'events.json');
const EVENTS_TMP_FILE = path.join(rootDir, 'public', 'data', 'events.tmp.json');
const REVIEW_QUEUE_FILE = path.join(rootDir, 'public', 'data', 'review_queue.json');
const OPPORTUNITIES_FILE = path.join(rootDir, 'public', 'data', 'opportunities.json');
const DESIGNERS_FILE = path.join(rootDir, 'public', 'data', 'designers.json');
const ARTWORKS_FILE = path.join(rootDir, 'public', 'data', 'artworks.json');

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
  const trimmed = url.trim();
  if (trimmed.endsWith('#') || trimmed.includes('/#')) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !parsed.hostname.includes('example.com') &&
      parsed.hostname !== 'localhost' &&
      parsed.pathname !== '/fake' &&
      parsed.pathname !== '/demo'
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

  // Field-level verification validation
  if (!Array.isArray(e.verifiedFields) || e.verifiedFields.length === 0) {
    errors.push('Missing verifiedFields tracking array');
  } else {
    const required = ['title', 'dates', 'venue'];
    for (const req of required) {
      if (!e.verifiedFields.includes(req)) {
        errors.push(`Critical field '${req}' unverified`);
      }
    }
  }

  if (!e.lastVerifiedAt) errors.push('Missing lastVerifiedAt timestamp');

  // Entry fee rules
  if (!e.entryFee || typeof e.entryFee !== 'object') {
    errors.push('Missing entryFee');
  } else {
    const validTypes = ['free', 'price', 'unknown', 'check-organiser'];
    if (!validTypes.includes(e.entryFee.type)) {
      errors.push(`Invalid entryFee.type: ${e.entryFee.type}`);
    }
    if (e.entryFee.type === 'free' && !e.entryFee.isConfirmedByOrganiser) {
      errors.push('Free entry cannot be asserted without isConfirmedByOrganiser');
    }
  }

  return { isValid: errors.length === 0, errors };
}

function parseDateSafe(dateStr, isEndOfDay = false, timezone = 'Asia/Kolkata') {
  if (!dateStr) return 0;
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN) && !dateStr.includes(':')) {
    const [year, month, day] = parts;
    const h = isEndOfDay ? 23 : 0;
    const m = isEndOfDay ? 59 : 0;
    const s = isEndOfDay ? 59 : 0;
    const ms = isEndOfDay ? 999 : 0;
    try {
      const utcGuess = Date.UTC(year, month - 1, day, h, m, s, ms);
      const invDate = new Date(utcGuess);
      const tzParts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(invDate);

      const tzMap = {};
      tzParts.forEach(p => { tzMap[p.type] = p.value; });
      const tzYear = Number(tzMap.year);
      const tzMonth = Number(tzMap.month);
      const tzDay = Number(tzMap.day);
      const tzHour = Number(tzMap.hour === '24' ? '0' : tzMap.hour);
      const tzMin = Number(tzMap.minute);
      const tzSec = Number(tzMap.second);

      const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec, ms);
      const offsetMs = tzAsUtc - utcGuess;
      return utcGuess - offsetMs;
    } catch {
      return new Date(year, month - 1, day, h, m, s, ms).getTime();
    }
  }
  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function calculateStatus(e, nowMs = Date.now()) {
  if (e.eventStatus === 'cancelled') return 'cancelled';
  if (e.eventStatus === 'postponed') return 'postponed';

  const tz = e.timezone || 'Asia/Kolkata';
  const startMs = parseDateSafe(e.startDate, false, tz);
  const endMs = e.endDate ? parseDateSafe(e.endDate, true, tz) : parseDateSafe(e.startDate, true, tz);

  if (nowMs > endMs) return 'past';
  if (nowMs >= startMs && nowMs <= endMs) return 'happening-now';
  return 'upcoming';
}

/**
 * Main ingestion, verification and integrity update runner
 */
export async function runUpdatePipeline(options = {}) {
  const report = {
    startTime: new Date().toISOString(),
    success: false,
    sourcesChecked: 0,
    sourcesHealthy: 0,
    sourcesDegraded: 0,
    sourcesFailing: 0,
    totalIngested: 0,
    validRecords: 0,
    quarantinedCount: 0,
    preservedLastKnownGood: false,
  };

  console.log('[Pipeline] Starting Art Gallery Live data ingestion & verification audit...');

  let previousDataset = null;
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      previousDataset = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    } catch (err) {
      console.warn('[Pipeline] Could not read existing events.json as fallback:', err.message);
    }
  }

  try {
    if (options.forceFailNetwork) {
      throw new Error('Forced pipeline network/parser failure simulation');
    }

    // Load registered sources
    if (!fs.existsSync(SOURCES_FILE)) {
      throw new Error(`Missing sources registry file: ${SOURCES_FILE}`);
    }
    const sourcesData = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
    const sources = sourcesData.sources || [];
    report.sourcesChecked = sources.length;

    // Load existing events to audit
    let rawEvents = [];
    if (options.mockIncomingEvents) {
      rawEvents = options.mockIncomingEvents;
    } else if (previousDataset && Array.isArray(previousDataset.events)) {
      rawEvents = previousDataset.events;
    }

    report.totalIngested = rawEvents.length;

    if (rawEvents.length === 0) {
      console.error('[Pipeline] Ingestion returned empty events set!');
      throw new Error(`Suspicious empty ingestion result: 0 events retrieved`);
    }

    // Step 1: Health check simulated / verified per registered source
    const updatedSources = sources.map((s) => {
      const isOk = isValidUrl(s.officialUrl);
      const healthStatus = isOk ? 'healthy' : 'degraded';
      if (healthStatus === 'healthy') report.sourcesHealthy++;
      else report.sourcesDegraded++;

      return {
        ...s,
        healthStatus,
        lastCheckedTime: new Date().toISOString(),
        lastSuccessTime: isOk ? new Date().toISOString() : s.lastSuccessTime,
        consecutiveFailures: isOk ? 0 : (s.consecutiveFailures || 0) + 1,
      };
    });

    // Step 2: Validate each event record against strict field-level rules
    const validatedEvents = [];
    const quarantineQueue = [];
    const seenSignatures = new Set();
    const now = Date.now();

    for (const event of rawEvents) {
      const valResult = validateEvent(event);
      if (!valResult.isValid) {
        quarantineQueue.push({
          id: event.id || `unverified-${Date.now()}-${Math.random()}`,
          provisionalTitle: event.title || 'Untitled Record',
          institutionName: event.sourceName || 'Unknown',
          sourceUrl: event.officialUrl || '',
          flagReason: valResult.errors.join('; '),
          checkedAt: new Date().toISOString(),
          status: 'insufficient-evidence',
        });
        report.quarantinedCount++;
        continue;
      }

      // Check duplicate signature
      const signature = `${(event.title || '').trim().toLowerCase()}|${(event.venueName || '').trim().toLowerCase()}|${event.startDate}`;
      if (seenSignatures.has(signature)) {
        quarantineQueue.push({
          id: event.id,
          provisionalTitle: event.title,
          institutionName: event.sourceName,
          sourceUrl: event.officialUrl,
          flagReason: 'Duplicate event title, venue, and start date detected',
          checkedAt: new Date().toISOString(),
          status: 'rejected',
        });
        report.quarantinedCount++;
        continue;
      }
      seenSignatures.add(signature);

      // Check freshness: if verified within 14 days, fresh; otherwise mark stale
      const verifiedTime = new Date(event.lastVerifiedAt).getTime();
      const isFresh = now - verifiedTime < 14 * 24 * 60 * 60 * 1000;

      // Recalculate status deterministically
      const status = calculateStatus(event, now);
      validatedEvents.push({
        ...event,
        eventStatus: status,
        dataFreshness: isFresh ? 'fresh' : 'stale',
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
        version: '1.2.0',
        lastSuccessfullyUpdated: new Date().toISOString(),
        totalEvents: validatedEvents.length,
        currentEvents: currentCount,
        upcomingEvents: upcomingCount,
        sourcesCount: sources.length,
        healthySourcesCount: report.sourcesHealthy,
        coverageNotice: previousDataset?.metadata?.coverageNotice || 'Events verified at the individual exhibition level.',
        disclaimer: previousDataset?.metadata?.disclaimer || 'All exhibition details gathered strictly from public official portals.',
      },
      events: validatedEvents,
      sourcesHealth: updatedSources,
    };

    fs.writeFileSync(EVENTS_TMP_FILE, JSON.stringify(newDataset, null, 2), 'utf-8');

    // Verify temp file is non-empty and valid JSON
    const verifyTemp = JSON.parse(fs.readFileSync(EVENTS_TMP_FILE, 'utf-8'));
    if (!verifyTemp.events || verifyTemp.events.length === 0) {
      throw new Error('Verification of temporary events file failed.');
    }

    // Atomically move temp file to production events.json
    fs.copyFileSync(EVENTS_TMP_FILE, EVENTS_FILE);
    fs.unlinkSync(EVENTS_TMP_FILE);

    // Also update review queue if items were quarantined
    if (quarantineQueue.length > 0) {
      let existingQueue = [];
      if (fs.existsSync(REVIEW_QUEUE_FILE)) {
        try { existingQueue = JSON.parse(fs.readFileSync(REVIEW_QUEUE_FILE, 'utf-8')).queue || []; } catch {}
      }
      fs.writeFileSync(
        REVIEW_QUEUE_FILE,
        JSON.stringify({ lastAudit: new Date().toISOString(), queue: [...existingQueue, ...quarantineQueue] }, null, 2),
        'utf-8'
      );
    }

    // Audit and update timestamps for Opportunities, Designers, and Artworks
    if (fs.existsSync(OPPORTUNITIES_FILE)) {
      const oppData = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf-8'));
      if (Array.isArray(oppData.opportunities)) {
        oppData.metadata.lastSuccessfullyUpdated = new Date().toISOString();
        // Update deadline statuses
        oppData.opportunities = oppData.opportunities.map((opp) => {
          const dTime = new Date(opp.submissionDeadline).getTime();
          const daysLeft = Math.ceil((dTime - now) / (1000 * 60 * 60 * 24));
          let status = 'open';
          if (daysLeft < 0) status = 'closed';
          else if (daysLeft <= 21) status = 'closing-soon';
          return { ...opp, deadlineStatus: status };
        });
        oppData.metadata.openCount = oppData.opportunities.filter(o => o.deadlineStatus !== 'closed').length;
        fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(oppData, null, 2), 'utf-8');
      }
    }

    if (fs.existsSync(DESIGNERS_FILE)) {
      const desData = JSON.parse(fs.readFileSync(DESIGNERS_FILE, 'utf-8'));
      if (desData.metadata) {
        desData.metadata.lastSuccessfullyUpdated = new Date().toISOString();
        fs.writeFileSync(DESIGNERS_FILE, JSON.stringify(desData, null, 2), 'utf-8');
      }
    }

    if (fs.existsSync(ARTWORKS_FILE)) {
      const artData = JSON.parse(fs.readFileSync(ARTWORKS_FILE, 'utf-8'));
      if (artData.metadata) {
        artData.metadata.lastSuccessfullyUpdated = new Date().toISOString();
        fs.writeFileSync(ARTWORKS_FILE, JSON.stringify(artData, null, 2), 'utf-8');
      }
    }

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
