import React, { useState } from 'react';
import { LicensingAgreement, UserArtwork } from '../../types';

interface LicensingViewProps {
  licensing: LicensingAgreement[];
  inventory: UserArtwork[];
  baseCurrency: string;
  onSaveAgreement: (agreement: LicensingAgreement) => void;
  onDeleteAgreement: (id: string) => void;
}

const LICENSE_TYPES: LicensingAgreement['licenseType'][] = [
  'Commercial Merchandise',
  'Book / Editorial Cover',
  'Film / Set Placement',
  'Digital Asset',
  'Corporate Branding',
];

export const LicensingView: React.FC<LicensingViewProps> = ({
  licensing,
  inventory,
  baseCurrency,
  onSaveAgreement,
  onDeleteAgreement,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<LicensingAgreement | null>(null);

  const [formData, setFormData] = useState<Partial<LicensingAgreement>>({
    artworkId: '',
    artworkTitle: '',
    licenseeName: '',
    licenseType: 'Commercial Merchandise',
    permittedTerritory: 'Worldwide',
    isExclusive: false,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    licenseFee: 1500,
    royaltyPercentage: 8,
    currency: baseCurrency,
    paymentStatus: 'Paid',
    renewalReminderDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    rightsNotes: '',
  });

  const totalFees = licensing.reduce((sum, l) => sum + (l.licenseFee || 0), 0);
  const now = Date.now();

  const handleOpenAdd = () => {
    setEditingAgreement(null);
    setFormData({
      artworkId: inventory[0]?.id || '',
      artworkTitle: inventory[0]?.title || '',
      licenseeName: '',
      licenseType: 'Commercial Merchandise',
      permittedTerritory: 'Worldwide',
      isExclusive: false,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      licenseFee: 1500,
      royaltyPercentage: 8,
      currency: baseCurrency,
      paymentStatus: 'Paid',
      renewalReminderDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      rightsNotes: '',
    });
    setIsModalOpen(true);
  };

  const handleArtworkSelect = (artId: string) => {
    const art = inventory.find((a) => a.id === artId);
    if (art) {
      setFormData({ ...formData, artworkId: art.id, artworkTitle: art.title });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.licenseeName?.trim() || !formData.artworkTitle?.trim()) return;

    const agreementToSave: LicensingAgreement = {
      id: editingAgreement?.id || `lic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      artworkId: formData.artworkId || `art-${Date.now()}`,
      artworkTitle: formData.artworkTitle.trim(),
      licenseeName: formData.licenseeName.trim(),
      licenseType: formData.licenseType || 'Commercial Merchandise',
      permittedTerritory: formData.permittedTerritory?.trim() || 'Worldwide',
      isExclusive: formData.isExclusive || false,
      startDate: formData.startDate || new Date().toISOString().slice(0, 10),
      endDate: formData.endDate || new Date().toISOString().slice(0, 10),
      licenseFee: Number(formData.licenseFee) || 0,
      royaltyPercentage: Number(formData.royaltyPercentage) || 0,
      currency: formData.currency || baseCurrency,
      paymentStatus: formData.paymentStatus || 'Paid',
      renewalReminderDate: formData.renewalReminderDate || undefined,
      rightsNotes: formData.rightsNotes?.trim(),
      createdAt: editingAgreement?.createdAt || new Date().toISOString(),
    };

    onSaveAgreement(agreementToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-licensing">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Artwork Licensing, Copyright & Royalties</h2>
          <p className="view-subheading">
            Manage intellectual property agreements, usage rights, royalty percentages, and statutory resale protections.
          </p>
        </div>
        <div className="view-actions-group">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            + Add Licensing Agreement
          </button>
        </div>
      </div>

      <div className="legal-truth-banner">
        <span className="banner-icon" aria-hidden="true">⚖️</span>
        <div className="banner-body">
          <strong>Copyright Ownership Principle:</strong>
          <p>
            Under international visual arts law (Berne Convention), transferring physical ownership of a painting, sculpture,
            or print does <strong>NOT</strong> convey copyright or commercial reproduction permissions. Retain and document your intellectual property rights explicitly.
          </p>
        </div>
      </div>

      <div className="metrics-summary-grid">
        <div className="metric-card gold-border">
          <div className="metric-header">
            <span className="metric-title">Active Licensing Revenue</span>
            <span className="metric-badge green">Earned</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {totalFees.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Direct license fees</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Contracts</span>
            <span className="metric-badge">Ledger</span>
          </div>
          <div className="metric-value">{licensing.length}</div>
          <div className="metric-footer">
            <span>Commercial, publishing, sets</span>
          </div>
        </div>
      </div>

      {licensing.length === 0 ? (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">⚖️</span>
          <h3>No Licensing Agreements Recorded</h3>
          <p>
            Track agreements for book covers, merchandise, commercial branding, or film placement to protect your rights
            and automate renewal reminders.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            + Record Licensing Agreement
          </button>
        </div>
      ) : (
        <div className="licensing-grid">
          {licensing.map((lic) => {
            const isClosingSoon =
              lic.renewalReminderDate &&
              new Date(lic.renewalReminderDate).getTime() - now < 30 * 24 * 60 * 60 * 1000 &&
              new Date(lic.renewalReminderDate).getTime() - now > 0;

            return (
              <article key={lic.id} className="licensing-card">
                <div className="lic-header">
                  <div>
                    <h3 className="lic-title">{lic.artworkTitle}</h3>
                    <div className="lic-licensee">
                      Licensee: <strong>{lic.licenseeName}</strong>
                    </div>
                  </div>
                  <span className="spec-tag">{lic.licenseType}</span>
                </div>

                <div className="lic-meta-grid">
                  <div>
                    <span className="cert-label">Territory:</span>
                    <span className="cert-val">{lic.permittedTerritory}</span>
                  </div>
                  <div>
                    <span className="cert-label">Exclusivity:</span>
                    <span className="cert-val">{lic.isExclusive ? 'Exclusive' : 'Non-Exclusive'}</span>
                  </div>
                  <div>
                    <span className="cert-label">License Fee:</span>
                    <strong className="text-emerald">{lic.currency} {lic.licenseFee.toLocaleString()}</strong>
                  </div>
                  {lic.royaltyPercentage && lic.royaltyPercentage > 0 && (
                    <div>
                      <span className="cert-label">Royalty Split:</span>
                      <strong className="text-emerald">{lic.royaltyPercentage}%</strong>
                    </div>
                  )}
                  <div>
                    <span className="cert-label">Term:</span>
                    <span className="cert-val">{lic.startDate} to {lic.endDate}</span>
                  </div>
                </div>

                {isClosingSoon && (
                  <div className="alert-card warning-accent">
                    <span className="alert-icon" aria-hidden="true">⏱️</span>
                    <span>Renewal reminder active: Approaching expiration term</span>
                  </div>
                )}

                {lic.rightsNotes && <p className="lic-notes">{lic.rightsNotes}</p>}

                <div className="lic-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-xs"
                    onClick={() => {
                      if (window.confirm(`Delete licensing agreement with ${lic.licenseeName}?`)) {
                        onDeleteAgreement(lic.id);
                      }
                    }}
                  >
                    Delete Agreement
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Agreement Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Licensing & Rights Agreement</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="lic-art-select">Artwork from Inventory</label>
                  <select
                    id="lic-art-select"
                    value={formData.artworkId}
                    onChange={(e) => handleArtworkSelect(e.target.value)}
                  >
                    <option value="">(Or enter title manually below)</option>
                    {inventory.map((art) => (
                      <option key={art.id} value={art.id}>{art.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="lic-art-title">Artwork Title *</label>
                  <input
                    id="lic-art-title"
                    type="text"
                    required
                    value={formData.artworkTitle}
                    onChange={(e) => setFormData({ ...formData, artworkTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="lic-name">Licensee Company / Publisher *</label>
                  <input
                    id="lic-name"
                    type="text"
                    required
                    placeholder="e.g. Penguin Art Editions, Netflix Productions"
                    value={formData.licenseeName}
                    onChange={(e) => setFormData({ ...formData, licenseeName: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="lic-type">License Type</label>
                  <select
                    id="lic-type"
                    value={formData.licenseType}
                    onChange={(e) => setFormData({ ...formData, licenseType: e.target.value as any })}
                  >
                    {LICENSE_TYPES.map((lt) => (
                      <option key={lt} value={lt}>{lt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="lic-fee">License Fee ({formData.currency})</label>
                  <input
                    id="lic-fee"
                    type="number"
                    min="0"
                    value={formData.licenseFee}
                    onChange={(e) => setFormData({ ...formData, licenseFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="lic-royalty">Royalty Percentage (%)</label>
                  <input
                    id="lic-royalty"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.royaltyPercentage}
                    onChange={(e) => setFormData({ ...formData, royaltyPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="lic-start">Start Date</label>
                  <input
                    id="lic-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="lic-end">End Date</label>
                  <input
                    id="lic-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="lic-reminder">Renewal Reminder Date</label>
                <input
                  id="lic-reminder"
                  type="date"
                  value={formData.renewalReminderDate || ''}
                  onChange={(e) => setFormData({ ...formData, renewalReminderDate: e.target.value })}
                />
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Licensing Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
