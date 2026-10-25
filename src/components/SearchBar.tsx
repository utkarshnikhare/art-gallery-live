import React from 'react';
import { FilterState } from '../types';

interface SearchBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ filters, onChange }) => {
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const handleClear = () => {
    onChange({ ...filters, searchQuery: '' });
  };

  const setQuickFilter = (patch: Partial<FilterState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <section className="search-section" aria-label="Search and quick filters">
      <div className="search-input-wrapper">
        <label htmlFor="event-search" className="visually-hidden">
          Search exhibitions, artists, galleries, venues, or cities
        </label>
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          id="event-search"
          type="search"
          className="search-input"
          placeholder="Search exhibitions, artists, galleries, venues (e.g. Pune, Fort, VHC, modern art)..."
          value={filters.searchQuery}
          onChange={handleQueryChange}
        />
        {filters.searchQuery && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search input"
          >
            ✕
          </button>
        )}
      </div>

      <div className="quick-filters" role="group" aria-label="Quick filter shortcuts">
        <span className="quick-label">Quick filter:</span>
        <button
          type="button"
          className={`pill-btn ${filters.timeRange === 'all' && filters.regionCategory === 'all' && filters.category === 'all' && filters.fee === 'all' ? 'active' : ''}`}
          onClick={() => onChange({ ...filters, timeRange: 'all', regionCategory: 'all', category: 'all', fee: 'all' })}
        >
          All
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.timeRange === 'happening-now' ? 'active' : ''}`}
          onClick={() => setQuickFilter({ timeRange: filters.timeRange === 'happening-now' ? 'all' : 'happening-now' })}
        >
          🟢 Happening Now
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.timeRange === 'upcoming' ? 'active' : ''}`}
          onClick={() => setQuickFilter({ timeRange: filters.timeRange === 'upcoming' ? 'all' : 'upcoming' })}
        >
          📅 Upcoming
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.regionCategory === 'pune' ? 'active' : ''}`}
          onClick={() => setQuickFilter({ regionCategory: filters.regionCategory === 'pune' ? 'all' : 'pune' })}
        >
          📍 Pune & PCMC
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.regionCategory === 'mumbai' ? 'active' : ''}`}
          onClick={() => setQuickFilter({ regionCategory: filters.regionCategory === 'mumbai' ? 'all' : 'mumbai' })}
        >
          🏙️ Mumbai
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.fee === 'free' ? 'active' : ''}`}
          onClick={() => setQuickFilter({ fee: filters.fee === 'free' ? 'all' : 'free' })}
        >
          ✨ Free Admission
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.category === 'art-fair' ? 'active' : ''}`}
          onClick={() => setQuickFilter({ category: filters.category === 'art-fair' ? 'all' : 'art-fair' })}
        >
          🎪 Art Fairs
        </button>
        <button
          type="button"
          className={`pill-btn ${filters.category === 'workshop' ? 'active' : ''}`}
          onClick={() => setQuickFilter({ category: filters.category === 'workshop' ? 'all' : 'workshop' })}
        >
          🎨 Workshops
        </button>
      </div>
    </section>
  );
};
