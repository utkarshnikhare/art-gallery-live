import React, { useState } from 'react';
import { CollectorContact } from '../../types';
import { formatDateOnly } from '../../utils/dateUtils';

interface CollectorsViewProps {
  collectors: CollectorContact[];
  baseCurrency: string;
  onSaveCollector: (collector: CollectorContact) => void;
  onDeleteCollector: (id: string) => void;
}

export const CollectorsView: React.FC<CollectorsViewProps> = ({
  collectors,
  baseCurrency,
  onSaveCollector,
  onDeleteCollector,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollector, setEditingCollector] = useState<CollectorContact | null>(null);

  const [formData, setFormData] = useState<Partial<CollectorContact>>({
    name: '',
    organization: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    preferredCurrency: baseCurrency,
    artworkInterests: [],
    relationshipNotes: '',
    nextFollowUpDate: '',
    consentRecorded: true,
  });

  const [interestsInput, setInterestsInput] = useState('');

  const filteredCollectors = collectors.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.organization && c.organization.toLowerCase().includes(q)) ||
        c.city.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.artworkInterests.some((i) => i.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingCollector(null);
    setFormData({
      name: '',
      organization: '',
      email: '',
      phone: '',
      city: '',
      country: '',
      preferredCurrency: baseCurrency,
      artworkInterests: [],
      relationshipNotes: '',
      nextFollowUpDate: '',
      consentRecorded: true,
    });
    setInterestsInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (col: CollectorContact) => {
    setEditingCollector(col);
    setFormData({ ...col });
    setInterestsInput(col.artworkInterests.join(', '));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const interests = interestsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const contactToSave: CollectorContact = {
      id: editingCollector?.id || `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: formData.name.trim(),
      organization: formData.organization?.trim(),
      email: formData.email?.trim(),
      phone: formData.phone?.trim(),
      city: formData.city?.trim() || 'Unknown',
      country: formData.country?.trim() || 'Unknown',
      preferredCurrency: formData.preferredCurrency || baseCurrency,
      artworkInterests: interests,
      totalPurchasedCount: editingCollector?.totalPurchasedCount || 0,
      totalSpentAmount: editingCollector?.totalSpentAmount || 0,
      relationshipNotes: formData.relationshipNotes?.trim(),
      nextFollowUpDate: formData.nextFollowUpDate || undefined,
      consentRecorded: formData.consentRecorded ?? true,
      createdAt: editingCollector?.createdAt || new Date().toISOString(),
    };

    onSaveCollector(contactToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-collectors">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Collectors & Patron Relationship Management</h2>
          <p className="view-subheading">
            Private, client-side encrypted patron directory. Keep track of acquisitions, taste profiles, and follow-ups.
          </p>
        </div>
        <div className="view-actions-group">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            + Add Collector Contact
          </button>
        </div>
      </div>

      <div className="privacy-banner-card">
        <span className="privacy-icon" aria-hidden="true">🔒</span>
        <div className="privacy-text">
          <strong>Private Tenant Isolation:</strong> Collector contact details and acquisition notes are stored exclusively in your private encrypted vault. Never shared, exported to third parties, or publicly indexed.
        </div>
      </div>

      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <input
            type="search"
            className="filter-search-input"
            placeholder="Search collectors by name, organization, city, artwork interests…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search collectors"
          />
        </div>
      </div>

      <div className="results-counter" aria-live="polite">
        Showing <strong>{filteredCollectors.length}</strong> collectors (Total: {collectors.length})
      </div>

      {filteredCollectors.length === 0 ? (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">👥</span>
          <h3>No Collectors Recorded</h3>
          <p>
            {collectors.length === 0
              ? 'Your collector CRM is currently empty. Add your patrons, gallery curators, or corporate contacts.'
              : 'No collectors match your search query.'}
          </p>
          {collectors.length === 0 && (
            <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
              + Add First Collector
            </button>
          )}
        </div>
      ) : (
        <div className="collectors-grid">
          {filteredCollectors.map((col) => (
            <article key={col.id} className="collector-card">
              <div className="collector-header">
                <div>
                  <h3 className="collector-name">{col.name}</h3>
                  {col.organization && (
                    <div className="collector-org">{col.organization}</div>
                  )}
                  <div className="collector-location">📍 {col.city}, {col.country}</div>
                </div>
                <div className="collector-stats-badge">
                  <span>{col.totalPurchasedCount} Works</span>
                </div>
              </div>

              {col.email && (
                <div className="collector-contact-row">
                  <span className="contact-label">Email:</span>
                  <a href={`mailto:${col.email}`} className="text-link">{col.email}</a>
                </div>
              )}

              {col.artworkInterests.length > 0 && (
                <div className="collector-interests">
                  <span className="interests-label">Interests:</span>
                  <div className="interests-tags">
                    {col.artworkInterests.map((interest, i) => (
                      <span key={i} className="spec-tag">{interest}</span>
                    ))}
                  </div>
                </div>
              )}

              {col.relationshipNotes && (
                <p className="collector-notes">{col.relationshipNotes}</p>
              )}

              {col.nextFollowUpDate && (
                <div className="followup-strip">
                  ⏱️ Next Follow-up: <strong>{formatDateOnly(col.nextFollowUpDate)}</strong>
                </div>
              )}

              <div className="collector-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => handleOpenEdit(col)}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-xs"
                  onClick={() => {
                    if (window.confirm(`Delete collector profile for ${col.name}?`)) {
                      onDeleteCollector(col.id);
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

      {/* Add / Edit Collector Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCollector ? 'Edit Collector Profile' : 'Add New Collector'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="col-name">Collector / Contact Name *</label>
                  <input
                    id="col-name"
                    type="text"
                    required
                    placeholder="e.g. Elena Rostova"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="col-org">Organization / Collection</label>
                  <input
                    id="col-org"
                    type="text"
                    placeholder="e.g. Rostova Family Trust, Horizon Corporate Art"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="col-email">Email Address</label>
                  <input
                    id="col-email"
                    type="email"
                    placeholder="elena@rostova.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="col-phone">Phone / WhatsApp</label>
                  <input
                    id="col-phone"
                    type="tel"
                    placeholder="+1 / +44 / +91 ..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="col-city">City</label>
                  <input
                    id="col-city"
                    type="text"
                    placeholder="e.g. London"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="col-country">Country</label>
                  <input
                    id="col-country"
                    type="text"
                    placeholder="e.g. United Kingdom"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="col-interests">Artwork Interests (comma-separated)</label>
                <input
                  id="col-interests"
                  type="text"
                  placeholder="e.g. Large format oil, Mixed-media relief, Sculptural ceramics"
                  value={interestsInput}
                  onChange={(e) => setInterestsInput(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label htmlFor="col-followup">Next Follow-Up Date</label>
                <input
                  id="col-followup"
                  type="date"
                  value={formData.nextFollowUpDate || ''}
                  onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="col-notes">Curatorial & Relationship Notes</label>
                <textarea
                  id="col-notes"
                  rows={3}
                  placeholder="Preferences, preferred framers, studio visit discussions, or specific commission enquiries..."
                  value={formData.relationshipNotes}
                  onChange={(e) => setFormData({ ...formData, relationshipNotes: e.target.value })}
                />
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCollector ? 'Save Changes' : 'Create Collector Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
