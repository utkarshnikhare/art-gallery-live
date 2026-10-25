import { ArtEvent, EventCategory } from '../types';

export const VALID_CATEGORIES: EventCategory[] = [
  'exhibition',
  'gallery-show',
  'art-fair',
  'workshop',
  'artist-talk',
  'biennale',
  'open-studio',
  'other',
];

export function isValidUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.hostname.includes('example.com') || parsed.hostname === 'localhost' || parsed.hash === '#') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateArtEvent(event: unknown): ValidationResult {
  const errors: string[] = [];

  if (!event || typeof event !== 'object') {
    return { isValid: false, errors: ['Event record must be a valid JSON object'] };
  }

  const e = event as Partial<ArtEvent>;

  if (!e.id || typeof e.id !== 'string' || !e.id.trim()) {
    errors.push('Event ID is required');
  }

  if (!e.title || typeof e.title !== 'string' || !e.title.trim()) {
    errors.push('Event title is required');
  }

  if (!e.category || !VALID_CATEGORIES.includes(e.category as EventCategory)) {
    errors.push(`Invalid category: ${e.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (!e.startDate || !/^\d{4}-\d{2}-\d{2}/.test(e.startDate)) {
    errors.push(`Valid ISO startDate (YYYY-MM-DD...) is required. Received: ${e.startDate}`);
  }

  if (e.endDate && !/^\d{4}-\d{2}-\d{2}/.test(e.endDate)) {
    errors.push(`Invalid ISO endDate format: ${e.endDate}`);
  }

  if (e.startDate && e.endDate && e.endDate < e.startDate) {
    errors.push(`endDate (${e.endDate}) cannot be before startDate (${e.startDate})`);
  }

  if (!e.city || typeof e.city !== 'string' || !e.city.trim()) {
    errors.push('City is required');
  }

  if (!e.country || typeof e.country !== 'string' || !e.country.trim()) {
    errors.push('Country is required');
  }

  if (!e.officialUrl || !isValidUrl(e.officialUrl)) {
    errors.push(`A valid, safe official/source URL is required. Received: ${e.officialUrl}`);
  }

  if (e.bookingUrl && !isValidUrl(e.bookingUrl)) {
    errors.push(`Invalid booking URL: ${e.bookingUrl}`);
  }

  if (!e.sourceName || typeof e.sourceName !== 'string' || !e.sourceName.trim()) {
    errors.push('Source name is required');
  }

  if (e.sourceType !== 'official' && e.sourceType !== 'secondary') {
    errors.push(`sourceType must be 'official' or 'secondary'. Received: ${e.sourceType}`);
  }

  // Safety rule: Secondary sources cannot be marked official-checked
  if (e.sourceType === 'secondary' && e.verificationStatus === 'official-checked') {
    errors.push('Secondary listing cannot be marked official-checked');
  }

  if (!e.entryFee || typeof e.entryFee !== 'object') {
    errors.push('entryFee object is required');
  } else {
    const validFeeTypes = ['free', 'price', 'unknown', 'check-organiser'];
    if (!validFeeTypes.includes(e.entryFee.type)) {
      errors.push(`Invalid entryFee.type: ${e.entryFee.type}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
