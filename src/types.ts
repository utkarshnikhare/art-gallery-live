// ============================================================================
// MORROWKIND — ARTIST INTELLIGENCE PLATFORM & GLOBAL ART DISCOVERY TYPES
// ============================================================================

// ----------------------------------------------------------------------------
// 1. PUBLIC ART DISCOVERY TYPES (PRESERVED)
// ----------------------------------------------------------------------------

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
  startDate: string;
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
  verifiedFields: string[];
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
  regionCategory: string;
  category: string;
  timeRange: 'all' | 'happening-now' | 'upcoming';
  fee: 'all' | 'free' | 'price' | 'unknown';
  format: 'all' | 'in-person' | 'online' | 'hybrid';
  verificationLevel: 'all' | 'official-event-verified' | 'has-booking';
}

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
  submissionDeadline: string;
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
  dominantPalette: string[];
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
  suitableSpaces: string[];
  locationCity: string;
  locationCountry: string;
  verifiedFields: string[];
  lastVerifiedAt: string;
  imageUrl: string;
}

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

export interface OpportunityFilterState {
  searchQuery: string;
  opportunityType: string;
  deadlineStatus: string;
  fee: string;
  country: string;
}

export interface DesignerFilterState {
  searchQuery: string;
  country: string;
  city: string;
  projectType: string;
  sourcingRole: string;
}

export interface ArtworkFilterState {
  searchQuery: string;
  medium: string;
  style: string;
  orientation: string;
  scale: string;
  commissionOnly: boolean;
  suitableSpace: string;
}

// ----------------------------------------------------------------------------
// 2. ARTIST INTELLIGENCE WORKSPACE DOMAIN MODELS (MORROWKIND)
// ----------------------------------------------------------------------------

export type WorkspaceModuleId =
  | 'dashboard'
  | 'inventory'
  | 'sales'
  | 'collectors'
  | 'exhibitions'
  | 'pricing'
  | 'marketing'
  | 'certificates'
  | 'licensing'
  | 'catalog'
  | 'backup'
  | 'discovery';

export type ArtworkAvailability =
  | 'available'
  | 'reserved'
  | 'sold'
  | 'on-exhibition'
  | 'on-consignment'
  | 'archived'
  | 'destroyed';

export type ArtworkType = 'original' | 'limited-edition' | 'open-edition' | 'sculpture' | 'print' | 'digital';

export interface UserArtwork {
  id: string;
  title: string;
  artistName: string;
  yearCreated: number;
  medium: string;
  materials?: string;
  technique?: string;
  style?: string;
  dimensions: {
    height: number;
    width: number;
    depth?: number;
    unit: 'cm' | 'in';
  };
  orientation: ArtworkOrientation;
  artworkType: ArtworkType;
  editionNumber?: number;
  editionSize?: number;
  productionCost: number;
  listPrice: number;
  currency: string;
  availability: ArtworkAvailability;
  location: string;
  framingNotes?: string;
  conditionNotes?: string;
  provenanceNotes?: string;
  copyrightNotes?: string;
  tags: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type SalesChannel =
  | 'Direct to Collector'
  | 'Gallery Consignment'
  | 'Art Fair'
  | 'Online Marketplace'
  | 'Interior Designer / Architect'
  | 'Corporate Art Commission'
  | 'Auction'
  | 'Studio Sale'
  | 'Other';

export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Paid' | 'Refunded';

export interface SaleTransaction {
  id: string;
  artworkId: string;
  artworkTitle: string;
  saleDate: string; // ISO date YYYY-MM-DD
  buyerId?: string;
  buyerName: string;
  channel: SalesChannel;
  grossAmount: number;
  galleryCommissionRate: number; // percentage, e.g. 50
  galleryCommissionAmount: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  otherExpenses: number;
  netProceeds: number; // calculated: (gross - discount) - commission - otherExpenses
  amountReceived?: number; // Actual funds collected so far (for partial payments)
  balanceDue?: number; // Outstanding receivable: max(0, gross - discount - (amountReceived || 0))
  refundAmount?: number; // If paymentStatus === 'Refunded', amount returned to buyer
  currency: string;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  exhibitionId?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface CollectorContact {
  id: string;
  name: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: string;
  city: string;
  country: string;
  preferredCurrency: string;
  artworkInterests: string[];
  totalPurchasedCount: number;
  totalSpentAmount: number;
  relationshipNotes?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  consentRecorded: boolean;
  createdAt: string;
}

export interface ArtistExhibitionRecord {
  id: string;
  title: string;
  organiser: string;
  venueName: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  applicationDeadline?: string;
  // Expense items
  applicationFee: number;
  participationFee: number;
  transportInsuranceCost: number;
  framingInstallationCost: number;
  travelAccommodationCost: number;
  marketingCost: number;
  totalExpenses: number; // Sum of all costs
  // Artworks and outcomes
  artworksSubmittedCount: number;
  attributedSalesGross: number;
  attributedSalesNet: number;
  netProfit: number; // attributedSalesNet - totalExpenses
  roiPercentage: number; // (netProfit / totalExpenses) * 100
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface MarketingCampaign {
  id: string;
  campaignName: string;
  objective: string;
  artworkPromoted?: string;
  platform: 'Instagram' | 'Newsletter' | 'Website' | 'Art Fair Print' | 'Facebook' | 'LinkedIn' | 'Other';
  startDate: string;
  endDate?: string;
  isDataConnected: boolean; // false = manual entry, true = verified API connection
  reachOrImpressions: number;
  clicksOrInquiries: number;
  adSpend: number;
  attributedSalesRevenue: number;
  currency: string;
  notes?: string;
}

export type VerificationStatusType =
  | 'PAYLOAD_INTEGRITY_VERIFIED'
  | 'SIGNATURE_VALID_ISSUER_UNVERIFIED'
  | 'SIGNATURE_VALID_ISSUER_VERIFIED'
  | 'SIGNATURE_INVALID'
  | 'PAYLOAD_TAMPERED'
  | 'CERTIFICATE_REVOKED'
  | 'CERTIFICATE_SUPERSEDED'
  | 'STATUS_UNAVAILABLE';

export interface VerificationOutcome {
  isValid: boolean;
  status: VerificationStatusType;
  statusMessage: string;
  isHashValid: boolean;
  isSignatureVerified: boolean;
  issuerIdentityType: 'self-issued-unverified' | 'independent-verified' | 'unknown';
  isOfflineProof: boolean;
  cert?: DigitalCertificate;
  offlineRevocationNotice?: string;
  legalDisclaimer?: string;
  keyRecoveryNotice?: string;
  error?: string;
}

export interface PortableProofPayload {
  v: string; // Schema version, e.g. '2.0'
  id: string; // Certificate ID
  t: string; // Artwork Title
  a: string; // Artist Name
  y: number; // Year Created
  m: string; // Medium
  d: string; // Dimensions
  e: string; // Edition
  dt: string; // Issue Date
  iss: string; // Issuer
  h: string; // Canonical SHA-256 Fingerprint
  sig?: string; // Base64 ECDSA P-256 signature
  pk?: any; // Public key JWK
  st: 'valid' | 'revoked' | 'superseded';
  rr?: string; // Revocation Reason
}

export interface DigitalCertificate {
  schemaVersion?: string; // '2.0'
  certificateId: string; // e.g. MK-COA-2026-7842
  artworkId: string;
  artworkTitle: string;
  artistName: string;
  yearCreated: number;
  medium: string;
  dimensionsText: string;
  editionText: string;
  issueDate: string;
  issuer: string;
  sha256Fingerprint: string; // Cryptographic SHA-256 hash of title, artist, year, medium, dimensions
  ecdsaSignature?: string; // Asymmetric digital signature over SHA-256 hash
  publicKeyJwk?: any; // Public key JWK for third-party verification
  proofToken?: string; // Self-contained portable URL proof token
  issuerIdentityStatus?: 'self-issued-unverified' | 'independent-verified';
  verificationUrl: string;
  status: 'valid' | 'revoked' | 'superseded';
  revokedAt?: string;
  revocationReason?: string;
  supersededByCertificateId?: string;
  legalNotice?: string;
  blockchainAnchor: {
    isAnchored: boolean;
    network?: string; // e.g. 'Polygon Amoy Testnet'
    transactionHash?: string;
    blockNumber?: number;
    contractAddress?: string;
    note: string; // Transparent declaration that anchor is distinct from legal title
  };
}

export interface LicensingAgreement {
  id: string;
  artworkId: string;
  artworkTitle: string;
  licenseeName: string;
  licenseType: 'Commercial Merchandise' | 'Book / Editorial Cover' | 'Film / Set Placement' | 'Digital Asset' | 'Corporate Branding';
  permittedTerritory: string;
  isExclusive: boolean;
  startDate: string;
  endDate: string;
  licenseFee: number;
  royaltyPercentage?: number;
  currency: string;
  paymentStatus: 'Paid' | 'Pending' | 'Due';
  renewalReminderDate?: string;
  rightsNotes?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'RESTORE' | 'ISSUE_CERTIFICATE';
  entityType: 'ARTWORK' | 'SALE' | 'COLLECTOR' | 'EXHIBITION' | 'CERTIFICATE' | 'LICENSING' | 'SETTINGS';
  entityId: string;
  summary: string;
  actor: string;
}

export interface ArtistProfileSettings {
  artistName: string;
  studioName?: string;
  email: string;
  website?: string;
  country: string;
  baseCurrency: string; // 'USD' | 'EUR' | 'GBP' | 'INR'
  measurementUnit: 'cm' | 'in';
  hourlyRate: number; // For pricing calculator
  defaultMarkupPercent: number; // e.g. 100% or 50% gallery split
  vaultProtected: boolean;
  vaultPasscodeHash?: string;
  vaultPassphraseSalt?: string;
  encryptionAtRest?: boolean;
  sessionVaultLock?: boolean; // When true, workspace locks upon reload or inactivity
  exchangeRates?: Record<string, number>; // Currency conversion rates relative to USD (USD=1.0)
  studioPublicKeyJwk?: any;
  studioPrivateKeyJwk?: any;
  supabaseConfig?: {
    configured: boolean;
    url?: string;
    note: string;
  };
}

export interface WorkspaceTenant {
  id: string; // e.g. 'ws-primary', 'ws-prints'
  name: string; // e.g. 'Fine Art Originals', 'Limited Editions Studio'
  createdAt: string;
}

export interface ReportEventChangePayload {
  eventId: string;
  eventTitle: string;
  reportedChange: 'cancelled' | 'postponed' | 'dates-changed' | 'fee-changed' | 'sold-out';
  details: string;
  submittedAt: string;
}

export interface EncryptedStoragePayload {
  version: '2.0.0';
  encrypted: true;
  algorithm: 'AES-GCM-256';
  iterations: number;
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
}

export interface ArtistWorkspaceState {
  profile: ArtistProfileSettings;
  inventory: UserArtwork[];
  sales: SaleTransaction[];
  collectors: CollectorContact[];
  exhibitions: ArtistExhibitionRecord[];
  campaigns: MarketingCampaign[];
  certificates: DigitalCertificate[];
  licensing: LicensingAgreement[];
  auditLogs: AuditLogEntry[];
}
