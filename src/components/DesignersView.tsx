import React, { useState, useMemo } from 'react';
import { InteriorDesignerProfile, DesignerFilterState, ProjectType, ArtSourcingRole } from '../types';

interface DesignersViewProps {
  designers: InteriorDesignerProfile[];
  isLoading: boolean;
  onOpenEnquiry: (designer: InteriorDesignerProfile) => void;
}

const DEFAULT_DESIGNER_FILTERS: DesignerFilterState = {
  searchQuery: '',
  country: 'all',
  city: 'all',
  projectType: 'all',
  sourcingRole: 'all',
};

export const DesignersView: React.FC<DesignersViewProps> = ({
  designers,
  isLoading,
  onOpenEnquiry,
}) => {
  const [filters, setFilters] = useState<DesignerFilterState>(DEFAULT_DESIGNER_FILTERS);

  const filteredDesigners = useMemo(() => {
    return designers.filter((des) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matches =
          des.studioName.toLowerCase().includes(query) ||
          (des.principalName && des.principalName.toLowerCase().includes(query)) ||
          des.city.toLowerCase().includes(query) ||
          des.country.toLowerCase().includes(query) ||
          des.specialisations.some((s) => s.toLowerCase().includes(query)) ||
          des.verifiedPortfolioProjects.some((p) => p.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // Country / Geography
      if (filters.country !== 'all') {
        if (filters.country === 'India' && des.country !== 'India') return false;
        if (filters.country === 'International' && des.country === 'India') return false;
        if (filters.country === 'USA' && !des.country.includes('United States')) return false;
        if (filters.country === 'UK' && !des.country.includes('United Kingdom')) return false;
      }

      // Project type
      if (filters.projectType !== 'all') {
        if (!des.projectTypes.includes(filters.projectType as ProjectType)) return false;
      }

      // Sourcing role
      if (filters.sourcingRole !== 'all') {
        if (des.artSourcingRole !== filters.sourcingRole as ArtSourcingRole) return false;
      }

      return true;
    });
  }, [designers, filters]);

  const getRoleBadgeLabel = (role: ArtSourcingRole) => {
    switch (role) {
      case 'specifier':
        return 'Architectural Art Specifier';
      case 'consultant':
        return 'Fine Art Consultant / Advisory';
      case 'purchaser':
        return 'Direct Art Purchaser & Procurement';
      case 'advisory':
        return 'Corporate Art Advisor';
      default:
        return 'Design Studio';
    }
  };

  return (
    <div className="section-container" id="panel-designers" role="tabpanel" aria-labelledby="tab-designers">
      <div className="section-header-banner">
        <div>
          <h2>Interior Designers & Professional Art Specifiers</h2>
          <p className="section-subtitle">
            Authentic directory of verified architectural practices, interior studios, and art consultants actively curating and specifying visual art for high-end projects.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <input
            type="search"
            className="filter-search-input"
            placeholder="Search design studios, principals, cities, projects (e.g. Lotus, Mumbai, Hospitality)…"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            aria-label="Search interior designers"
          />
        </div>

        <div className="filter-select-group">
          <select
            className="filter-select"
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            aria-label="Filter by region"
          >
            <option value="all">Global & India</option>
            <option value="India">India Studios</option>
            <option value="International">International</option>
            <option value="UK">United Kingdom</option>
            <option value="USA">United States</option>
          </select>

          <select
            className="filter-select"
            value={filters.projectType}
            onChange={(e) => setFilters({ ...filters, projectType: e.target.value })}
            aria-label="Filter by project type"
          >
            <option value="all">All Project Types</option>
            <option value="residential">Luxury Residential</option>
            <option value="hospitality">Boutique Hospitality</option>
            <option value="commercial">Commercial & Corporate</option>
            <option value="cultural">Cultural Institutions</option>
            <option value="public-space">Public Spaces</option>
          </select>

          <select
            className="filter-select"
            value={filters.sourcingRole}
            onChange={(e) => setFilters({ ...filters, sourcingRole: e.target.value })}
            aria-label="Filter by art sourcing role"
          >
            <option value="all">All Sourcing Roles</option>
            <option value="specifier">Art Specifier</option>
            <option value="consultant">Art Consultant / Advisory</option>
            <option value="purchaser">Direct Purchaser</option>
          </select>

          {(filters.searchQuery || filters.country !== 'all' || filters.projectType !== 'all' || filters.sourcingRole !== 'all') && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setFilters(DEFAULT_DESIGNER_FILTERS)}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="results-counter" aria-live="polite">
        Showing <strong>{filteredDesigners.length}</strong> verified interior design & art sourcing practices
      </div>

      {isLoading && (
        <div className="state-card loading-state">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading verified interior designers directory…</p>
        </div>
      )}

      {!isLoading && filteredDesigners.length === 0 && (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">📐</span>
          <h3>No Interior Design Practices Found</h3>
          <p>Try clearing your search criteria or resetting filters to view all verified studios.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters(DEFAULT_DESIGNER_FILTERS)}
          >
            Clear Filters
          </button>
        </div>
      )}

      {!isLoading && filteredDesigners.length > 0 && (
        <div className="designers-grid">
          {filteredDesigners.map((des) => (
            <article key={des.id} className="designer-card" aria-label={des.studioName}>
              <div className="designer-header">
                <div>
                  <h3 className="designer-title">{des.studioName}</h3>
                  {des.principalName && (
                    <div className="designer-principals">
                      Principals: <strong>{des.principalName}</strong>
                    </div>
                  )}
                  <div className="designer-location">
                    📍 {des.city}{des.state ? `, ${des.state}` : ''}, {des.country}
                  </div>
                </div>

                <div className="designer-role-badge" title="Art procurement and curation capacity">
                  {getRoleBadgeLabel(des.artSourcingRole)}
                </div>
              </div>

              <div className="specialisation-tags">
                {des.specialisations.map((spec, i) => (
                  <span key={i} className="spec-tag">{spec}</span>
                ))}
              </div>

              {des.verifiedPortfolioProjects && des.verifiedPortfolioProjects.length > 0 && (
                <div className="designer-portfolio-box">
                  <span className="portfolio-label">Verified Art & Design Projects:</span>
                  <ul className="portfolio-list">
                    {des.verifiedPortfolioProjects.map((proj, idx) => (
                      <li key={idx}>{proj}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="verification-pill-bar">
                <span className="verified-check">
                  ✓ Studio identity & website verified ({des.verificationStatus})
                </span>
              </div>

              <div className="designer-actions">
                <a
                  href={des.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Official Portfolio ↗
                </a>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onOpenEnquiry(des)}
                >
                  Draft Sourcing Enquiry
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
