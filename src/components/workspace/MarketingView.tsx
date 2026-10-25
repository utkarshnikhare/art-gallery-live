import React, { useState } from 'react';
import { MarketingCampaign, UserArtwork } from '../../types';

interface MarketingViewProps {
  campaigns: MarketingCampaign[];
  inventory: UserArtwork[];
  baseCurrency: string;
  onSaveCampaign: (campaign: MarketingCampaign) => void;
  onDeleteCampaign: (id: string) => void;
}

export const MarketingView: React.FC<MarketingViewProps> = ({
  campaigns,
  inventory,
  baseCurrency,
  onSaveCampaign,
  onDeleteCampaign,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<MarketingCampaign>>({
    campaignName: '',
    objective: 'Artwork Acquisition & Exhibition Promotion',
    platform: 'Instagram',
    artworkPromoted: inventory[0]?.title || '',
    startDate: new Date().toISOString().slice(0, 10),
    isDataConnected: false,
    reachOrImpressions: 1200,
    clicksOrInquiries: 45,
    adSpend: 150,
    attributedSalesRevenue: 0,
    currency: baseCurrency,
    notes: '',
  });

  const totalSpend = campaigns.reduce((sum, c) => sum + (c.adSpend || 0), 0);
  const totalAttributedSales = campaigns.reduce((sum, c) => sum + (c.attributedSalesRevenue || 0), 0);

  const handleOpenAdd = () => {
    setFormData({
      campaignName: '',
      objective: 'Artwork Acquisition & Exhibition Promotion',
      platform: 'Instagram',
      artworkPromoted: inventory[0]?.title || '',
      startDate: new Date().toISOString().slice(0, 10),
      isDataConnected: false,
      reachOrImpressions: 1200,
      clicksOrInquiries: 45,
      adSpend: 150,
      attributedSalesRevenue: 0,
      currency: baseCurrency,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campaignName?.trim()) return;

    const newCampaign: MarketingCampaign = {
      id: `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      campaignName: formData.campaignName.trim(),
      objective: formData.objective || 'Exhibition Promotion',
      platform: formData.platform || 'Instagram',
      artworkPromoted: formData.artworkPromoted,
      startDate: formData.startDate || new Date().toISOString().slice(0, 10),
      isDataConnected: false,
      reachOrImpressions: Number(formData.reachOrImpressions) || 0,
      clicksOrInquiries: Number(formData.clicksOrInquiries) || 0,
      adSpend: Number(formData.adSpend) || 0,
      attributedSalesRevenue: Number(formData.attributedSalesRevenue) || 0,
      currency: formData.currency || baseCurrency,
      notes: formData.notes?.trim(),
    };

    onSaveCampaign(newCampaign);
    setIsModalOpen(false);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-marketing">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Artist Marketing & Promotional Campaigns</h2>
          <p className="view-subheading">
            Track promotional campaigns, social engagements, and attributed artwork inquiries. Clear separation between verified API telemetry and manual artist records.
          </p>
        </div>
        <div className="view-actions-group">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            + Log Campaign
          </button>
        </div>
      </div>

      <div className="metrics-summary-grid">
        <div className="metric-card gold-border">
          <div className="metric-header">
            <span className="metric-title">Attributed Marketing Sales</span>
            <span className="metric-badge green">Revenue</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {totalAttributedSales.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Directly attributed artwork purchases</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Campaign Ad Spend</span>
            <span className="metric-badge">Expenditure</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {totalSpend.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Total spend across all platforms</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Campaigns</span>
            <span className="metric-badge">Ledger</span>
          </div>
          <div className="metric-value">{campaigns.length}</div>
          <div className="metric-footer">
            <span>Instagram, newsletters, print, fairs</span>
          </div>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">📈</span>
          <h3>No Marketing Campaigns Logged</h3>
          <p>
            Track your social campaigns, exhibition press releases, or print promotions to see which channels generate genuine collector interest.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            + Log Your First Campaign
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map((camp) => (
            <article key={camp.id} className="campaign-card">
              <div className="camp-header">
                <div>
                  <h3 className="camp-title">{camp.campaignName}</h3>
                  <div className="camp-platform">Platform: <strong>{camp.platform}</strong></div>
                </div>
                <span className={`data-source-pill ${camp.isDataConnected ? 'verified' : 'manual'}`}>
                  {camp.isDataConnected ? '✓ Connected API' : 'Manual Entry'}
                </span>
              </div>

              <div className="camp-meta-grid">
                <div>
                  <span className="cert-label">Reach / Impressions:</span>
                  <strong className="cert-val">{camp.reachOrImpressions.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="cert-label">Inquiries / Clicks:</span>
                  <strong className="cert-val">{camp.clicksOrInquiries.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="cert-label">Ad Spend:</span>
                  <span className="cert-val">{camp.currency} {camp.adSpend.toLocaleString()}</span>
                </div>
                <div>
                  <span className="cert-label">Attributed Revenue:</span>
                  <strong className="text-emerald">{camp.currency} {camp.attributedSalesRevenue.toLocaleString()}</strong>
                </div>
              </div>

              {camp.artworkPromoted && (
                <div className="camp-promoted">
                  Promoted Work: <strong>{camp.artworkPromoted}</strong>
                </div>
              )}

              {camp.notes && <p className="camp-notes">{camp.notes}</p>}

              <div className="camp-actions">
                <button
                  type="button"
                  className="btn btn-danger btn-xs"
                  onClick={() => {
                    if (window.confirm(`Delete campaign ${camp.campaignName}?`)) {
                      onDeleteCampaign(camp.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add Campaign Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Log Marketing Campaign</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="mkt-name">Campaign Name *</label>
                  <input
                    id="mkt-name"
                    type="text"
                    required
                    placeholder="e.g. Summer Solo Show Instagram Reel Series"
                    value={formData.campaignName}
                    onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="mkt-platform">Platform</label>
                  <select
                    id="mkt-platform"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Newsletter">Curated Email Newsletter</option>
                    <option value="Website">Website Feature</option>
                    <option value="Art Fair Print">Art Fair Print Catalog</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="mkt-art">Promoted Artwork</label>
                  <input
                    id="mkt-art"
                    type="text"
                    placeholder="e.g. Spectral Frequencies Series"
                    value={formData.artworkPromoted}
                    onChange={(e) => setFormData({ ...formData, artworkPromoted: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="mkt-start">Start Date</label>
                  <input
                    id="mkt-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="mkt-reach">Reach / Impressions</label>
                  <input
                    id="mkt-reach"
                    type="number"
                    min="0"
                    value={formData.reachOrImpressions}
                    onChange={(e) => setFormData({ ...formData, reachOrImpressions: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="mkt-clicks">Clicks / Direct Inquiries</label>
                  <input
                    id="mkt-clicks"
                    type="number"
                    min="0"
                    value={formData.clicksOrInquiries}
                    onChange={(e) => setFormData({ ...formData, clicksOrInquiries: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="mkt-spend">Ad Spend ({formData.currency})</label>
                  <input
                    id="mkt-spend"
                    type="number"
                    min="0"
                    value={formData.adSpend}
                    onChange={(e) => setFormData({ ...formData, adSpend: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="mkt-rev">Attributed Sales Revenue ({formData.currency})</label>
                  <input
                    id="mkt-rev"
                    type="number"
                    min="0"
                    value={formData.attributedSalesRevenue}
                    onChange={(e) => setFormData({ ...formData, attributedSalesRevenue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
