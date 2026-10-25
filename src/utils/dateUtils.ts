import { ArtEvent, EventStatus } from '../types';

export const IST_TIMEZONE = 'Asia/Kolkata';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats a date-only string (e.g. "YYYY-MM-DD") without any timezone-induced day shifts.
 * Guaranteed to return the exact calendar day regardless of client browser timezone.
 */
export function formatDateOnly(
  dateStr: string,
  options?: { month?: 'short' | 'long' }
): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return dateStr;
  }
  const [year, month, day] = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return dateStr;
  }
  const monthName = options?.month === 'long'
    ? MONTH_NAMES_LONG[month - 1]
    : MONTH_NAMES_SHORT[month - 1];

  return `${day} ${monthName} ${year}`;
}

/**
 * Parses a date string into an absolute millisecond timestamp.
 * If timezone is provided, interprets date-only strings in that specific timezone.
 * Otherwise, creates a local date without timezone offset shifts.
 */
export function parseDateSafe(
  dateStr: string,
  isEndOfDay = false,
  timezone?: string
): number {
  if (!dateStr) return 0;

  // Handle date-only string like "YYYY-MM-DD"
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN) && !dateStr.includes(':')) {
    const [year, month, day] = parts;
    const h = isEndOfDay ? 23 : 0;
    const m = isEndOfDay ? 59 : 0;
    const s = isEndOfDay ? 59 : 0;
    const ms = isEndOfDay ? 999 : 0;

    if (timezone) {
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

        const tzMap: Record<string, string> = {};
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

    const d = new Date(year, month - 1, day, h, m, s, ms);
    return d.getTime();
  }

  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses date-only string explicitly in target timezone (defaults to Asia/Kolkata).
 */
export function parseDateInTimezone(
  dateStr: string,
  timezone = IST_TIMEZONE,
  isEndOfDay = false
): number {
  return parseDateSafe(dateStr, isEndOfDay, timezone);
}

/**
 * Formats a UTC instant into Indian Standard Time (IST, Asia/Kolkata).
 * Output format example: "25 Oct 2026, 02:50 PM IST" or "25 Oct 2026, 14:50 IST".
 */
export function formatInstantToIST(
  instant: string | number | Date,
  options?: {
    includeTime?: boolean;
    includeSeconds?: boolean;
    includeZoneLabel?: boolean;
    month?: 'short' | 'long';
    hour12?: boolean;
  }
): string {
  if (!instant) return '';
  const d = typeof instant === 'object' ? instant : new Date(instant);
  if (isNaN(d.getTime())) return String(instant);

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TIMEZONE,
      day: 'numeric',
      month: options?.month || 'short',
      year: 'numeric',
      hour: options?.includeTime !== false ? '2-digit' : undefined,
      minute: options?.includeTime !== false ? '2-digit' : undefined,
      second: options?.includeSeconds ? '2-digit' : undefined,
      hour12: options?.hour12 ?? true,
    });

    const formatted = formatter.format(d);
    if (options?.includeTime !== false && options?.includeZoneLabel !== false) {
      return `${formatted} IST`;
    }
    return formatted;
  } catch {
    return d.toISOString();
  }
}

/**
 * Formats an instant in a venue's local timezone, with optional secondary IST indicator.
 */
export function formatVenueDateTime(
  instant: string | number | Date,
  venueTimezone?: string,
  options?: { includeIST?: boolean }
): string {
  if (!instant) return '';
  const tz = venueTimezone || IST_TIMEZONE;
  const d = typeof instant === 'object' ? instant : new Date(instant);
  if (isNaN(d.getTime())) return String(instant);

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
    const venueFormatted = formatter.format(d);

    if (options?.includeIST && tz !== IST_TIMEZONE) {
      const istFormatted = formatInstantToIST(d, { includeTime: true, includeZoneLabel: true });
      return `${venueFormatted} (${istFormatted})`;
    }

    return venueFormatted;
  } catch {
    return formatInstantToIST(d);
  }
}

/**
 * Calculates whether an event is happening now, upcoming, or past based on current time
 * and event timezone boundaries.
 * Guarantees that ended exhibitions are strictly categorized as 'past' and NEVER 'happening-now'.
 */
export function calculateEventStatus(
  event: Pick<ArtEvent, 'startDate' | 'endDate' | 'eventStatus'> & { timezone?: string },
  nowMs = Date.now()
): EventStatus {
  if (event.eventStatus === 'cancelled') return 'cancelled';
  if (event.eventStatus === 'postponed') return 'postponed';

  const tz = event.timezone || IST_TIMEZONE;
  const startMs = parseDateInTimezone(event.startDate, tz, false);
  const endMs = event.endDate
    ? parseDateInTimezone(event.endDate, tz, true)
    : parseDateInTimezone(event.startDate, tz, true);

  if (!startMs) return 'upcoming';

  if (nowMs < startMs) {
    return 'upcoming';
  } else if (nowMs >= startMs && nowMs <= endMs) {
    return 'happening-now';
  } else {
    return 'past';
  }
}

/**
 * Formats date range into unambiguous human readable string, e.g.:
 * "24 Oct – 21 Nov 2026" or "14–17 Jan 2027" or "28 Oct 2026"
 * Supports optional timezone annotations for international venues.
 */
export function formatDateRange(
  startDateStr: string,
  endDateStr?: string,
  timeText?: string,
  venueTimezone?: string
): string {
  if (!startDateStr) return timeText || 'Dates to be announced';

  const startParts = startDateStr.split('T')[0].split('-').map(Number);
  if (startParts.length !== 3) return startDateStr;
  const [sYear, sMonth, sDay] = startParts;
  const sMonthName = MONTH_NAMES_SHORT[sMonth - 1];

  let range = '';
  if (!endDateStr || endDateStr === startDateStr) {
    range = `${sDay} ${sMonthName} ${sYear}`;
  } else {
    const endParts = endDateStr.split('T')[0].split('-').map(Number);
    if (endParts.length !== 3) {
      range = `${sDay} ${sMonthName} ${sYear} – ${endDateStr}`;
    } else {
      const [eYear, eMonth, eDay] = endParts;
      const eMonthName = MONTH_NAMES_SHORT[eMonth - 1];

      if (sYear === eYear && sMonth === eMonth) {
        range = `${sDay}–${eDay} ${sMonthName} ${sYear}`;
      } else if (sYear === eYear) {
        range = `${sDay} ${sMonthName} – ${eDay} ${eMonthName} ${sYear}`;
      } else {
        range = `${sDay} ${sMonthName} ${sYear} – ${eDay} ${eMonthName} ${eYear}`;
      }
    }
  }

  let suffix = timeText || '';
  if (venueTimezone && venueTimezone !== IST_TIMEZONE) {
    const tzLabel = venueTimezone.split('/')[1]?.replace(/_/g, ' ') || venueTimezone;
    suffix = suffix ? `${suffix} (${tzLabel} time)` : `(${tzLabel} time)`;
  }

  return suffix ? `${range} • ${suffix}` : range;
}

/**
 * Calculates remaining days until an application deadline or event closing
 * using Asia/Kolkata (IST) end-of-day boundary (23:59:59.999).
 */
export function getDaysRemainingIST(
  deadlineDateStr: string,
  nowMs = Date.now(),
  timezone = IST_TIMEZONE
): {
  days: number;
  text: string;
  isPast: boolean;
  closesToday: boolean;
} {
  if (!deadlineDateStr) {
    return { days: 0, text: 'No deadline specified', isPast: false, closesToday: false };
  }

  const deadlineMs = parseDateInTimezone(deadlineDateStr, timezone, true);
  const diffMs = deadlineMs - nowMs;

  if (diffMs < 0) {
    return { days: 0, text: 'Deadline passed', isPast: true, closesToday: false };
  }

  const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (daysRemaining === 0) {
    return { days: 0, text: 'Closes today', isPast: false, closesToday: true };
  }
  if (daysRemaining === 1) {
    return { days: 1, text: '1 day remaining', isPast: false, closesToday: false };
  }
  return { days: daysRemaining, text: `${daysRemaining} days remaining`, isPast: false, closesToday: false };
}
