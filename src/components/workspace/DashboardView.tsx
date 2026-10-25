import React from 'react';
import { ArtistWorkspaceState, WorkspaceModuleId } from '../../types';

interface DashboardViewProps {
  state: ArtistWorkspaceState;
  onNavigate: (module: WorkspaceModuleId) => void;
  onOpenAddArtwork: () => void;
  onOpenAddSale: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onNavigate,
  onOpenAddArtwork,
  onOpenAddSale,
}) => {
  const currency = state.profile.baseCurrency || 'USD';
  const hasRecords = state.inventory.length > 0 || state.sales.length > 0;

  // 1. Inventory Metrics
  const totalArtworks = state.inventory.length;
  const availableArtworks = state.inventory.filter((a) => a.availability === 'available').length;
  const soldArtworks = state.inventory.filter((a) => a.availability === 'sold').length;
  const onExhibitionCount = state.inventory.filter((a) => a.availability === 'on-exhibition').length;
  
  // Available Inventory Valuation (sum of list prices of available works)
  const inventoryValuation = state.inventory
    .filter((a) => a.availability === 'available')
    .reduce((sum, a) => sum + (a.listPrice || 0), 0);

  // 2. Sales & Revenue Metrics (derived strictly from actual recorded transactions)
  const totalSalesCount = state.sales.length;
  const grossRevenue = state.sales.reduce((sum, s) => sum + (s.grossAmount || 0), 0);
  const totalCommissionsPaid = state.sales.reduce((sum, s) => sum + (s.galleryCommissionAmount || 0), 0);
  const netProceeds = state.sales.reduce((sum, s) => sum + (s.netProceeds || 0), 0);
  const averageSalePrice = totalSalesCount > 0 ? Math.round(grossRevenue / totalSalesCount) : 0;
  
  // Outstanding pending payments
  const pendingPayments = state.sales
    .filter((s) => s.paymentStatus === 'Pending' || s.paymentStatus === 'Partially Paid')
    .reduce((sum, s) => sum + (s.netProceeds || 0), 0);

  // 3. Exhibition Cost & Profitability Metrics
  const totalExhibitionExpenses = state.exhibitions.reduce((sum, e) => sum + (e.totalExpenses || 0), 0);
  const totalExhibitionSales = state.exhibitions.reduce((sum, e) => sum + (e.attributedSalesNet || 0), 0);
  const exhibitionNetProfit = totalExhibitionSales - totalExhibitionExpenses;
  const exhibitionRoi = totalExhibitionExpenses > 0 ? Math.round((exhibitionNetProfit / totalExhibitionExpenses) * 100) : 0;

  // 4. Sales by Channel breakdown
  const channelBreakdown: Record<string, { count: number; total: number }> = {};
  state.sales.forEach((s) => {
    const ch = s.channel || 'Direct';
    if (!channelBreakdown[ch]) channelBreakdown[ch] = { count: 0, total: 0 };
    channelBreakdown[ch].count += 1;
    channelBreakdown[ch].total += s.grossAmount || 0;
  });

  // 5. Upcoming Deadlines (Exhibitions & Licensing)
  const now = Date.now();
  const upcomingExhibitions = state.exhibitions
    .filter((e) => new Date(e.startDate).getTime() >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const upcomingLicensingRenewals = state.licensing
    .filter((l) => l.renewalReminderDate && new Date(l.renewalReminderDate).getTime() >= now)
    .sort((a, b) => new Date(a.renewalReminderDate!).getTime() - new Date(b.renewalReminderDate!).getTime());

  return (
    <div className="workspace-view-container" id="ws-panel-dashboard">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Executive Studio Dashboard</h2>
          <p className="view-subheading">
            Live business performance calculated strictly from your verified inventory, sales, and exhibition ledgers. Zero fabricated metrics.
          </p>
        </div>
        <div className="view-actions-group">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenAddSale}>
            + Record Sale
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenAddArtwork}>
            + Add Artwork
          </button>
        </div>
      </div>

      {/* Onboarding Empty State */}
      {!hasRecords && (
        <div className="empty-onboarding-card">
          <div className="onboarding-icon" aria-hidden="true">🏛️</div>
          <h3>Welcome to Your Morrowkind Artist Intelligence Vault</h3>
          <p>
            Your private workspace is clean and ready. Every metric, valuation, and financial summary will be calculated
            strictly from the artwork, sales, and exhibition records you record or import.
          </p>
          <div className="onboarding-steps-grid">
            <div className="onboarding-step-card">
              <span className="step-num">1</span>
              <h4>Artwork Inventory</h4>
              <p>Add artwork pieces with creation year, medium, dimensions, production cost, and list price.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={onOpenAddArtwork}>
                Add Artwork
              </button>
            </div>

            <div className="onboarding-step-card">
              <span className="step-num">2</span>
              <h4>Spreadsheet Import</h4>
              <p>Already tracking inventory in Excel or Google Sheets? Import your CSV with intelligent column mapping.</p>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onNavigate('inventory')}>
                Import CSV
              </button>
            </div>

            <div className="onboarding-step-card">
              <span className="step-num">3</span>
              <h4>Pricing Intelligence</h4>
              <p>Calculate mathematically sound retail and gallery prices based on labor, materials, and commission splits.</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate('pricing')}>
                Launch Pricing Calculator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Metric Tiles */}
      <div className="metrics-summary-grid">
        <div className="metric-card gold-border">
          <div className="metric-header">
            <span className="metric-title">Available Inventory Valuation</span>
            <span className="metric-badge">Floor / List</span>
          </div>
          <div className="metric-value">
            {currency} {inventoryValuation.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>{availableArtworks} works available</span>
            <span>•</span>
            <span>{totalArtworks} total in catalog</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Net Sales Proceeds</span>
            <span className="metric-badge green">Realized</span>
          </div>
          <div className="metric-value">
            {currency} {netProceeds.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Gross: {currency} {grossRevenue.toLocaleString()}</span>
            <span>•</span>
            <span>{totalSalesCount} transactions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Average Sale Price</span>
            <span className="metric-badge">Per Work</span>
          </div>
          <div className="metric-value">
            {currency} {averageSalePrice.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Commissions: {currency} {totalCommissionsPaid.toLocaleString()}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Exhibition Net ROI</span>
            <span className={`metric-badge ${exhibitionRoi >= 0 ? 'green' : 'red'}`}>
              {exhibitionRoi >= 0 ? `+${exhibitionRoi}%` : `${exhibitionRoi}%`}
            </span>
          </div>
          <div className="metric-value">
            {currency} {exhibitionNetProfit.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Expenses: {currency} {totalExhibitionExpenses.toLocaleString()}</span>
            <span>•</span>
            <span>{state.exhibitions.length} exhibitions</span>
          </div>
        </div>
      </div>

      {/* Breakdown Rows */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Sales Channels & Inventory Status */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>Sales by Channel</h3>
            <span className="panel-sub">Gross Distribution</span>
          </div>

          {Object.keys(channelBreakdown).length === 0 ? (
            <div className="panel-empty-notice">
              No sales recorded yet. Use <strong>+ Record Sale</strong> to log completed or consigned sales transactions.
            </div>
          ) : (
            <div className="channel-list">
              {Object.entries(channelBreakdown).map(([ch, data]) => {
                const pct = grossRevenue > 0 ? Math.round((data.total / grossRevenue) * 100) : 0;
                return (
                  <div key={ch} className="channel-row">
                    <div className="channel-info">
                      <span className="channel-name">{ch}</span>
                      <span className="channel-count">({data.count} sales)</span>
                    </div>
                    <div className="channel-bar-wrap">
                      <div className="channel-bar" style={{ width: `${Math.max(5, pct)}%` }}></div>
                    </div>
                    <div className="channel-amount">
                      <strong>{currency} {data.total.toLocaleString()}</strong>
                      <span className="channel-pct">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="panel-divider"></div>

          <div className="inventory-breakdown-row">
            <div className="inv-stat">
              <span className="inv-stat-num">{availableArtworks}</span>
              <span className="inv-stat-label">Available for Sale</span>
            </div>
            <div className="inv-stat">
              <span className="inv-stat-num">{onExhibitionCount}</span>
              <span className="inv-stat-label">On Exhibition</span>
            </div>
            <div className="inv-stat">
              <span className="inv-stat-num">{soldArtworks}</span>
              <span className="inv-stat-label">Sold / Collected</span>
            </div>
            <div className="inv-stat">
              <span className="inv-stat-num">{state.collectors.length}</span>
              <span className="inv-stat-label">Private Collectors</span>
            </div>
          </div>
        </div>

        {/* Right Column: Deadlines, Reminders & Financial Alerts */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>Exhibition Deadlines & Licensing Reminders</h3>
            <span className="panel-sub">Schedule Timeline</span>
          </div>

          {upcomingExhibitions.length === 0 && upcomingLicensingRenewals.length === 0 ? (
            <div className="panel-empty-notice">
              No upcoming exhibition deadlines or licensing renewal reminders scheduled.
            </div>
          ) : (
            <div className="timeline-list">
              {upcomingExhibitions.map((ex) => (
                <div key={ex.id} className="timeline-item">
                  <div className="timeline-icon">🎪</div>
                  <div className="timeline-details">
                    <strong>{ex.title}</strong>
                    <span>{ex.venueName} • {ex.city}, {ex.country}</span>
                    <span className="timeline-date">Opens: {new Date(ex.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}

              {upcomingLicensingRenewals.map((lic) => (
                <div key={lic.id} className="timeline-item">
                  <div className="timeline-icon">⚖️</div>
                  <div className="timeline-details">
                    <strong>Licensing Renewal: {lic.licenseeName}</strong>
                    <span>{lic.artworkTitle} ({lic.licenseType})</span>
                    <span className="timeline-date">Reminder: {new Date(lic.renewalReminderDate!).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingPayments > 0 && (
            <div className="alert-card warning-accent">
              <span className="alert-icon" aria-hidden="true">⚠️</span>
              <div>
                <strong>Outstanding Payments: {currency} {pendingPayments.toLocaleString()}</strong>
                <p>Pending receivables awaiting client payment confirmation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
