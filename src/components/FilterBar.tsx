import React from 'react';
import { FilterState } from '../types';
import { DEFAULT_FILTERS } from '../utils/filterUtils';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalFiltered: number;
  totalAvailable: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  totalFiltered,
  totalAvailable,
}) => {
  const isFiltered =
    filters.searchQuery !== '' ||
    filters.regionCategory !== 'all' ||
    filters.category !== 'all' ||
    filters.timeRange !== 'all' ||
    filters.fee !== 'all' ||
    filters.format !== 'all';

  const handleReset = () => {
    onChange(DEFAULT_FILTERS);
  };

  return (
    <section className="filter-controls-card" aria-label="Detailed filter panel">
      <div className="filter-grid">
        {/* Region */}
        <div className="filter-field">
          <label htmlFor="filter-region">Location / Region</label>
          <select
            id="filter-region"
            className="select-control"
            value={filters.regionCategory}
            onChange={(e) => onChange({ ...filters, regionCategory: e.target.value })}
          >
            <option value="all">All Locations (Global)</option>
            <option value="pune">Pune & PCMC</option>
            <option value="mumbai">Mumbai & MMR</option>
            <option value="maharashtra">Maharashtra State</option>
            <option value="india">India (All Cities)</option>
            <option value="international">International</option>
            <option value="online">Online / Virtual</option>
          </select>
        </div>

        {/* Category */}
        <div className="filter-field">
          <label htmlFor="filter-category">Event Category</label>
          <select
            id="filter-category"
            className="select-control"
            value={filters.category}
            onChange={(e) => onChange({ ...filters, category: e.target.value })}
          >
            <option value="all">All Categories</option>
            <option value="exhibition">Exhibitions & Surveys</option>
            <option value="gallery-show">Gallery Shows</option>
            <option value="art-fair">Art Fairs & Festivals</option>
            <option value="workshop">Workshops & Masterclasses</option>
            <option value="artist-talk">Artist Talks & Demonstration</option>
            <option value="biennale">Biennales</option>
            <option value="open-studio">Open Studios</option>
          </select>
        </div>

        {/* Time Status */}
        <div className="filter-field">
          <label htmlFor="filter-time">Timeframe</label>
          <select
            id="filter-time"
            className="select-control"
            value={filters.timeRange}
            onChange={(e) => onChange({ ...filters, timeRange: e.target.value as any })}
          >
            <option value="all">All Current & Upcoming</option>
            <option value="happening-now">Happening Now (Ongoing)</option>
            <option value="upcoming">Upcoming Shows</option>
          </select>
        </div>

        {/* Fee */}
        <div className="filter-field">
          <label htmlFor="filter-fee">Admission Fee</label>
          <select
            id="filter-fee"
            className="select-control"
            value={filters.fee}
            onChange={(e) => onChange({ ...filters, fee: e.target.value as any })}
          >
            <option value="all">All Fee Types</option>
            <option value="free">Confirmed Free Entry</option>
            <option value="price">Ticket / Paid Admission</option>
            <option value="unknown">Fee Unknown / Check Organiser</option>
          </select>
        </div>

        {/* Format */}
        <div className="filter-field">
          <label htmlFor="filter-format">Format</label>
          <select
            id="filter-format"
            className="select-control"
            value={filters.format}
            onChange={(e) => onChange({ ...filters, format: e.target.value as any })}
          >
            <option value="all">All Formats</option>
            <option value="in-person">In-Person Only</option>
            <option value="online">Online / Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      <div className="filter-footer">
        <div className="results-count" role="status">
          Showing <strong>{totalFiltered}</strong> of {totalAvailable} verified events
        </div>

        {isFiltered && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleReset}
            id="reset-filters-btn"
          >
            ↺ Reset All Filters
          </button>
        )}
      </div>
    </section>
  );
};
