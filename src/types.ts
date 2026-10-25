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
