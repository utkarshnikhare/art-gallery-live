import React, { useState } from 'react';
import { SaleTransaction, UserArtwork, SalesChannel, PaymentStatus } from '../../types';
import { exportToCsv, downloadFile } from '../../utils/csvService';

interface SalesViewProps {
  sales: SaleTransaction[];
  inventory: UserArtwork[];
  baseCurrency: string;
  onRecordSale: (sale: SaleTransaction) => void;
  onDeleteSale: (id: string) => void;
}

const CHANNELS: SalesChannel[] = [
  'Direct to Collector',
  'Gallery Consignment',
  'Art Fair',
  'Online Marketplace',
  'Interior Designer / Architect',
  'Corporate Art Commission',
  'Auction',
  'Studio Sale',
  'Other',
];

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  inventory,
  baseCurrency,
  onRecordSale,
  onDeleteSale,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState<{
    artworkId: string;
    artworkTitle: string;
    saleDate: string;
    buyerName: string;
    channel: SalesChannel;
    grossAmount: number;
    galleryCommissionRate: number;
    discountAmount: number;
    shippingAmount: number;
    otherExpenses: number;
    taxAmount: number;
    currency: string;
    paymentStatus: PaymentStatus;
    notes: string;
  }>({
    artworkId: '',
    artworkTitle: '',
    saleDate: new Date().toISOString().slice(0, 10),
    buyerName: '',
    channel: 'Direct to Collector',
    grossAmount: 0,
    galleryCommissionRate: 0,
    discountAmount: 0,
    shippingAmount: 0,
    otherExpenses: 0,
    taxAmount: 0,
    currency: baseCurrency,
    paymentStatus: 'Paid',
    notes: '',
  });

  // Calculate live net proceeds
  const calculatedCommission = Math.round((formData.grossAmount * formData.galleryCommissionRate) / 100);
  const calculatedNet = Math.max(
    0,
    formData.grossAmount - calculatedCommission - formData.discountAmount - formData.otherExpenses
  );

  const filteredSales = sales.filter((s) => {
    if (filterChannel !== 'all' && s.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && s.paymentStatus !== filterStatus) return false;
    return true;
  });

  const grossTotal = sales.reduce((sum, s) => sum + (s.grossAmount || 0), 0);
  const netTotal = sales.reduce((sum, s) => sum + (s.netProceeds || 0), 0);
  const commissionTotal = sales.reduce((sum, s) => sum + (s.galleryCommissionAmount || 0), 0);
  const pendingTotal = sales
    .filter((s) => s.paymentStatus === 'Pending' || s.paymentStatus === 'Partially Paid')
    .reduce((sum, s) => sum + (s.netProceeds || 0), 0);

  const handleArtworkSelect = (artId: string) => {
    const art = inventory.find((a) => a.id === artId);
    if (art) {
      setFormData({
        ...formData,
        artworkId: art.id,
        artworkTitle: art.title,
        grossAmount: art.listPrice,
        currency: art.currency || baseCurrency,
      });
    } else {
      setFormData({ ...formData, artworkId: '', artworkTitle: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.artworkTitle.trim()) return;

    const newSale: SaleTransaction = {
      id: `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      artworkId: formData.artworkId || `art-manual-${Date.now()}`,
      artworkTitle: formData.artworkTitle.trim(),
      saleDate: formData.saleDate,
      buyerName: formData.buyerName.trim() || 'Private Collector',
      channel: formData.channel,
      grossAmount: Number(formData.grossAmount) || 0,
      galleryCommissionRate: Number(formData.galleryCommissionRate) || 0,
      galleryCommissionAmount: calculatedCommission,
      discountAmount: Number(formData.discountAmount) || 0,
      taxAmount: Number(formData.taxAmount) || 0,
      shippingAmount: Number(formData.shippingAmount) || 0,
      otherExpenses: Number(formData.otherExpenses) || 0,
      netProceeds: calculatedNet,
      currency: formData.currency,
      paymentStatus: formData.paymentStatus,
      paymentDate: formData.paymentStatus === 'Paid' ? formData.saleDate : undefined,
      notes: formData.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onRecordSale(newSale);
    setIsAddModalOpen(false);
  };

  const handleExportSales = () => {
    const columns: { key: keyof SaleTransaction; label: string }[] = [
      { key: 'saleDate', label: 'Sale Date' },
      { key: 'artworkTitle', label: 'Artwork' },
      { key: 'buyerName', label: 'Buyer' },
      { key: 'channel', label: 'Channel' },
      { key: 'grossAmount', label: 'Gross Amount' },
      { key: 'galleryCommissionAmount', label: 'Commission' },
      { key: 'netProceeds', label: 'Net Proceeds' },
      { key: 'currency', label: 'Currency' },
      { key: 'paymentStatus', label: 'Payment Status' },
    ];
    const csvContent = exportToCsv(sales, columns);
    downloadFile(csvContent, `morrowkind-sales-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-sales">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Sales, Commissions & Revenue Ledger</h2>
          <p className="view-subheading">
            Accurate tracking of gross sales, gallery commission cuts, discounts, taxes, and true net artist proceeds.
          </p>
        </div>
        <div className="view-actions-group">
          <button type="button" className="btn btn-outline btn-sm" onClick={handleExportSales} disabled={sales.length === 0}>
            📤 Export Ledger CSV
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsAddModalOpen(true)}>
            + Record Sale
          </button>
        </div>
      </div>

      {/* Financial KPI Summary */}
      <div className="metrics-summary-grid">
        <div className="metric-card gold-border">
          <div className="metric-header">
            <span className="metric-title">Net Proceeds Realized</span>
            <span className="metric-badge green">Artist Earnings</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {netTotal.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>After gallery commission & discounts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Gross Sales Volume</span>
            <span className="metric-badge">Total Billed</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {grossTotal.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>{sales.length} completed transactions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Gallery Commissions</span>
            <span className="metric-badge">Intermediary Split</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {commissionTotal.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Paid out to galleries / agents</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Pending Receivables</span>
            <span className={`metric-badge ${pendingTotal > 0 ? 'red' : 'green'}`}>
              {pendingTotal > 0 ? 'Awaiting Payment' : 'Settled'}
            </span>
          </div>
          <div className="metric-value">
            {baseCurrency} {pendingTotal.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Unpaid invoices / installments</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-toolbar">
        <div className="filter-select-group">
          <select
            className="filter-select"
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            aria-label="Filter by sales channel"
          >
            <option value="all">All Channels</option>
            {CHANNELS.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by payment status"
          >
            <option value="all">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Sales Transactions Table */}
      {filteredSales.length === 0 ? (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">💰</span>
          <h3>No Transactions Recorded</h3>
          <p>
            {sales.length === 0
              ? 'Your sales ledger is empty. Click "+ Record Sale" to record an artwork sale with commission and channel attribution.'
              : 'No sales match your current channel or status filters.'}
          </p>
          {sales.length === 0 && (
            <button type="button" className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              + Record Your First Sale
            </button>
          )}
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artwork</th>
                <th>Collector / Buyer</th>
                <th>Channel</th>
                <th>Gross Price</th>
                <th>Commission</th>
                <th>Net Proceeds</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.saleDate}</td>
                  <td><strong>{s.artworkTitle}</strong></td>
                  <td>{s.buyerName}</td>
                  <td><span className="spec-tag">{s.channel}</span></td>
                  <td>{s.currency} {s.grossAmount.toLocaleString()}</td>
                  <td>
                    {s.galleryCommissionAmount > 0
                      ? `${s.currency} ${s.galleryCommissionAmount.toLocaleString()} (${s.galleryCommissionRate}%)`
                      : '0% (Direct)'}
                  </td>
                  <td><strong className="text-emerald">{s.currency} {s.netProceeds.toLocaleString()}</strong></td>
                  <td>
                    <span className={`status-pill ${s.paymentStatus === 'Paid' ? 'available' : 'on-consignment'}`}>
                      {s.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      onClick={() => {
                        if (window.confirm('Delete this transaction record?')) {
                          onDeleteSale(s.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Sale Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Artwork Sale Transaction</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-art-select">Select Artwork from Inventory</label>
                  <select
                    id="sale-art-select"
                    value={formData.artworkId}
                    onChange={(e) => handleArtworkSelect(e.target.value)}
                  >
                    <option value="">(Or Enter Title Manually Below)</option>
                    {inventory
                      .filter((a) => a.availability === 'available' || a.availability === 'on-exhibition')
                      .map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.title} ({art.currency} {art.listPrice.toLocaleString()})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="sale-art-title">Artwork Title *</label>
                  <input
                    id="sale-art-title"
                    type="text"
                    required
                    placeholder="e.g. Spectral Frequencies No. 4"
                    value={formData.artworkTitle}
                    onChange={(e) => setFormData({ ...formData, artworkTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-date">Transaction Date *</label>
                  <input
                    id="sale-date"
                    type="date"
                    required
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sale-buyer">Buyer / Collector Name</label>
                  <input
                    id="sale-buyer"
                    type="text"
                    placeholder="e.g. Elena Rostova / Corporate Collection"
                    value={formData.buyerName}
                    onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-channel">Sales Channel</label>
                  <select
                    id="sale-channel"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value as SalesChannel })}
                  >
                    {CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="sale-status">Payment Status</label>
                  <select
                    id="sale-status"
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                  >
                    <option value="Paid">Paid in Full</option>
                    <option value="Pending">Pending Payment</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-gross">Gross Sale Price ({formData.currency}) *</label>
                  <input
                    id="sale-gross"
                    type="number"
                    required
                    min="0"
                    value={formData.grossAmount}
                    onChange={(e) => setFormData({ ...formData, grossAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sale-commission">Gallery Commission Rate (%)</label>
                  <input
                    id="sale-commission"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 50"
                    value={formData.galleryCommissionRate}
                    onChange={(e) => setFormData({ ...formData, galleryCommissionRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-discount">Discount Given ({formData.currency})</label>
                  <input
                    id="sale-discount"
                    type="number"
                    min="0"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sale-expenses">Other Direct Expenses / Shipping ({formData.currency})</label>
                  <input
                    id="sale-expenses"
                    type="number"
                    min="0"
                    value={formData.otherExpenses}
                    onChange={(e) => setFormData({ ...formData, otherExpenses: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Real-time Calculation Card */}
              <div className="calculation-preview-box">
                <div className="calc-row">
                  <span>Gross Billed:</span>
                  <span>{formData.currency} {formData.grossAmount.toLocaleString()}</span>
                </div>
                <div className="calc-row text-red">
                  <span>Gallery Commission ({formData.galleryCommissionRate}%):</span>
                  <span>- {formData.currency} {calculatedCommission.toLocaleString()}</span>
                </div>
                {formData.discountAmount > 0 && (
                  <div className="calc-row text-red">
                    <span>Discount:</span>
                    <span>- {formData.currency} {formData.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {formData.otherExpenses > 0 && (
                  <div className="calc-row text-red">
                    <span>Other Expenses:</span>
                    <span>- {formData.currency} {formData.otherExpenses.toLocaleString()}</span>
                  </div>
                )}
                <div className="calc-row total-row">
                  <strong>Estimated Net Proceeds:</strong>
                  <strong>{formData.currency} {calculatedNet.toLocaleString()}</strong>
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Sale Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
