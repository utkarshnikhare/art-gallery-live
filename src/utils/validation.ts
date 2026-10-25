import { 
  ArtEvent, 
  EventCategory, 
  ArtOpportunity, 
  OpportunityType, 
  InteriorDesignerProfile, 
  ArtworkSourcingItem 
} from '../types';

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

export const VALID_OPPORTUNITY_TYPES: OpportunityType[] = [
  'residency',
  'open-call',
  'grant',
  'award',
  'fellowship',
  'public-commission',
];

export function isValidUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.endsWith('#') || trimmed.includes('/#')) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Block placeholders and invalid URLs
    if (
      parsed.hostname.includes('example.com') ||
      parsed.hostname === 'localhost' ||
      parsed.pathname === '/fake' ||
      parsed.pathname === '/demo'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(email?: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Strict field-level verification and safety validator for Events
 */
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

  // Field-level verification requirement
  if (!Array.isArray(e.verifiedFields) || e.verifiedFields.length === 0) {
    errors.push('Field-level verification tracking (verifiedFields array) is required');
  } else {
    // Crucial fields must be verified
    const requiredFields = ['title', 'dates', 'venue'];
    for (const req of requiredFields) {
      if (!e.verifiedFields.includes(req)) {
        errors.push(`Critical field '${req}' has not been verified against the source announcement`);
      }
    }
  }

  if (!e.lastVerifiedAt || isNaN(new Date(e.lastVerifiedAt).getTime())) {
    errors.push('A valid lastVerifiedAt ISO timestamp is required');
  }

  // Strict entry fee rule: free cannot be assumed without organiser confirmation
  if (!e.entryFee || typeof e.entryFee !== 'object') {
    errors.push('entryFee object is required');
  } else {
    const validFeeTypes = ['free', 'price', 'unknown', 'check-organiser'];
    if (!validFeeTypes.includes(e.entryFee.type)) {
      errors.push(`Invalid entryFee.type: ${e.entryFee.type}`);
    }
    if (e.entryFee.type === 'free' && !e.entryFee.isConfirmedByOrganiser) {
      errors.push('Free admission cannot be claimed unless explicitly confirmed by organiser');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validator for Art Opportunities (Open Calls, Residencies, Grants)
 */
export function validateArtOpportunity(opp: unknown): ValidationResult {
  const errors: string[] = [];

  if (!opp || typeof opp !== 'object') {
    return { isValid: false, errors: ['Opportunity record must be a valid JSON object'] };
  }

  const o = opp as Partial<ArtOpportunity>;

  if (!o.id || typeof o.id !== 'string' || !o.id.trim()) {
    errors.push('Opportunity ID is required');
  }

  if (!o.title || typeof o.title !== 'string' || !o.title.trim()) {
    errors.push('Opportunity title is required');
  }

  if (!o.opportunityType || !VALID_OPPORTUNITY_TYPES.includes(o.opportunityType as OpportunityType)) {
    errors.push(`Invalid opportunityType: ${o.opportunityType}`);
  }

  if (!o.hostInstitution || typeof o.hostInstitution !== 'string' || !o.hostInstitution.trim()) {
    errors.push('Host institution / organiser is required');
  }

  if (!o.submissionDeadline || !/^\d{4}-\d{2}-\d{2}/.test(o.submissionDeadline)) {
    errors.push(`Valid ISO submissionDeadline (YYYY-MM-DD) is required. Received: ${o.submissionDeadline}`);
  }

  if (!o.officialGuidelinesUrl || !isValidUrl(o.officialGuidelinesUrl)) {
    errors.push(`Valid official guidelines URL is required. Received: ${o.officialGuidelinesUrl}`);
  }

  if (o.submissionUrl && !isValidUrl(o.submissionUrl)) {
    errors.push(`Invalid submission URL: ${o.submissionUrl}`);
  }

  if (!o.eligibilitySummary || typeof o.eligibilitySummary !== 'string') {
    errors.push('Eligibility summary is required');
  }

  if (!Array.isArray(o.verifiedFields) || o.verifiedFields.length === 0) {
    errors.push('verifiedFields tracking is required');
  }

  if (!o.lastVerifiedAt || isNaN(new Date(o.lastVerifiedAt).getTime())) {
    errors.push('Valid lastVerifiedAt timestamp is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validator for Interior Designers & Art Specifiers
 */
export function validateDesignerProfile(designer: unknown): ValidationResult {
  const errors: string[] = [];

  if (!designer || typeof designer !== 'object') {
    return { isValid: false, errors: ['Designer record must be a valid JSON object'] };
  }

  const d = designer as Partial<InteriorDesignerProfile>;

  if (!d.id || typeof d.id !== 'string' || !d.id.trim()) {
    errors.push('Designer ID is required');
  }

  if (!d.studioName || typeof d.studioName !== 'string' || !d.studioName.trim()) {
    errors.push('Studio name is required');
  }

  if (!d.city || !d.country) {
    errors.push('City and Country are required');
  }

  if (!d.officialWebsite || !isValidUrl(d.officialWebsite)) {
    errors.push(`Valid official website is required. Received: ${d.officialWebsite}`);
  }

  if (d.contactEmail && !isValidEmail(d.contactEmail)) {
    errors.push(`Invalid contact email format: ${d.contactEmail}`);
  }

  const validRoles = ['specifier', 'consultant', 'purchaser', 'advisory', 'buying-role-unconfirmed'];
  if (!d.artSourcingRole || !validRoles.includes(d.artSourcingRole)) {
    errors.push(`Invalid artSourcingRole: ${d.artSourcingRole}`);
  }

  if (!Array.isArray(d.projectTypes) || d.projectTypes.length === 0) {
    errors.push('At least one projectType is required');
  }

  if (!Array.isArray(d.verifiedFields) || d.verifiedFields.length === 0) {
    errors.push('verifiedFields tracking is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validator for Artwork Sourcing Items
 */
export function validateArtworkSourcing(art: unknown): ValidationResult {
  const errors: string[] = [];

  if (!art || typeof art !== 'object') {
    return { isValid: false, errors: ['Artwork record must be a valid JSON object'] };
  }

  const a = art as Partial<ArtworkSourcingItem>;

  if (!a.id || !a.title || !a.artist) {
    errors.push('Artwork ID, title, and artist are required');
  }

  if (!a.medium || typeof a.medium !== 'string') {
    errors.push('Medium is required');
  }

  if (!a.dimensionsCm || typeof a.dimensionsCm.height !== 'number' || typeof a.dimensionsCm.width !== 'number') {
    errors.push('dimensionsCm with numerical height and width is required');
  }

  if (!a.sourceUrl || !isValidUrl(a.sourceUrl)) {
    errors.push(`Valid source URL is required. Received: ${a.sourceUrl}`);
  }

  if (!a.imageUrl || !isValidUrl(a.imageUrl)) {
    errors.push(`Valid image URL is required. Received: ${a.imageUrl}`);
  }

  const validOrientations = ['horizontal', 'vertical', 'square'];
  if (!a.orientation || !validOrientations.includes(a.orientation)) {
    errors.push(`Invalid orientation: ${a.orientation}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
