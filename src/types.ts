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
}

export type SourceType = 'official' | 'secondary';

export type VerificationStatus = 
  | 'official-checked'
  | 'secondary-only'
  | 'needs-recheck'
  | 'date-unconfirmed';

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
  lastCheckedAt: string;
  firstSeenAt?: string;
  lastUpdatedAt: string;
  organiser?: string;
  imageUrl?: string;
  eventStatus: EventStatus;
  registrationDeadline?: string;
}

export interface DatasetMetadata {
  appName: string;
  version: string;
  lastSuccessfullyUpdated: string;
  totalEvents: number;
  currentEvents: number;
  upcomingEvents: number;
  sourcesCount: number;
  coverageNotice: string;
  disclaimer: string;
}

export interface EventDataset {
  metadata: DatasetMetadata;
  events: ArtEvent[];
}

export interface RegisteredSource {
  id: string;
  name: string;
  officialUrl: string;
  sourceType: SourceType;
  city: string;
  region: string;
  country: string;
  categories: EventCategory[];
  collectionMethod: 'manual-curation' | 'structured-data' | 'html-parser' | 'rss-atom' | 'calendar-ics';
  parsingTested: boolean;
  lastCheckedTime: string;
  knownLimitations: string;
  refreshFrequency: string;
}

export interface FilterState {
  searchQuery: string;
  regionCategory: string; // 'all' | 'pune' | 'mumbai' | 'maharashtra' | 'india' | 'international' | 'online'
  category: string; // 'all' | EventCategory
  timeRange: 'all' | 'happening-now' | 'upcoming';
  fee: 'all' | 'free' | 'price' | 'unknown';
  format: 'all' | 'in-person' | 'online' | 'hybrid';
}
