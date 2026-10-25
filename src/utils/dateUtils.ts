import { ArtEvent, EventStatus } from '../types';

/**
 * Parses an ISO date string (YYYY-MM-DD or full ISO 8601) into a timestamp
 * Handles date-only strings by interpreting them in local or target timezone
 * without off-by-one day shifts.
 */
export function parseDateSafe(dateStr: string, isEndOfDay = false): number {
  if (!dateStr) return 0;
  
  // If it's a date-only string like "2026-10-25"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Create Date using year, monthIndex (0-based), day
    const d = new Date(year, month - 1, day, isEndOfDay ? 23 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 59 : 0, isEndOfDay ? 999 : 0);
    return d.getTime();
  }
  
  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates whether an event is happening now, upcoming, or past based on current time.
 */
export function calculateEventStatus(event: Pick<ArtEvent, 'startDate' | 'endDate' | 'eventStatus'>, nowMs = Date.now()): EventStatus {
  if (event.eventStatus === 'cancelled') return 'cancelled';
  if (event.eventStatus === 'postponed') return 'postponed';

  const startMs = parseDateSafe(event.startDate, false);
  const endMs = event.endDate ? parseDateSafe(event.endDate, true) : parseDateSafe(event.startDate, true);

  if (!startMs) return 'upcoming';

  if (nowMs < startMs) {
    return 'upcoming';
  } else if (nowMs >= startMs && nowMs <= endMs) {
    return 'happening-now';
  } else {
    return 'past';
  }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats date range into unambiguous human readable string, e.g.:
 * "24 Oct – 21 Nov 2026" or "14–17 Jan 2027" or "28 Oct 2026"
 */
export function formatDateRange(startDateStr: string, endDateStr?: string, timeText?: string): string {
  if (!startDateStr) return timeText || 'Dates to be announced';

  const startParts = startDateStr.split('T')[0].split('-').map(Number);
  if (startParts.length !== 3) return startDateStr;
  const [sYear, sMonth, sDay] = startParts;
  const sMonthName = MONTH_NAMES[sMonth - 1];

  if (!endDateStr || endDateStr === startDateStr) {
    const base = `${sDay} ${sMonthName} ${sYear}`;
    return timeText ? `${base} • ${timeText}` : base;
  }

  const endParts = endDateStr.split('T')[0].split('-').map(Number);
  if (endParts.length !== 3) {
    return `${sDay} ${sMonthName} ${sYear} – ${endDateStr}`;
  }
  const [eYear, eMonth, eDay] = endParts;
  const eMonthName = MONTH_NAMES[eMonth - 1];

  let range = '';
  if (sYear === eYear && sMonth === eMonth) {
    range = `${sDay}–${eDay} ${sMonthName} ${sYear}`;
  } else if (sYear === eYear) {
    range = `${sDay} ${sMonthName} – ${eDay} ${eMonthName} ${sYear}`;
  } else {
    range = `${sDay} ${sMonthName} ${sYear} – ${eDay} ${eMonthName} ${eYear}`;
  }

  return timeText ? `${range} • ${timeText}` : range;
}
