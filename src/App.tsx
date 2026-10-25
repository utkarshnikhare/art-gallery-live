import React, { useEffect, useState, useMemo } from 'react';
import { 
  ArtEvent, 
  EventDataset, 
  FilterState, 
  RegisteredSource, 
  ActiveAppTab,
  ArtOpportunity,
  InteriorDesignerProfile,
  ArtworkSourcingItem 
} from './types';
import { DEFAULT_FILTERS, filterEvents, sortEvents } from './utils/filterUtils';
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

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveAppTab>('events');
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

  // Enquiry modal state
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState<boolean>(false);
  const [enquiryInitialItem, setEnquiryInitialItem] = useState<{
    type: 'artwork' | 'designer';
    title: string;
    targetName: string;
    contactEmail?: string;
    inquiryUrl?: string;
  } | null>(null);

  const baseUrl = import.meta.env.BASE_URL || '/';

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const cleanBase = baseUrl.replace(/\/$/, '');

      // Load validated events
      const eventsUrl = `${cleanBase}/data/events.json`;
      const res = await fetch(eventsUrl);
      if (!res.ok) {
        throw new Error(`Failed to load event feed (HTTP ${res.status})`);
      }
      const data: EventDataset = await res.json();
      setDataset(data);

      // Load registered sources
      const sourcesUrl = `${cleanBase}/data/sources.json`;
      const sRes = await fetch(sourcesUrl);
      if (sRes.ok) {
        const sData = await sRes.json();
        setSources(sData.sources || []);
      }

      // Load verified opportunities
      const oppsUrl = `${cleanBase}/data/opportunities.json`;
      const oppsRes = await fetch(oppsUrl);
      if (oppsRes.ok) {
        const oppsData = await oppsRes.json();
        setOpportunities(oppsData.opportunities || []);
      }

      // Load verified interior designers
      const desUrl = `${cleanBase}/data/designers.json`;
      const desRes = await fetch(desUrl);
      if (desRes.ok) {
        const desData = await desRes.json();
        setDesigners(desData.designers || []);
      }

      // Load verified artworks
      const artUrl = `${cleanBase}/data/artworks.json`;
      const artRes = await fetch(artUrl);
      if (artRes.ok) {
        const artData = await artRes.json();
        setArtworks(artData.artworks || []);
      }
    } catch (err: any) {
      console.error('Error fetching platform data:', err);
      setLoadError(err.message || 'Unable to load platform data files.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allEvents = useMemo(() => dataset?.events || [], [dataset]);

  const filteredEvents = useMemo(() => {
    const matched = filterEvents(allEvents, filters);
    return sortEvents(matched);
  }, [allEvents, filters]);

  const handleOpenDesignerEnquiry = (designer: InteriorDesignerProfile) => {
    setEnquiryInitialItem({
      type: 'designer',
      title: `Art Consultation & Procurement (${designer.studioName})`,
      targetName: designer.studioName,
      contactEmail: designer.contactEmail,
      inquiryUrl: designer.inquiryPortalUrl || designer.officialWebsite,
    });
    setIsEnquiryModalOpen(true);
  };

  const handleOpenArtworkEnquiry = (artwork: ArtworkSourcingItem) => {
    setEnquiryInitialItem({
      type: 'artwork',
      title: `${artwork.title} (${artwork.dimensionsText})`,
      targetName: `${artwork.artist} / ${artwork.galleryOrSource}`,
      contactEmail: 'inquiries@artgallerylive.internal',
      inquiryUrl: artwork.sourceUrl,
    });
    setIsEnquiryModalOpen(true);
  };

  return (
    <div className="app-layout">
      <Header
        metadata={dataset?.metadata}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenSources={() => setIsSourcesModalOpen(true)}
      />

      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          events: allEvents.length,
          opportunities: opportunities.length,
          designers: designers.length,
          artworks: artworks.length,
        }}
      />

      <main className="main-content" role="main">
        {/* Loading State */}
        {isLoading && (
          <div className="state-card loading-state" role="status">
            <div className="spinner" aria-hidden="true"></div>
            <p>Loading verified international visual arts directory…</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && loadError && (
          <div className="state-card error-state" role="alert">
            <span className="state-icon" aria-hidden="true">⚠️</span>
            <h3>Unable to Load Directory Data</h3>
            <p>{loadError}</p>
            <button type="button" className="btn btn-primary" onClick={loadData}>
              Retry Loading Feed
            </button>
          </div>
        )}

        {/* Tab 1: Exhibitions & Events */}
        {!isLoading && !loadError && activeTab === 'events' && (
          <div id="panel-events" role="tabpanel" aria-labelledby="tab-events">
            <SearchBar
              filters={filters}
              onChange={setFilters}
            />

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
                  Try another city or category, or open the source directory to check official calendars.
                </p>
                <div className="empty-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                  >
                    Reset All Filters
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsSourcesModalOpen(true)}
                  >
                    Browse Official Sources
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

        {/* Tab 2: Opportunities & Open Calls */}
        {!isLoading && !loadError && activeTab === 'opportunities' && (
          <OpportunitiesView
            opportunities={opportunities}
            isLoading={isLoading}
          />
        )}

        {/* Tab 3: Interior Designers & Art Specifiers */}
        {!isLoading && !loadError && activeTab === 'designers' && (
          <DesignersView
            designers={designers}
            isLoading={isLoading}
            onOpenEnquiry={handleOpenDesignerEnquiry}
          />
        )}

        {/* Tab 4: Artwork Sourcing & Procurement */}
        {!isLoading && !loadError && activeTab === 'artworks' && (
          <ArtworkSourcingView
            artworks={artworks}
            isLoading={isLoading}
            onOpenEnquiry={handleOpenArtworkEnquiry}
          />
        )}
      </main>

      <footer className="app-footer" role="contentinfo">
        <div className="footer-content">
          <p>
            <strong>Art Gallery Live</strong> — Curated visual arts, open calls & architectural art procurement directory.
          </p>
          <p className="footer-subtext">
            Listings are gathered strictly from public museum announcements, cultural councils, verified design studios, and official gallery archives.
            Always confirm directly with the organiser or institution before visiting.
          </p>
          <div className="footer-links">
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
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setEnquiryInitialItem(null);
                setIsEnquiryModalOpen(true);
              }}
            >
              Art Sourcing Specification Form
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

      {/* Modals */}
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
    </div>
  );
};
