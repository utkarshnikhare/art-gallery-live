import { ArtEvent, FilterState } from '../types';
import { calculateEventStatus, parseDateSafe } from './dateUtils';

export const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  regionCategory: 'all',
  category: 'all',
  timeRange: 'all',
  fee: 'all',
  format: 'all',
};

/**
 * Filter events using strict AND logic across all active filter fields.
 */
export function filterEvents(events: ArtEvent[], filters: FilterState, nowMs = Date.now()): ArtEvent[] {
  return events.filter(event => {
    // 1. Search Query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const match =
        (event.title && event.title.toLowerCase().includes(q)) ||
        (event.organiser && event.organiser.toLowerCase().includes(q)) ||
        (event.venueName && event.venueName.toLowerCase().includes(q)) ||
        (event.city && event.city.toLowerCase().includes(q)) ||
        (event.description && event.description.toLowerCase().includes(q)) ||
        (event.sourceName && event.sourceName.toLowerCase().includes(q));

      if (!match) return false;
    }

    // 2. Region / Geography
    if (filters.regionCategory !== 'all') {
      const city = (event.city || '').toLowerCase();
      const region = (event.region || '').toLowerCase();
      const country = (event.country || '').toLowerCase();

      if (filters.regionCategory === 'pune') {
        const isPune = city.includes('pune') || city.includes('pcmc') || city.includes('pimpri') || city.includes('chinchwad');
        if (!isPune) return false;
      } else if (filters.regionCategory === 'mumbai') {
        const isMumbai = city.includes('mumbai') || city.includes('navi mumbai') || city.includes('thane');
        if (!isMumbai) return false;
      } else if (filters.regionCategory === 'maharashtra') {
        const isMh = region.includes('maharashtra') || city.includes('pune') || city.includes('mumbai') || city.includes('nagpur');
        if (!isMh) return false;
      } else if (filters.regionCategory === 'india') {
        const isIndia = country.includes('india');
        if (!isIndia) return false;
      } else if (filters.regionCategory === 'international') {
        const isIntl = country && !country.includes('india');
        if (!isIntl) return false;
      } else if (filters.regionCategory === 'online') {
        if (event.format !== 'online' && event.format !== 'hybrid') return false;
      }
    }

    // 3. Category
    if (filters.category !== 'all') {
      if (event.category !== filters.category) return false;
    }

    // 4. Time Range
    const status = calculateEventStatus(event, nowMs);
    if (filters.timeRange === 'happening-now') {
      if (status !== 'happening-now') return false;
    } else if (filters.timeRange === 'upcoming') {
      if (status !== 'upcoming') return false;
    }

    // Exclude past events from default view (unless specifically requested or status is ongoing/upcoming)
    if (status === 'past') {
      return false;
    }

    // 5. Entry Fee
    if (filters.fee !== 'all') {
      if (filters.fee === 'free' && event.entryFee.type !== 'free') return false;
      if (filters.fee === 'price' && event.entryFee.type !== 'price') return false;
      if (filters.fee === 'unknown' && event.entryFee.type !== 'unknown' && event.entryFee.type !== 'check-organiser') return false;
    }

    // 6. Format
    if (filters.format !== 'all') {
      if (event.format !== filters.format) return false;
    }

    return true;
  });
}

/**
 * Sort events:
 * 1. Happening now first
 * 2. Upcoming events sorted by earliest start date
 */
export function sortEvents(events: ArtEvent[], nowMs = Date.now()): ArtEvent[] {
  return [...events].sort((a, b) => {
    const statusA = calculateEventStatus(a, nowMs);
    const statusB = calculateEventStatus(b, nowMs);

    const rank = (status: string) => {
      if (status === 'happening-now') return 1;
      if (status === 'upcoming') return 2;
      return 3;
    };

    const rankDiff = rank(statusA) - rank(statusB);
    if (rankDiff !== 0) return rankDiff;

    const startA = parseDateSafe(a.startDate);
    const startB = parseDateSafe(b.startDate);

    return startA - startB;
  });
}
