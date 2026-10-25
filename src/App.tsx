import React, { useEffect, useState, useMemo } from 'react';
import { 
  ArtEvent, 
  EventDataset, 
  FilterState, 
  RegisteredSource, 
  ActiveAppTab,
  ArtOpportunity,
  InteriorDesignerProfile,
  ArtworkSourcingItem,
  WorkspaceModuleId,
  ArtistWorkspaceState,
  UserArtwork,
  SaleTransaction,
  CollectorContact,
  ArtistExhibitionRecord,
  MarketingCampaign,
  DigitalCertificate,
  LicensingAgreement,
  ArtistProfileSettings,
  WorkspaceTenant
} from './types';
import { DEFAULT_FILTERS, filterEvents, sortEvents } from './utils/filterUtils';
import { StorageService } from './services/storageService';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { EventCard } from './components/EventCard';
import { EventModal } from './components/EventModal';
import { SourceDirectoryModal } from './components/SourceDirectoryModal';
import { AboutModal } from './components/AboutModal';
import { OpportunitiesView } from './components/OpportunitiesView';
import { DesignersView } from './components/DesignersView';
import { ArtworkSourcingView } from './components/ArtworkSourcingView';
import { EnquiryModal } from './components/EnquiryModal';
import { PublicVerificationModal } from './components/PublicVerificationModal';

// Workspace Views
import { WorkspaceHeader } from './components/workspace/WorkspaceHeader';
import { DashboardView } from './components/workspace/DashboardView';
import { InventoryView } from './components/workspace/InventoryView';
import { SalesView } from './components/workspace/SalesView';
import { CollectorsView } from './components/workspace/CollectorsView';
import { ExhibitionsView } from './components/workspace/ExhibitionsView';
import { PricingView } from './components/workspace/PricingView';
import { CertificatesView } from './components/workspace/CertificatesView';
import { LicensingView } from './components/workspace/LicensingView';
import { MarketingView } from './components/workspace/MarketingView';
import { CatalogView } from './components/workspace/CatalogView';
import { BackupSettingsView } from './components/workspace/BackupSettingsView';

export const App: React.FC = () => {
  // Mode: Public Discovery vs Artist Intelligence Workspace
  const [platformMode, setPlatformMode] = useState<'workspace' | 'discovery'>('workspace');
  
  // Public Discovery state
  const [activeDiscoveryTab, setActiveDiscoveryTab] = useState<ActiveAppTab>('events');
  const [dataset, setDataset] = useState<EventDataset | null>(null);
  const [sources, setSources] = useState<RegisteredSource[]>([]);
  const [opportunities, setOpportunities] = useState<ArtOpportunity[]>([]);
  const [designers, setDesigners] = useState<InteriorDesignerProfile[]>([]);
  const [artworks, setArtworks] = useState<ArtworkSourcingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedEvent, setSelectedEvent] = useState<ArtEvent | null>(null);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  // Multi-Tenant Private Workspace State & Session Security
  const [activeTenantId, setActiveTenantId] = useState<string>('default');
  const [tenants] = useState<WorkspaceTenant[]>([
    { id: 'default', name: 'Fine Art Studio', createdAt: '2026-01-01' },
    { id: 'prints', name: 'Limited Editions & Multiples', createdAt: '2026-01-01' },
  ]);
  const [workspaceState, setWorkspaceState] = useState<ArtistWorkspaceState>(() => StorageService.loadWorkspace('default'));
  const [activeWorkspaceModule, setActiveWorkspaceModule] = useState<WorkspaceModuleId>('dashboard');
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(false);
  const [unlockPasscode, setUnlockPasscode] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string>('');

  const isEncryptedAtRest = useMemo(() => {
    return StorageService.isStorageEncryptedAtRest(activeTenantId);
  }, [activeTenantId, isVaultLocked]);

  const handleSwitchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
    if (StorageService.isStorageEncryptedAtRest(tenantId)) {
      setIsVaultLocked(true);
      setWorkspaceState(StorageService.loadWorkspace(tenantId));
    } else {
      const loaded = StorageService.loadWorkspace(tenantId);
      setWorkspaceState(loaded);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');

    // If storage is encrypted at rest, decrypt ciphertext with passphrase
    if (StorageService.isStorageEncryptedAtRest(activeTenantId)) {
      if (!unlockPasscode) {
        setUnlockError('Master passphrase cannot be blank.');
        return;
      }
      const res = await StorageService.loadWorkspaceEncrypted(unlockPasscode, activeTenantId);
      if (res.success && res.state) {
        setWorkspaceState(res.state);
        setIsVaultLocked(false);
        setUnlockPasscode('');
        return;
      } else {
        setUnlockError(res.error || 'Decryption failed: Incorrect passphrase or corrupted ciphertext.');
        return;
      }
    }

    // Unencrypted mode: UI visual privacy curtain (shoulder-surfing guard)
    const configuredPasscode = workspaceState.profile.vaultPasscodeHash;
    const verification = StorageService.verifyVaultPrivacyPasscode(unlockPasscode, configuredPasscode);

    if (verification.valid) {
      setIsVaultLocked(false);
      setUnlockPasscode('');
      setUnlockError('');
    } else {
      setUnlockError(verification.error || 'Access denied.');
    }
  };

  // Verification & Enquiry Modals
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyInitialCertId, setVerifyInitialCertId] = useState('');
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquiryInitialItem, setEnquiryInitialItem] = useState<{
    type: 'artwork' | 'designer';
    title: string;
    targetName: string;
    contactEmail?: string;
    inquiryUrl?: string;
  } | null>(null);

  const baseUrl = import.meta.env.BASE_URL || '/';

  // Check URL query parameters for ?verify=MK-COA-XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify');
    if (verifyParam) {
      setVerifyInitialCertId(verifyParam);
      setIsVerifyModalOpen(true);
    }
  }, []);

  const loadDiscoveryData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const cleanBase = baseUrl.replace(/\/$/, '');

      // Load validated events
      const eventsUrl = `${cleanBase}/data/events.json`;
      const res = await fetch(eventsUrl);
      if (res.ok) {
        const data: EventDataset = await res.json();
        setDataset(data);
      }

      // Load sources
      const sourcesUrl = `${cleanBase}/data/sources.json`;
      const sRes = await fetch(sourcesUrl);
      if (sRes.ok) {
        const sData = await sRes.json();
        setSources(sData.sources || []);
      }

      // Load opportunities
      const oppsUrl = `${cleanBase}/data/opportunities.json`;
      const oppsRes = await fetch(oppsUrl);
      if (oppsRes.ok) {
        const oppsData = await oppsRes.json();
        setOpportunities(oppsData.opportunities || []);
      }

      // Load designers
      const desUrl = `${cleanBase}/data/designers.json`;
      const desRes = await fetch(desUrl);
      if (desRes.ok) {
        const desData = await desRes.json();
        setDesigners(desData.designers || []);
      }

      // Load architectural artworks
      const artUrl = `${cleanBase}/data/artworks.json`;
      const artRes = await fetch(artUrl);
      if (artRes.ok) {
        const artData = await artRes.json();
        setArtworks(artData.artworks || []);
      }
    } catch (err: any) {
      console.error('Error fetching discovery data:', err);
      setLoadError(err.message || 'Unable to load discovery directory files.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiscoveryData();
  }, []);

  // Save workspace state on change
  const updateWorkspace = (updater: (prev: ArtistWorkspaceState) => ArtistWorkspaceState) => {
    setWorkspaceState((prev) => {
      const next = updater(prev);
      StorageService.saveWorkspace(next, activeTenantId);
      return next;
    });
  };

  // Workspace CRUD handlers
  const handleSaveArtwork = (artwork: UserArtwork) => {
    updateWorkspace((prev) => {
      const exists = prev.inventory.some((a) => a.id === artwork.id);
      const nextInventory = exists
        ? prev.inventory.map((a) => (a.id === artwork.id ? artwork : a))
        : [artwork, ...prev.inventory];
      return StorageService.addAuditLog(
        { ...prev, inventory: nextInventory },
        exists ? 'UPDATE' : 'CREATE',
        'ARTWORK',
        artwork.id,
        `${exists ? 'Updated' : 'Created'} artwork: "${artwork.title}"`
      );
    });
  };

  const handleDeleteArtwork = (id: string) => {
    updateWorkspace((prev) => {
      const art = prev.inventory.find((a) => a.id === id);
      const nextInventory = prev.inventory.filter((a) => a.id !== id);
      return StorageService.addAuditLog(
        { ...prev, inventory: nextInventory },
        'DELETE',
        'ARTWORK',
        id,
        `Deleted artwork: "${art?.title || id}"`
      );
    });
  };

  const handleBulkImportArtworks = (imported: UserArtwork[]) => {
    updateWorkspace((prev) => {
      const nextInventory = [...imported, ...prev.inventory];
      return StorageService.addAuditLog(
        { ...prev, inventory: nextInventory },
        'IMPORT',
        'ARTWORK',
        `batch-${Date.now()}`,
        `Imported ${imported.length} artworks via CSV migration`
      );
    });
  };

  const handleRecordSale = (sale: SaleTransaction) => {
    updateWorkspace((prev) => {
      // Mark artwork as sold if it exists in inventory
      const nextInventory = prev.inventory.map((a) =>
        a.id === sale.artworkId || a.title.toLowerCase() === sale.artworkTitle.toLowerCase()
          ? { ...a, availability: 'sold' as const }
          : a
      );
      const nextSales = [sale, ...prev.sales];
      return StorageService.addAuditLog(
        { ...prev, inventory: nextInventory, sales: nextSales },
        'CREATE',
        'SALE',
        sale.id,
        `Recorded sale of "${sale.artworkTitle}" for ${sale.currency} ${sale.grossAmount} (Net: ${sale.netProceeds})`
      );
    });
  };

  const handleDeleteSale = (id: string) => {
    updateWorkspace((prev) => {
      const nextSales = prev.sales.filter((s) => s.id !== id);
      return StorageService.addAuditLog(
        { ...prev, sales: nextSales },
        'DELETE',
        'SALE',
        id,
        `Deleted sales transaction: ${id}`
      );
    });
  };

  const handleSaveCollector = (collector: CollectorContact) => {
    updateWorkspace((prev) => {
      const exists = prev.collectors.some((c) => c.id === collector.id);
      const nextCollectors = exists
        ? prev.collectors.map((c) => (c.id === collector.id ? collector : c))
        : [collector, ...prev.collectors];
      return StorageService.addAuditLog(
        { ...prev, collectors: nextCollectors },
        exists ? 'UPDATE' : 'CREATE',
        'COLLECTOR',
        collector.id,
        `${exists ? 'Updated' : 'Added'} collector contact: "${collector.name}"`
      );
    });
  };

  const handleDeleteCollector = (id: string) => {
    updateWorkspace((prev) => {
      const nextCollectors = prev.collectors.filter((c) => c.id !== id);
      return StorageService.addAuditLog(
        { ...prev, collectors: nextCollectors },
        'DELETE',
        'COLLECTOR',
        id,
        `Deleted collector contact: ${id}`
      );
    });
  };

  const handleSaveExhibition = (exhibition: ArtistExhibitionRecord) => {
    updateWorkspace((prev) => {
      const exists = prev.exhibitions.some((e) => e.id === exhibition.id);
      const nextExhibitions = exists
        ? prev.exhibitions.map((e) => (e.id === exhibition.id ? exhibition : e))
        : [exhibition, ...prev.exhibitions];
      return StorageService.addAuditLog(
        { ...prev, exhibitions: nextExhibitions },
        exists ? 'UPDATE' : 'CREATE',
        'EXHIBITION',
        exhibition.id,
        `${exists ? 'Updated' : 'Recorded'} exhibition: "${exhibition.title}" (ROI: ${exhibition.roiPercentage}%)`
      );
    });
  };

  const handleDeleteExhibition = (id: string) => {
    updateWorkspace((prev) => {
      const nextExhibitions = prev.exhibitions.filter((e) => e.id !== id);
      return StorageService.addAuditLog(
        { ...prev, exhibitions: nextExhibitions },
        'DELETE',
        'EXHIBITION',
        id,
        `Deleted exhibition record: ${id}`
      );
    });
  };

  const handleIssueCertificate = (cert: DigitalCertificate) => {
    updateWorkspace((prev) => {
      const nextCerts = [cert, ...prev.certificates];
      return StorageService.addAuditLog(
        { ...prev, certificates: nextCerts },
        'ISSUE_CERTIFICATE',
        'CERTIFICATE',
        cert.certificateId,
        `Issued COA ${cert.certificateId} for "${cert.artworkTitle}" with SHA-256 fingerprint`
      );
    });
  };

  const handleRevokeCertificate = (certificateId: string, reason: string = 'Revoked by artist') => {
    updateWorkspace((prev) => {
      const nextCerts = prev.certificates.map((c) =>
        c.certificateId === certificateId
          ? {
              ...c,
              status: 'revoked' as const,
              revocationReason: reason,
              revokedAt: new Date().toISOString(),
            }
          : c
      );
      return StorageService.addAuditLog(
        { ...prev, certificates: nextCerts },
        'UPDATE',
        'CERTIFICATE',
        certificateId,
        `Revoked certificate ${certificateId}: ${reason}`
      );
    });
  };

  const handleSaveLicensing = (agreement: LicensingAgreement) => {
    updateWorkspace((prev) => {
      const exists = prev.licensing.some((l) => l.id === agreement.id);
      const nextLicensing = exists
        ? prev.licensing.map((l) => (l.id === agreement.id ? agreement : l))
        : [agreement, ...prev.licensing];
      return StorageService.addAuditLog(
        { ...prev, licensing: nextLicensing },
        exists ? 'UPDATE' : 'CREATE',
        'LICENSING',
        agreement.id,
        `${exists ? 'Updated' : 'Created'} licensing agreement with "${agreement.licenseeName}"`
      );
    });
  };

  const handleDeleteLicensing = (id: string) => {
    updateWorkspace((prev) => {
      const nextLicensing = prev.licensing.filter((l) => l.id !== id);
      return StorageService.addAuditLog(
        { ...prev, licensing: nextLicensing },
        'DELETE',
        'LICENSING',
        id,
        `Deleted licensing agreement: ${id}`
      );
    });
  };

  const handleSaveCampaign = (campaign: MarketingCampaign) => {
    updateWorkspace((prev) => {
      const exists = prev.campaigns.some((c) => c.id === campaign.id);
      const nextCampaigns = exists
        ? prev.campaigns.map((c) => (c.id === campaign.id ? campaign : c))
        : [campaign, ...prev.campaigns];
      return StorageService.addAuditLog(
        { ...prev, campaigns: nextCampaigns },
        exists ? 'UPDATE' : 'CREATE',
        'SETTINGS',
        campaign.id,
        `${exists ? 'Updated' : 'Logged'} marketing campaign: "${campaign.campaignName}"`
      );
    });
  };

  const handleDeleteCampaign = (id: string) => {
    updateWorkspace((prev) => {
      const nextCampaigns = prev.campaigns.filter((c) => c.id !== id);
      return StorageService.addAuditLog(
        { ...prev, campaigns: nextCampaigns },
        'DELETE',
        'SETTINGS',
        id,
        `Deleted marketing campaign: ${id}`
      );
    });
  };

  const handleUpdateProfile = (profile: ArtistProfileSettings) => {
    updateWorkspace((prev) => {
      return StorageService.addAuditLog(
        { ...prev, profile },
        'UPDATE',
        'SETTINGS',
        'profile',
        `Updated studio profile for ${profile.artistName}`
      );
    });
  };

  const handleRestoreWorkspace = (newState: ArtistWorkspaceState) => {
    setWorkspaceState(newState);
  };

  const handleWipeWorkspace = () => {
    StorageService.clearWorkspace();
    setWorkspaceState(StorageService.loadWorkspace());
  };

  // Public Discovery filters & memo
  const allEvents = useMemo(() => dataset?.events || [], [dataset]);
  const filteredEvents = useMemo(() => {
    const matched = filterEvents(allEvents, filters);
    return sortEvents(matched);
  }, [allEvents, filters]);

  return (
    <div className="app-layout morrowkind-theme">
      {/* Top Application Header */}
      <Header
        metadata={dataset?.metadata}
        activePlatformMode={platformMode}
        onSelectPlatformMode={setPlatformMode}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenSources={() => setIsSourcesModalOpen(true)}
        onOpenVerify={() => {
          setVerifyInitialCertId('');
          setIsVerifyModalOpen(true);
        }}
      />

      {/* ================================================================== */}
      {/* 1. ARTIST INTELLIGENCE WORKSPACE MODE                              */}
      {/* ================================================================== */}
      {platformMode === 'workspace' && (
        <div className="workspace-container">
          <WorkspaceHeader
            activeModule={activeWorkspaceModule}
            onSelectModule={setActiveWorkspaceModule}
            profile={workspaceState.profile}
            counts={{
              inventory: workspaceState.inventory.length,
              sales: workspaceState.sales.length,
              collectors: workspaceState.collectors.length,
              exhibitions: workspaceState.exhibitions.length,
              certificates: workspaceState.certificates.length,
              licensing: workspaceState.licensing.length,
            }}
            onOpenVerifyModal={() => {
              setVerifyInitialCertId('');
              setIsVerifyModalOpen(true);
            }}
            onSwitchToDiscovery={() => setPlatformMode('discovery')}
            onLockVault={() => setIsVaultLocked(true)}
            tenants={tenants}
            activeTenantId={activeTenantId}
            onSwitchTenant={handleSwitchTenant}
          />

          {isVaultLocked ? (
            <div className="vault-lock-screen" role="region" aria-label="Studio Vault Locked">
              <div className="vault-lock-card">
                <div className="vault-lock-icon" aria-hidden="true">🔒</div>
                <h2>{isEncryptedAtRest ? 'AES-256 Encrypted Vault' : 'Studio Privacy Screen'}</h2>
                <p>
                  {isEncryptedAtRest
                    ? 'Storage ciphertext is cryptographically encrypted at rest with AES-GCM-256. Enter your master passphrase to derive the decryption key.'
                    : 'Workspace display is obscured to prevent shoulder-surfing observation in the physical studio.'}
                </p>
                
                {!isEncryptedAtRest && (
                  <div className="vault-honest-notice">
                    🛡️ <strong>Visual Screen Lock:</strong> Local storage is in standard mode. This curtain shields your screen from casual visitors. For true cryptographic encryption at rest, use the AES-256 storage migration in Vault Settings.
                  </div>
                )}

                {!isEncryptedAtRest && !workspaceState.profile.vaultPasscodeHash && (
                  <div className="alert-card warning-accent" style={{ margin: '12px 0', textAlign: 'left', fontSize: '0.8125rem' }}>
                    <strong>⚠️ Passcode Unconfigured:</strong> No privacy PIN has been set for this studio. Universal default passcodes are disabled to prevent false security assumptions. You can set a passcode below, or dismiss this privacy curtain to return to the workspace.
                  </div>
                )}

                <form onSubmit={handleUnlockVault} className="vault-lock-form">
                  <input
                    type="password"
                    placeholder={
                      isEncryptedAtRest
                        ? "Enter Master Vault Passphrase..."
                        : (workspaceState.profile.vaultPasscodeHash ? "Enter Studio Passcode..." : "Enter New Studio Passcode (min 4 chars)...")
                    }
                    value={unlockPasscode}
                    onChange={(e) => setUnlockPasscode(e.target.value)}
                    className="vault-lock-input"
                    autoFocus
                  />
                  {unlockError && <div className="error-text">{unlockError}</div>}
                  
                  {isEncryptedAtRest ? (
                    <button type="submit" className="btn btn-primary btn-block">
                      Decrypt & Unlock Workspace
                    </button>
                  ) : workspaceState.profile.vaultPasscodeHash ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      <button type="submit" className="btn btn-primary btn-block">
                        Unlock Studio Display
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm btn-block"
                        onClick={() => {
                          if (window.confirm('Reset the studio privacy screen passcode? Your artworks and studio data will remain completely intact.')) {
                            handleUpdateProfile({ ...workspaceState.profile, vaultPasscodeHash: undefined });
                            setIsVaultLocked(false);
                            setUnlockPasscode('');
                            setUnlockError('');
                          }
                        }}
                      >
                        Reset Privacy Passcode
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        onClick={() => {
                          if (!unlockPasscode || unlockPasscode.trim().length < 4) {
                            setUnlockError('Please enter at least 4 characters to configure your studio privacy passcode.');
                            return;
                          }
                          handleUpdateProfile({ ...workspaceState.profile, vaultPasscodeHash: unlockPasscode.trim() });
                          setIsVaultLocked(false);
                          setUnlockPasscode('');
                          setUnlockError('');
                        }}
                      >
                        Save Passcode & Unlock
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-block"
                        onClick={() => {
                          setIsVaultLocked(false);
                          setUnlockPasscode('');
                          setUnlockError('');
                        }}
                      >
                        Dismiss Privacy Curtain (Unconfigured)
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          ) : (
            <main className="workspace-main-content" role="main">
            {activeWorkspaceModule === 'dashboard' && (
              <DashboardView
                state={workspaceState}
                onNavigate={setActiveWorkspaceModule}
                onOpenAddArtwork={() => setActiveWorkspaceModule('inventory')}
                onOpenAddSale={() => setActiveWorkspaceModule('sales')}
              />
            )}

            {activeWorkspaceModule === 'inventory' && (
              <InventoryView
                artworks={workspaceState.inventory}
                baseCurrency={workspaceState.profile.baseCurrency}
                artistName={workspaceState.profile.artistName}
                onSaveArtwork={handleSaveArtwork}
                onDeleteArtwork={handleDeleteArtwork}
                onBulkImportArtworks={handleBulkImportArtworks}
                onIssueCertificate={() => {
                  setActiveWorkspaceModule('certificates');
                }}
                onRecordSaleForArtwork={() => {
                  setActiveWorkspaceModule('sales');
                }}
              />
            )}

            {activeWorkspaceModule === 'sales' && (
              <SalesView
                sales={workspaceState.sales}
                inventory={workspaceState.inventory}
                baseCurrency={workspaceState.profile.baseCurrency}
                onRecordSale={handleRecordSale}
                onDeleteSale={handleDeleteSale}
              />
            )}

            {activeWorkspaceModule === 'collectors' && (
              <CollectorsView
                collectors={workspaceState.collectors}
                baseCurrency={workspaceState.profile.baseCurrency}
                onSaveCollector={handleSaveCollector}
                onDeleteCollector={handleDeleteCollector}
              />
            )}

            {activeWorkspaceModule === 'exhibitions' && (
              <ExhibitionsView
                exhibitions={workspaceState.exhibitions}
                discoveredEvents={allEvents}
                baseCurrency={workspaceState.profile.baseCurrency}
                onSaveExhibition={handleSaveExhibition}
                onDeleteExhibition={handleDeleteExhibition}
              />
            )}

            {activeWorkspaceModule === 'pricing' && (
              <PricingView
                baseCurrency={workspaceState.profile.baseCurrency}
                defaultHourlyRate={workspaceState.profile.hourlyRate}
                defaultMarkupPercent={workspaceState.profile.defaultMarkupPercent}
              />
            )}

            {activeWorkspaceModule === 'certificates' && (
              <CertificatesView
                certificates={workspaceState.certificates}
                inventory={workspaceState.inventory}
                artistName={workspaceState.profile.artistName}
                onIssueCertificate={handleIssueCertificate}
                onRevokeCertificate={handleRevokeCertificate}
              />
            )}

            {activeWorkspaceModule === 'licensing' && (
              <LicensingView
                licensing={workspaceState.licensing}
                inventory={workspaceState.inventory}
                baseCurrency={workspaceState.profile.baseCurrency}
                onSaveAgreement={handleSaveLicensing}
                onDeleteAgreement={handleDeleteLicensing}
              />
            )}

            {activeWorkspaceModule === 'marketing' && (
              <MarketingView
                campaigns={workspaceState.campaigns}
                inventory={workspaceState.inventory}
                baseCurrency={workspaceState.profile.baseCurrency}
                onSaveCampaign={handleSaveCampaign}
                onDeleteCampaign={handleDeleteCampaign}
              />
            )}

            {activeWorkspaceModule === 'catalog' && (
              <CatalogView
                inventory={workspaceState.inventory}
                profile={workspaceState.profile}
              />
            )}

            {activeWorkspaceModule === 'backup' && (
              <BackupSettingsView
                state={workspaceState}
                onUpdateProfile={handleUpdateProfile}
                onRestoreWorkspace={handleRestoreWorkspace}
                onWipeWorkspace={handleWipeWorkspace}
              />
            )}
          </main>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. PUBLIC ART DISCOVERY MODE (PRESERVED)                           */}
      {/* ================================================================== */}
      {platformMode === 'discovery' && (
        <div className="discovery-mode-container">
          <NavigationTabs
            activeTab={activeDiscoveryTab}
            onTabChange={setActiveDiscoveryTab}
            counts={{
              events: allEvents.length,
              opportunities: opportunities.length,
              designers: designers.length,
              artworks: artworks.length,
            }}
          />

          <main className="main-content" role="main">
            {isLoading && (
              <div className="state-card loading-state" role="status">
                <div className="spinner" aria-hidden="true"></div>
                <p>Loading verified international visual arts directory…</p>
              </div>
            )}

            {!isLoading && loadError && (
              <div className="state-card error-state" role="alert">
                <span className="state-icon" aria-hidden="true">⚠️</span>
                <h3>Unable to Load Directory Data</h3>
                <p>{loadError}</p>
                <button type="button" className="btn btn-primary" onClick={loadDiscoveryData}>
                  Retry Loading Feed
                </button>
              </div>
            )}

            {/* Exhibitions Tab */}
            {!isLoading && !loadError && activeDiscoveryTab === 'events' && (
              <div id="panel-events" role="tabpanel" aria-labelledby="tab-events">
                <SearchBar filters={filters} onChange={setFilters} />
                <FilterBar
                  filters={filters}
                  onChange={setFilters}
                  totalFiltered={filteredEvents.length}
                  totalAvailable={allEvents.length}
                />

                {filteredEvents.length === 0 && (
                  <div className="state-card empty-state" role="status">
                    <span className="state-icon" aria-hidden="true">🎨</span>
                    <h3>No Verified Events Match Your Current Filters</h3>
                    <p>
                      No verified upcoming events are available in the selected filters right now.
                      Try another city or category, or browse the official source directory.
                    </p>
                    <div className="empty-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setFilters(DEFAULT_FILTERS)}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </div>
                )}

                {filteredEvents.length > 0 && (
                  <section className="events-grid" aria-label="Exhibitions and events directory">
                    {filteredEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onOpenModal={setSelectedEvent}
                      />
                    ))}
                  </section>
                )}
              </div>
            )}

            {/* Opportunities Tab */}
            {!isLoading && !loadError && activeDiscoveryTab === 'opportunities' && (
              <OpportunitiesView opportunities={opportunities} isLoading={isLoading} />
            )}

            {/* Designers Tab */}
            {!isLoading && !loadError && activeDiscoveryTab === 'designers' && (
              <DesignersView
                designers={designers}
                isLoading={isLoading}
                onOpenEnquiry={(designer) => {
                  setEnquiryInitialItem({
                    type: 'designer',
                    title: `Art Consultation & Procurement (${designer.studioName})`,
                    targetName: designer.studioName,
                    contactEmail: designer.contactEmail,
                    inquiryUrl: designer.inquiryPortalUrl || designer.officialWebsite,
                  });
                  setIsEnquiryModalOpen(true);
                }}
              />
            )}

            {/* Artwork Sourcing Tab */}
            {!isLoading && !loadError && activeDiscoveryTab === 'artworks' && (
              <ArtworkSourcingView
                artworks={artworks}
                isLoading={isLoading}
                onOpenEnquiry={(artwork) => {
                  setEnquiryInitialItem({
                    type: 'artwork',
                    title: `${artwork.title} (${artwork.dimensionsText})`,
                    targetName: `${artwork.artist} / ${artwork.galleryOrSource}`,
                    contactEmail: 'inquiries@artgallerylive.internal',
                    inquiryUrl: artwork.sourceUrl,
                  });
                  setIsEnquiryModalOpen(true);
                }}
              />
            )}
          </main>
        </div>
      )}

      {/* Global Application Footer */}
      <footer className="app-footer" role="contentinfo">
        <div className="footer-content">
          <p>
            <strong>Morrowkind</strong> — Artist Intelligence Platform & International Art Discovery Directory.
          </p>
          <p className="footer-subtext">
            Private studio data is encrypted and retained locally in your browser vault. Public discovery records are gathered strictly from verified institutional portals.
          </p>
          <div className="footer-links">
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setVerifyInitialCertId('');
                setIsVerifyModalOpen(true);
              }}
            >
              Verify Certificate of Authenticity
            </button>
            <span>•</span>
            <button
              type="button"
              className="text-link"
              onClick={() => setIsSourcesModalOpen(true)}
            >
              Verified Source Registry
            </button>
            <span>•</span>
            <button
              type="button"
              className="text-link"
              onClick={() => setIsAboutModalOpen(true)}
            >
              Accuracy & Verification Policy
            </button>
            <span>•</span>
            <a
              href="https://github.com/utkarshnikhare/art-gallery-live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              GitHub Project
            </a>
          </div>
        </div>
      </footer>

      {/* Shared Modals */}
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <SourceDirectoryModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        sources={sources}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      <EnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => {
          setIsEnquiryModalOpen(false);
          setEnquiryInitialItem(null);
        }}
        initialItem={enquiryInitialItem}
      />

      <PublicVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        certificates={workspaceState.certificates}
        initialCertId={verifyInitialCertId}
      />
    </div>
  );
};
