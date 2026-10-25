export type EventCategory = 
  | 'exhibition'
  | 'gallery-show'
  | 'art-fair'
  | 'workshop'
  | 'artist-talk'
  | 'biennale'
  | 'open-studio'
  | 'other';

export type EventFormat = 'in-person' | 'online' | 'hybrid' | 'unknown';

export type EntryFeeType = 'free' | 'price' | 'unknown' | 'check-organiser';

export interface EntryFee {
  type: EntryFeeType;
  amountText?: string;
  currency?: string;
  isConfirmedByOrganiser: boolean;
}

export type SourceType = 
  | 'official-institution'
  | 'organiser-portal'
  | 'curated-announcement'
  | 'official'
  | 'secondary';

export type VerificationStatus = 
  | 'official-event-verified'
  | 'organiser-confirmed'
  | 'official-checked'
  | 'secondary-only'
  | 'needs-recheck'
  | 'date-unconfirmed';

export type DataFreshness = 'fresh' | 'stale' | 'unverified';

export type EventStatus = 
  | 'happening-now'
  | 'upcoming'
  | 'past'
  | 'cancelled'
  | 'postponed';

export interface ArtEvent {
  id: string;
  title: string;
  category: EventCategory;
  description?: string;
  startDate: string; // ISO YYYY-MM-DD or ISO 8601 string
  endDate?: string;
  timezone?: string;
  timeText?: string;
  venueName?: string;
  address?: string;
  city: string;
  region: string;
  country: string;
  format: EventFormat;
  entryFee: EntryFee;
  bookingUrl?: string;
  officialUrl: string;
  sourceName: string;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  verifiedFields: string[]; // e.g. ['title', 'dates', 'venue', 'admissionFee', 'format']
  lastCheckedAt: string;
  lastVerifiedAt: string;
  firstSeenAt?: string;
  lastUpdatedAt: string;
  dataFreshness: DataFreshness;
  organiser?: string;
  imageUrl?: string;
  eventStatus: EventStatus;
  registrationDeadline?: string;
  changeLog?: string[];
}

export type SourceHealthStatus = 'healthy' | 'degraded' | 'failing';

export interface SourceHealth {
  id: string;
  name: string;
  officialUrl: string;
  sourceType: SourceType;
  city: string;
  region: string;
  country: string;
  categories: EventCategory[];
  collectionMethod: 'structured-data' | 'html-parser' | 'calendar-ics' | 'manual-curation' | 'rss-atom';
  parsingTested: boolean;
  healthStatus: SourceHealthStatus;
  lastCheckedTime: string;
  lastSuccessTime: string;
  consecutiveFailures: number;
  httpStatus?: number;
  knownLimitations: string;
  refreshFrequency: string;
}

export type RegisteredSource = SourceHealth;

export interface DatasetMetadata {
  appName: string;
  version: string;
  lastSuccessfullyUpdated: string;
  totalEvents: number;
  currentEvents: number;
  upcomingEvents: number;
  sourcesCount: number;
  healthySourcesCount: number;
  coverageNotice: string;
  disclaimer: string;
  freshnessWarning?: string;
}

export interface ReviewQueueItem {
  id: string;
  provisionalTitle: string;
  institutionName: string;
  sourceUrl: string;
  flagReason: string;
  checkedAt: string;
  status: 'pending-investigation' | 'rejected' | 'insufficient-evidence';
}

export interface EventDataset {
  metadata: DatasetMetadata;
  events: ArtEvent[];
  sourcesHealth?: SourceHealth[];
}

export interface FilterState {
  searchQuery: string;
  regionCategory: string; // 'all' | 'pune' | 'mumbai' | 'maharashtra' | 'india' | 'international' | 'online'
  category: string; // 'all' | EventCategory
  timeRange: 'all' | 'happening-now' | 'upcoming';
  fee: 'all' | 'free' | 'price' | 'unknown';
  format: 'all' | 'in-person' | 'online' | 'hybrid';
  verificationLevel: 'all' | 'official-event-verified' | 'has-booking';
}

// ==========================================
// NEW MODULE: ART OPPORTUNITIES & OPEN CALLS
// ==========================================

export type OpportunityType = 
  | 'residency'
  | 'open-call'
  | 'grant'
  | 'award'
  | 'fellowship'
  | 'public-commission';

export type OpportunityDeadlineStatus = 'open' | 'closing-soon' | 'closed';

export interface ArtOpportunity {
  id: string;
  title: string;
  opportunityType: OpportunityType;
  organiser: string;
  hostInstitution: string;
  city: string;
  country: string;
  format: EventFormat;
  description: string;
  submissionDeadline: string; // ISO YYYY-MM-DD
  deadlineStatus: OpportunityDeadlineStatus;
  entryFee: EntryFee;
  stipendOrAwardText?: string;
  eligibilitySummary: string;
  officialGuidelinesUrl: string;
  submissionUrl?: string;
  sourceName: string;
  verifiedFields: string[];
  lastVerifiedAt: string;
}

export interface OpportunitiesDataset {
  metadata: {
    lastSuccessfullyUpdated: string;
    totalOpportunities: number;
    openCount: number;
    coverageNotice: string;
  };
  opportunities: ArtOpportunity[];
}

export interface OpportunityFilterState {
  searchQuery: string;
  opportunityType: string; // 'all' | OpportunityType
  deadlineStatus: string; // 'all' | 'open' | 'closing-soon'
  fee: string; // 'all' | 'free' | 'price'
  country: string; // 'all' | 'India' | 'International'
}

// ==============================================================
// NEW MODULE: INTERIOR DESIGNERS & ART BUYERS / SPECIFIERS
// ==============================================================

export type ArtSourcingRole = 
  | 'specifier'
  | 'consultant'
  | 'purchaser'
  | 'advisory'
  | 'buying-role-unconfirmed';

export type ProjectType = 
  | 'residential'
  | 'hospitality'
  | 'commercial'
  | 'public-space'
  | 'cultural';

export interface InteriorDesignerProfile {
  id: string;
  studioName: string;
  principalName?: string;
  city: string;
  state?: string;
  country: string;
  address?: string;
  officialWebsite: string;
  contactEmail?: string;
  contactPhone?: string;
  inquiryPortalUrl?: string;
  specialisations: string[];
  projectTypes: ProjectType[];
  artSourcingRole: ArtSourcingRole;
  verifiedPortfolioProjects: string[];
  verificationStatus: 'studio-verified' | 'curated-directory';
  verifiedFields: string[];
  lastVerifiedAt: string;
}

export interface DesignersDataset {
  metadata: {
    lastSuccessfullyUpdated: string;
    totalStudios: number;
    coverageNotice: string;
  };
  designers: InteriorDesignerProfile[];
}

export interface DesignerFilterState {
  searchQuery: string;
  country: string; // 'all' | 'India' | 'International' | 'UK' | 'USA'
  city: string; // 'all' | string
  projectType: string; // 'all' | ProjectType
  sourcingRole: string; // 'all' | ArtSourcingRole
}

// ==========================================
// NEW MODULE: ARTWORK SOURCING FOR INTERIORS
// ==========================================

export type ArtworkOrientation = 'horizontal' | 'vertical' | 'square';

export type FramingStatus = 'Framed' | 'Unframed' | 'Stretched Canvas' | 'Custom Framing Available';

export interface ArtworkSourcingItem {
  id: string;
  title: string;
  artist: string;
  galleryOrSource: string;
  sourceUrl: string;
  medium: string;
  style: string;
  dominantPalette: string[]; // e.g. ['Warm Ochre', 'Raw Linen', 'Deep Charcoal']
  dimensionsCm: {
    height: number;
    width: number;
    depth?: number;
  };
  dimensionsText: string;
  orientation: ArtworkOrientation;
  framing: FramingStatus;
  customCommissionAvailable: boolean;
  priceType: 'fixed' | 'price-on-request' | 'range';
  priceAmount?: number;
  currency?: string;
  suitableSpaces: string[]; // e.g. ['Hotel Lobby', 'Living Room', 'Executive Boardroom']
  locationCity: string;
  locationCountry: string;
  verifiedFields: string[];
  lastVerifiedAt: string;
  imageUrl: string;
}

export interface ArtworksDataset {
  metadata: {
    lastSuccessfullyUpdated: string;
    totalArtworks: number;
    coverageNotice: string;
  };
  artworks: ArtworkSourcingItem[];
}

export interface ArtworkFilterState {
  searchQuery: string;
  medium: string; // 'all' | string
  style: string; // 'all' | string
  orientation: string; // 'all' | ArtworkOrientation
  scale: string; // 'all' | 'large' (>=120cm) | 'medium' (60-120cm) | 'small' (<60cm)
  commissionOnly: boolean;
  suitableSpace: string; // 'all' | string
}

// ==========================================
// ART ENQUIRY WORKFLOW MODEL
// ==========================================

export interface ArtEnquiryPayload {
  specifierName: string;
  firmName?: string;
  contactEmail: string;
  contactPhone?: string;
  projectType: string;
  targetSpace: string;
  dimensionsRequired?: string;
  budgetRange?: string;
  timeline?: string;
  isCustomCommission: boolean;
  notes?: string;
  targetItemTitle?: string;
  targetArtistOrStudio?: string;
  recipientEmail?: string;
  recipientName?: string;
}

export type ActiveAppTab = 'events' | 'opportunities' | 'designers' | 'artworks';
