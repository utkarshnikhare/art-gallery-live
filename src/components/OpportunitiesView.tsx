import React, { useState, useMemo } from 'react';
import { ArtOpportunity, OpportunityFilterState } from '../types';

interface OpportunitiesViewProps {
  opportunities: ArtOpportunity[];
  isLoading: boolean;
}

const DEFAULT_OPPORTUNITY_FILTERS: OpportunityFilterState = {
  searchQuery: '',
  opportunityType: 'all',
  deadlineStatus: 'all',
  fee: 'all',
  country: 'all',
};

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  opportunities,
  isLoading,
}) => {
  const [filters, setFilters] = useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTERS);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch =
          opp.title.toLowerCase().includes(query) ||
          opp.hostInstitution.toLowerCase().includes(query) ||
          opp.organiser.toLowerCase().includes(query) ||
          opp.city.toLowerCase().includes(query) ||
          opp.description.toLowerCase().includes(query) ||
          opp.eligibilitySummary.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Opportunity type
      if (filters.opportunityType !== 'all' && opp.opportunityType !== filters.opportunityType) {
        return false;
      }

      // Deadline status
      if (filters.deadlineStatus !== 'all' && opp.deadlineStatus !== filters.deadlineStatus) {
        return false;
      }

      // Entry fee
      if (filters.fee !== 'all') {
        if (filters.fee === 'free' && opp.entryFee.type !== 'free') return false;
        if (filters.fee === 'price' && opp.entryFee.type !== 'price') return false;
      }

      // Country
      if (filters.country !== 'all') {
        if (filters.country === 'India' && opp.country !== 'India') return false;
        if (filters.country === 'International' && opp.country === 'India') return false;
      }

      return true;
    });
  }, [opportunities, filters]);

  const formatDeadline = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysRemaining = (dateStr: string) => {
    const deadline = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Deadline passed';
    if (diff === 0) return 'Closes today';
    if (diff === 1) return '1 day remaining';
    return `${diff} days remaining`;
  };

  return (
    <div className="section-container" id="panel-opportunities" role="tabpanel" aria-labelledby="tab-opportunities">
      <div className="section-header-banner">
        <div>
          <h2>Artist Open Calls, Residencies & Grants</h2>
          <p className="section-subtitle">
            Curated opportunities verified directly from cultural foundations, biennial trusts, and public arts councils. Zero submission spam.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <input
            type="search"
            className="filter-search-input"
            placeholder="Search open calls, residencies, grants, institutions…"
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            aria-label="Search open calls"
          />
        </div>

        <div className="filter-select-group">
          <select
            className="filter-select"
            value={filters.opportunityType}
            onChange={(e) => setFilters({ ...filters, opportunityType: e.target.value })}
            aria-label="Filter by opportunity type"
          >
            <option value="all">All Opportunity Types</option>
            <option value="residency">Residencies</option>
            <option value="open-call">Open Calls</option>
            <option value="grant">Grants</option>
            <option value="award">Awards & Prizes</option>
            <option value="fellowship">Fellowships</option>
          </select>

          <select
            className="filter-select"
            value={filters.deadlineStatus}
            onChange={(e) => setFilters({ ...filters, deadlineStatus: e.target.value })}
            aria-label="Filter by deadline status"
          >
            <option value="all">All Deadlines</option>
            <option value="open">Open for Submissions</option>
            <option value="closing-soon">Closing Soon (&lt; 21 days)</option>
          </select>

          <select
            className="filter-select"
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            aria-label="Filter by geography"
          >
            <option value="all">Global & India</option>
            <option value="India">India Based</option>
            <option value="International">International</option>
          </select>

          <select
            className="filter-select"
            value={filters.fee}
            onChange={(e) => setFilters({ ...filters, fee: e.target.value })}
            aria-label="Filter by application fee"
          >
            <option value="all">All Fees</option>
            <option value="free">Free Application Only</option>
          </select>

          {(filters.searchQuery || filters.opportunityType !== 'all' || filters.deadlineStatus !== 'all' || filters.country !== 'all' || filters.fee !== 'all') && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setFilters(DEFAULT_OPPORTUNITY_FILTERS)}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="results-counter" aria-live="polite">
        Showing <strong>{filteredOpportunities.length}</strong> verified opportunities (of {opportunities.length} active calls)
      </div>

      {isLoading && (
        <div className="state-card loading-state">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading verified artist open calls…</p>
        </div>
      )}

      {!isLoading && filteredOpportunities.length === 0 && (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">🎯</span>
          <h3>No Open Calls Match Your Search</h3>
          <p>Try loosening your filter criteria or clearing the search query to view active opportunities.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilters(DEFAULT_OPPORTUNITY_FILTERS)}
          >
            Clear Filters
          </button>
        </div>
      )}

      {!isLoading && filteredOpportunities.length > 0 && (
        <div className="opportunity-grid">
          {filteredOpportunities.map((opp) => (
            <article key={opp.id} className="opportunity-card" aria-label={opp.title}>
              <div className="opp-header">
                <div className="opp-tags">
                  <span className={`opp-badge type-${opp.opportunityType}`}>
                    {opp.opportunityType.toUpperCase()}
                  </span>
                  <span className={`deadline-badge status-${opp.deadlineStatus}`}>
                    ⏱️ {getDaysRemaining(opp.submissionDeadline)}
                  </span>
                </div>
                <span className="opp-fee-badge">
                  {opp.entryFee.amountText || 'Free Entry'}
                </span>
              </div>

              <h3 className="opp-title">{opp.title}</h3>
              <div className="opp-host">
                <strong>{opp.hostInstitution}</strong> • {opp.city}, {opp.country}
              </div>

              <p className="opp-description">{opp.description}</p>

              {opp.stipendOrAwardText && (
                <div className="opp-stipend-box">
                  <span className="stipend-icon" aria-hidden="true">💎</span>
                  <span className="stipend-text">
                    <strong>Grant / Stipend:</strong> {opp.stipendOrAwardText}
                  </span>
                </div>
              )}

              <div className="opp-eligibility">
                <strong>Eligibility:</strong> {opp.eligibilitySummary}
              </div>

              <div className="opp-deadline-row">
                <span className="deadline-label">Submission Deadline:</span>
                <span className="deadline-date">{formatDeadline(opp.submissionDeadline)}</span>
              </div>

              <div className="verification-pill-bar">
                <span className="verified-check" title={`Verified: ${opp.verifiedFields.join(', ')}`}>
                  ✓ Verified against {opp.sourceName}
                </span>
              </div>

              <div className="opp-actions">
                <a
                  href={opp.officialGuidelinesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Official Guidelines ↗
                </a>
                {opp.submissionUrl && (
                  <a
                    href={opp.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    Submit Application ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
