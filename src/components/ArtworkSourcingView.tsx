import React, { useState, useMemo } from 'react';
import { ArtworkSourcingItem, ArtworkFilterState, ArtworkOrientation } from '../types';

interface ArtworkSourcingViewProps {
  artworks: ArtworkSourcingItem[];
  isLoading: boolean;
  onOpenEnquiry: (artwork: ArtworkSourcingItem) => void;
}

const DEFAULT_ARTWORK_FILTERS: ArtworkFilterState = {
  searchQuery: '',
  medium: 'all',
  style: 'all',
  orientation: 'all',
  scale: 'all',
  commissionOnly: false,
  suitableSpace: 'all',
};

export const ArtworkSourcingView: React.FC<ArtworkSourcingViewProps> = ({
  artworks,
  isLoading,
  onOpenEnquiry,
}) => {
  const [filters, setFilters] = useState<ArtworkFilterState>(DEFAULT_ARTWORK_FILTERS);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matches =
          art.title.toLowerCase().includes(query) ||
          art.artist.toLowerCase().includes(query) ||
          art.medium.toLowerCase().includes(query) ||
          art.style.toLowerCase().includes(query) ||
          art.locationCity.toLowerCase().includes(query) ||
          art.suitableSpaces.some((s) => s.toLowerCase().includes(query)) ||
          art.dominantPalette.some((p) => p.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // Medium
      if (filters.medium !== 'all') {
        if (!art.medium.toLowerCase().includes(filters.medium.toLowerCase())) return false;
      }

      // Orientation
      if (filters.orientation !== 'all') {
        if (art.orientation !== (filters.orientation as ArtworkOrientation)) return false;
      }

      // Scale (by maximum dimension)
      if (filters.scale !== 'all') {
        const maxDim = Math.max(art.dimensionsCm.height, art.dimensionsCm.width);
        if (filters.scale === 'large' && maxDim < 150) return false;
        if (filters.scale === 'medium' && (maxDim < 80 || maxDim >= 150)) return false;
        if (filters.scale === 'small' && maxDim >= 80) return false;
      }

      // Commission only
      if (filters.commissionOnly && !art.customCommissionAvailable) {
        return false;
      }

      // Suitable space
      if (filters.suitableSpace !== 'all') {
        if (!art.suitableSpaces.some((s) => s.toLowerCase().includes(filters.suitableSpace.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });
  }, [artworks, filters]);

  return (
    <div className="section-container" id="panel-artworks" role="tabpanel" aria-labelledby="tab-artworks">
      <div className="section-header-banner">
        <div>
          <h2>Verified Artwork Sourcing & Architectural Procurement</h2>
          <p className="section-subtitle">
            Curated visual art catalog calibrated for high-end residential, hospitality, and corporate architectural projects. Accurate dimensions, palettes, framing, and trade commission terms.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <input
            type="search"
            className="filter-search-input"
            placeholder="Search by artist, title, palette (e.g. Ochre, Marble, Patina, Kallat)…"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            aria-label="Search artworks"
          />
        </div>

        <div className="filter-select-group">
          <select
            className="filter-select"
            value={filters.orientation}
            onChange={(e) => setFilters({ ...filters, orientation: e.target.value })}
            aria-label="Filter by orientation"
          >
            <option value="all">All Orientations</option>
            <option value="horizontal">Horizontal (Landscape)</option>
            <option value="vertical">Vertical (Portrait)</option>
            <option value="square">Square</option>
          </select>

          <select
            className="filter-select"
            value={filters.scale}
            onChange={(e) => setFilters({ ...filters, scale: e.target.value })}
            aria-label="Filter by artwork scale"
          >
            <option value="all">All Scales</option>
            <option value="large">Monumental / Large (≥150 cm)</option>
            <option value="medium">Standard (80–150 cm)</option>
            <option value="small">Intimate (&lt;80 cm)</option>
          </select>

          <select
            className="filter-select"
            value={filters.suitableSpace}
            onChange={(e) => setFilters({ ...filters, suitableSpace: e.target.value })}
            aria-label="Filter by suitable space"
          >
            <option value="all">All Interior Spaces</option>
            <option value="Lobby">Hotel Lobby / Foyer</option>
            <option value="Living">Living Room / Salon</option>
            <option value="Boardroom">Executive Boardroom</option>
            <option value="Dining">Dining Salon</option>
            <option value="Courtyard">Courtyard / Outdoor</option>
          </select>

          <label className="checkbox-toggle-label">
            <input
              type="checkbox"
              checked={filters.commissionOnly}
              onChange={(e) => setFilters({ ...filters, commissionOnly: e.target.checked })}
            />
            <span>Custom Commissions Only</span>
          </label>

          {(filters.searchQuery || filters.orientation !== 'all' || filters.scale !== 'all' || filters.suitableSpace !== 'all' || filters.commissionOnly) && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setFilters(DEFAULT_ARTWORK_FILTERS)}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="results-counter" aria-live="polite">
        Showing <strong>{filteredArtworks.length}</strong> verified artworks suitable for architectural specification
      </div>

      {isLoading && (
        <div className="state-card loading-state">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading verified artwork catalog…</p>
        </div>
      )}

      {!isLoading && filteredArtworks.length === 0 && (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">🖼️</span>
          <h3>No Artworks Match Your Specifications</h3>
          <p>Try broadening your filters or clearing search terms to explore available works.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters(DEFAULT_ARTWORK_FILTERS)}
          >
            Clear Filters
          </button>
        </div>
      )}

      {!isLoading && filteredArtworks.length > 0 && (
        <div className="artworks-grid">
          {filteredArtworks.map((art) => (
            <article key={art.id} className="artwork-card" aria-label={`${art.title} by ${art.artist}`}>
              <div className="artwork-image-container">
                <img
                  src={art.imageUrl}
                  alt={`${art.title} by ${art.artist}`}
                  className="artwork-image"
                  loading="lazy"
                />
                <span className="artwork-orientation-badge">
                  {art.orientation.toUpperCase()}
                </span>
                {art.customCommissionAvailable && (
                  <span className="artwork-commission-badge" title="Artist / Studio accepts custom site sizing">
                    ✨ Bespoke Sizing Available
                  </span>
                )}
              </div>

              <div className="artwork-body">
                <h3 className="artwork-title">{art.title}</h3>
                <div className="artwork-artist">
                  <strong>{art.artist}</strong>
                </div>

                <div className="artwork-meta-row">
                  <span className="meta-label">Medium:</span>
                  <span className="meta-val">{art.medium}</span>
                </div>

                <div className="artwork-meta-row">
                  <span className="meta-label">Dimensions:</span>
                  <span className="meta-val dimension-val">{art.dimensionsText}</span>
                </div>

                <div className="artwork-meta-row">
                  <span className="meta-label">Framing:</span>
                  <span className="meta-val">{art.framing}</span>
                </div>

                <div className="artwork-palette-row">
                  <span className="palette-label">Palette:</span>
                  <div className="palette-chips">
                    {art.dominantPalette.map((p, idx) => (
                      <span key={idx} className="palette-chip">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="suitable-spaces-row">
                  <span className="spaces-label">Recommended Placement:</span>
                  <div className="spaces-tags">
                    {art.suitableSpaces.map((space, idx) => (
                      <span key={idx} className="space-tag">{space}</span>
                    ))}
                  </div>
                </div>

                <div className="artwork-price-row">
                  <span className="price-label">Procurement:</span>
                  <span className="price-tag">
                    {art.priceType === 'price-on-request' ? 'Trade Price on Request' : 'Institutional Archival'}
                  </span>
                </div>

                <div className="verification-pill-bar">
                  <span className="verified-check">
                    ✓ Verified via {art.galleryOrSource} ({art.locationCity})
                  </span>
                </div>

                <div className="artwork-actions">
                  <a
                    href={art.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    View Source ↗
                  </a>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onOpenEnquiry(art)}
                  >
                    Specify for Project
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
