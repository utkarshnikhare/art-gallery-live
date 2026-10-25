import React, { useState } from 'react';
import { ArtistExhibitionRecord, ArtEvent } from '../../types';
import { formatDateRange } from '../../utils/dateUtils';

interface ExhibitionsViewProps {
  exhibitions: ArtistExhibitionRecord[];
  discoveredEvents: ArtEvent[];
  baseCurrency: string;
  onSaveExhibition: (exhibition: ArtistExhibitionRecord) => void;
  onDeleteExhibition: (id: string) => void;
}

export const ExhibitionsView: React.FC<ExhibitionsViewProps> = ({
  exhibitions,
  discoveredEvents,
  baseCurrency,
  onSaveExhibition,
  onDeleteExhibition,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExhibition, setEditingExhibition] = useState<ArtistExhibitionRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ArtistExhibitionRecord>>({
    title: '',
    organiser: '',
    venueName: '',
    city: '',
    country: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    applicationFee: 0,
    participationFee: 0,
    transportInsuranceCost: 0,
    framingInstallationCost: 0,
    travelAccommodationCost: 0,
    marketingCost: 0,
    artworksSubmittedCount: 1,
    attributedSalesGross: 0,
    attributedSalesNet: 0,
    currency: baseCurrency,
    notes: '',
  });

  const totalSpentAll = exhibitions.reduce((sum, e) => sum + (e.totalExpenses || 0), 0);
  const totalSalesAll = exhibitions.reduce((sum, e) => sum + (e.attributedSalesNet || 0), 0);
  const netProfitAll = totalSalesAll - totalSpentAll;
  const overallRoi = totalSpentAll > 0 ? Math.round((netProfitAll / totalSpentAll) * 100) : 0;

  const handleOpenAdd = () => {
    setEditingExhibition(null);
    setFormData({
      title: '',
      organiser: '',
      venueName: '',
      city: '',
      country: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      applicationFee: 0,
      participationFee: 0,
      transportInsuranceCost: 0,
      framingInstallationCost: 0,
      travelAccommodationCost: 0,
      marketingCost: 0,
      artworksSubmittedCount: 1,
      attributedSalesGross: 0,
      attributedSalesNet: 0,
      currency: baseCurrency,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ex: ArtistExhibitionRecord) => {
    setEditingExhibition(ex);
    setFormData({ ...ex });
    setIsModalOpen(true);
  };

  // One-click populate from discovered public event
  const handleSelectDiscoveredEvent = (eventId: string) => {
    const evt = discoveredEvents.find((e) => e.id === eventId);
    if (evt) {
      setFormData((prev) => ({
        ...prev,
        title: evt.title,
        organiser: evt.organiser || evt.sourceName,
        venueName: evt.venueName || evt.sourceName,
        city: evt.city,
        country: evt.country,
        startDate: evt.startDate.slice(0, 10),
        endDate: (evt.endDate || evt.startDate).slice(0, 10),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const appFee = Number(formData.applicationFee) || 0;
    const partFee = Number(formData.participationFee) || 0;
    const transFee = Number(formData.transportInsuranceCost) || 0;
    const frameFee = Number(formData.framingInstallationCost) || 0;
    const travelFee = Number(formData.travelAccommodationCost) || 0;
    const mktFee = Number(formData.marketingCost) || 0;
    const totalExpenses = appFee + partFee + transFee + frameFee + travelFee + mktFee;

    const salesGross = Number(formData.attributedSalesGross) || 0;
    const salesNet = Number(formData.attributedSalesNet) || 0;
    const netProfit = salesNet - totalExpenses;
    const roiPercentage = totalExpenses > 0 ? Math.round((netProfit / totalExpenses) * 100) : 0;

    const recordToSave: ArtistExhibitionRecord = {
      id: editingExhibition?.id || `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: formData.title.trim(),
      organiser: formData.organiser?.trim() || 'Self-Organized',
      venueName: formData.venueName?.trim() || 'Gallery',
      city: formData.city?.trim() || 'Unknown',
      country: formData.country?.trim() || 'Unknown',
      startDate: formData.startDate || new Date().toISOString().slice(0, 10),
      endDate: formData.endDate || formData.startDate || new Date().toISOString().slice(0, 10),
      applicationFee: appFee,
      participationFee: partFee,
      transportInsuranceCost: transFee,
      framingInstallationCost: frameFee,
      travelAccommodationCost: travelFee,
      marketingCost: mktFee,
      totalExpenses,
      artworksSubmittedCount: Number(formData.artworksSubmittedCount) || 1,
      attributedSalesGross: salesGross,
      attributedSalesNet: salesNet,
      netProfit,
      roiPercentage,
      currency: formData.currency || baseCurrency,
      notes: formData.notes?.trim(),
      createdAt: editingExhibition?.createdAt || new Date().toISOString(),
    };

    onSaveExhibition(recordToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-exhibitions">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Exhibition Participation & Cost Analysis</h2>
          <p className="view-subheading">
            Audit true costs (booth, shipping, framing, travel) versus attributed artwork sales to measure actual net exhibition ROI.
          </p>
        </div>
        <div className="view-actions-group">
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            + Add Exhibition Record
          </button>
        </div>
      </div>

      {/* Financial Outcomes KPI Summary */}
      <div className="metrics-summary-grid">
        <div className="metric-card gold-border">
          <div className="metric-header">
            <span className="metric-title">Cumulative Exhibition ROI</span>
            <span className={`metric-badge ${overallRoi >= 0 ? 'green' : 'red'}`}>
              {overallRoi >= 0 ? `+${overallRoi}%` : `${overallRoi}%`}
            </span>
          </div>
          <div className="metric-value">
            {baseCurrency} {netProfitAll.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Net Profit (Sales minus all Expenses)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Costs Incurred</span>
            <span className="metric-badge">All Expenses</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {totalSpentAll.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Booth, framing, transit, travel</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Attributed Net Sales</span>
            <span className="metric-badge green">Revenue</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {totalSalesAll.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Direct sales from exhibitions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Tracked Exhibitions</span>
            <span className="metric-badge">Shows</span>
          </div>
          <div className="metric-value">
            {exhibitions.length}
          </div>
          <div className="metric-footer">
            <span>Solo, group & art fair events</span>
          </div>
        </div>
      </div>

      {/* Exhibition Records Table / Cards */}
      {exhibitions.length === 0 ? (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">🎪</span>
          <h3>No Exhibitions Recorded</h3>
          <p>
            Track your gallery shows, biennial participations, or art fair booths. Record all logistics and production costs
            to evaluate financial returns accurately.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            + Record Your First Exhibition
          </button>
        </div>
      ) : (
        <div className="exhibitions-grid">
          {exhibitions.map((ex) => (
            <article key={ex.id} className="exhibition-card">
              <div className="exhibition-header">
                <div>
                  <h3 className="exhibition-title">{ex.title}</h3>
                  <div className="exhibition-venue">
                    {ex.venueName} • <strong>{ex.organiser}</strong>
                  </div>
                  <div className="exhibition-dates">
                    📅 {formatDateRange(ex.startDate, ex.endDate)}
                  </div>
                  <div className="exhibition-location">📍 {ex.city}, {ex.country}</div>
                </div>

                <div className={`roi-pill-badge ${ex.netProfit >= 0 ? 'positive' : 'negative'}`}>
                  {ex.roiPercentage >= 0 ? `+${ex.roiPercentage}% ROI` : `${ex.roiPercentage}% ROI`}
                </div>
              </div>

              {/* Expense Breakdown Strip */}
              <div className="expense-breakdown-box">
                <span className="breakdown-label">Expenses Breakdown:</span>
                <div className="breakdown-chips">
                  {ex.participationFee > 0 && (
                    <span className="spec-tag">Booth: {ex.currency} {ex.participationFee}</span>
                  )}
                  {ex.transportInsuranceCost > 0 && (
                    <span className="spec-tag">Shipping: {ex.currency} {ex.transportInsuranceCost}</span>
                  )}
                  {ex.framingInstallationCost > 0 && (
                    <span className="spec-tag">Framing: {ex.currency} {ex.framingInstallationCost}</span>
                  )}
                  {ex.travelAccommodationCost > 0 && (
                    <span className="spec-tag">Travel: {ex.currency} {ex.travelAccommodationCost}</span>
                  )}
                  {ex.marketingCost > 0 && (
                    <span className="spec-tag">Marketing: {ex.currency} {ex.marketingCost}</span>
                  )}
                </div>
              </div>

              <div className="financial-outcome-row">
                <div>
                  <span className="outcome-label">Total Expenses:</span>
                  <span className="outcome-val text-red">
                    {ex.currency} {ex.totalExpenses.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="outcome-label">Attributed Net Sales:</span>
                  <span className="outcome-val text-emerald">
                    {ex.currency} {ex.attributedSalesNet.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="outcome-label">Net Financial Outcome:</span>
                  <strong className={ex.netProfit >= 0 ? 'text-emerald' : 'text-red'}>
                    {ex.netProfit >= 0 ? '+' : ''}{ex.currency} {ex.netProfit.toLocaleString()}
                  </strong>
                </div>
              </div>

              {ex.notes && <p className="exhibition-notes">{ex.notes}</p>}

              <div className="exhibition-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => handleOpenEdit(ex)}
                >
                  Edit Show & Costs
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-xs"
                  onClick={() => {
                    if (window.confirm(`Delete record for ${ex.title}?`)) {
                      onDeleteExhibition(ex.id);
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

      {/* Add / Edit Exhibition Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExhibition ? 'Edit Exhibition & Expenses' : 'Record Exhibition Participation'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* Option to populate from discovered event */}
              <div className="form-field discovery-selector-box">
                <label htmlFor="disc-event">Quick Populate from Verified Public Directory</label>
                <select id="disc-event" onChange={(e) => handleSelectDiscoveredEvent(e.target.value)}>
                  <option value="">(Select a verified event or fill manually below)</option>
                  {discoveredEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.venueName}, {evt.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="ex-title">Exhibition / Fair Title *</label>
                  <input
                    id="ex-title"
                    type="text"
                    required
                    placeholder="e.g. Spectral Frequencies, India Art Fair"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="ex-org">Organiser / Host Gallery</label>
                  <input
                    id="ex-org"
                    type="text"
                    placeholder="e.g. Chemould Prescott Road"
                    value={formData.organiser}
                    onChange={(e) => setFormData({ ...formData, organiser: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="ex-venue">Venue Name</label>
                  <input
                    id="ex-venue"
                    type="text"
                    placeholder="e.g. NSIC Grounds, Okhla"
                    value={formData.venueName}
                    onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="ex-city">City & Country</label>
                  <input
                    id="ex-city"
                    type="text"
                    placeholder="e.g. New Delhi, India"
                    value={formData.city ? `${formData.city}, ${formData.country || ''}` : ''}
                    onChange={(e) => {
                      const parts = e.target.value.split(',');
                      setFormData({
                        ...formData,
                        city: parts[0]?.trim() || '',
                        country: parts[1]?.trim() || '',
                      });
                    }}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="ex-start">Start Date *</label>
                  <input
                    id="ex-start"
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="ex-end">End Date *</label>
                  <input
                    id="ex-end"
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-section-heading">Exhibition Expense Breakdown ({formData.currency})</div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="ex-booth">Booth / Participation Fee</label>
                  <input
                    id="ex-booth"
                    type="number"
                    min="0"
                    value={formData.participationFee}
                    onChange={(e) => setFormData({ ...formData, participationFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="ex-trans">Shipping, Freight & Insurance</label>
                  <input
                    id="ex-trans"
                    type="number"
                    min="0"
                    value={formData.transportInsuranceCost}
                    onChange={(e) => setFormData({ ...formData, transportInsuranceCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="ex-frame">Framing & Installation</label>
                  <input
                    id="ex-frame"
                    type="number"
                    min="0"
                    value={formData.framingInstallationCost}
                    onChange={(e) => setFormData({ ...formData, framingInstallationCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="ex-travel">Travel, Flights & Hotel</label>
                  <input
                    id="ex-travel"
                    type="number"
                    min="0"
                    value={formData.travelAccommodationCost}
                    onChange={(e) => setFormData({ ...formData, travelAccommodationCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-section-heading">Attributed Sales & Financial Returns</div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="ex-sales-gross">Gross Sales Generated at Exhibition</label>
                  <input
                    id="ex-sales-gross"
                    type="number"
                    min="0"
                    value={formData.attributedSalesGross}
                    onChange={(e) => setFormData({ ...formData, attributedSalesGross: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="ex-sales-net">Net Proceeds (after gallery cut)</label>
                  <input
                    id="ex-sales-net"
                    type="number"
                    min="0"
                    value={formData.attributedSalesNet}
                    onChange={(e) => setFormData({ ...formData, attributedSalesNet: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="ex-notes">Exhibition Notes & Collector Follow-ups</label>
                <textarea
                  id="ex-notes"
                  rows={2}
                  placeholder="Visitor response, key curators met, lighting notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExhibition ? 'Save Exhibition' : 'Record Exhibition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
