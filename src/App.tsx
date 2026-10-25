import React, { useEffect, useState, useMemo } from 'react';
import { ArtEvent, EventDataset, FilterState, RegisteredSource } from './types';
import { DEFAULT_FILTERS, filterEvents, sortEvents } from './utils/filterUtils';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { EventCard } from './components/EventCard';
import { EventModal } from './components/EventModal';
import { SourceDirectoryModal } from './components/SourceDirectoryModal';
import { AboutModal } from './components/AboutModal';

export const App: React.FC = () => {
  const [dataset, setDataset] = useState<EventDataset | null>(null);
  const [sources, setSources] = useState<RegisteredSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedEvent, setSelectedEvent] = useState<ArtEvent | null>(null);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  const baseUrl = import.meta.env.BASE_URL || '/';

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Load validated events
      const eventsUrl = `${baseUrl.replace(/\/$/, '')}/data/events.json`;
      const res = await fetch(eventsUrl);
      if (!res.ok) {
        throw new Error(`Failed to load event feed (HTTP ${res.status})`);
      }
      const data: EventDataset = await res.json();
      setDataset(data);

      // Load registered sources
      const sourcesUrl = `${baseUrl.replace(/\/$/, '')}/data/sources.json`;
      const sRes = await fetch(sourcesUrl);
      if (sRes.ok) {
        const sData = await sRes.json();
        setSources(sData.sources || []);
      }
    } catch (err: any) {
      console.error('Error fetching event data:', err);
      setLoadError(err.message || 'Unable to load events data file.');
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

  return (
    <div className="app-layout">
      <Header
        metadata={dataset?.metadata}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenSources={() => setIsSourcesModalOpen(true)}
      />

      <main className="main-content" role="main">
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

        {/* Loading State */}
        {isLoading && (
          <div className="state-card loading-state" role="status">
            <div className="spinner" aria-hidden="true"></div>
            <p>Loading verified art exhibitions and cultural events…</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && loadError && (
          <div className="state-card error-state" role="alert">
            <span className="state-icon" aria-hidden="true">⚠️</span>
            <h3>Unable to Load Event Directory</h3>
            <p>{loadError}</p>
            <button type="button" className="btn btn-primary" onClick={loadData}>
              Retry Loading Feed
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !loadError && filteredEvents.length === 0 && (
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

        {/* Event Cards Grid */}
        {!isLoading && !loadError && filteredEvents.length > 0 && (
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
      </main>

      <footer className="app-footer" role="contentinfo">
        <div className="footer-content">
          <p>
            <strong>Art Gallery Live</strong> — Curated public visual arts and exhibition discovery.
          </p>
          <p className="footer-subtext">
            Listings are gathered strictly from public museum and gallery announcements.
            Event dates, entry policies, and timings are subject to organiser changes. Always check the official link before visiting.
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
    </div>
  );
};
