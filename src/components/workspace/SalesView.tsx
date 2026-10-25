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
    amountReceived: number;
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
    amountReceived: 0,
    currency: baseCurrency,
    paymentStatus: 'Paid',
    notes: '',
  });

  // Precise financial calculation rules:
  // 1. Net Selling Price = max(0, grossAmount - discountAmount)
  // 2. Gallery Commission = Math.round((netSellingPrice * rate) / 100)
  // 3. Total Net Proceeds = max(0, netSellingPrice - commission - shipping - otherExpenses)
  const netSellingPrice = Math.max(0, formData.grossAmount - formData.discountAmount);
  const calculatedCommission = Math.round((netSellingPrice * formData.galleryCommissionRate) / 100);
  
  let calculatedNet = Math.max(
    0,
    netSellingPrice - calculatedCommission - formData.shippingAmount - formData.otherExpenses
  );

  // If refunded, net realized is 0
  if (formData.paymentStatus === 'Refunded') {
    calculatedNet = 0;
  }

  const calculatedBalanceDue = formData.paymentStatus === 'Partially Paid'
    ? Math.max(0, calculatedNet - (formData.amountReceived || 0))
    : formData.paymentStatus === 'Pending' ? calculatedNet : 0;

  const filteredSales = sales.filter((s) => {
    if (filterChannel !== 'all' && s.channel !== filterChannel) return false;
    if (filterStatus !== 'all' && s.paymentStatus !== filterStatus) return false;
    return true;
  });

  // Calculate distinct currencies
  const distinctCurrencies = Array.from(new Set(sales.map((s) => s.currency || baseCurrency)));
  const isMultiCurrency = distinctCurrencies.length > 1;

  // Realized net excludes refunded sales
  const nonRefundedSales = sales.filter((s) => s.paymentStatus !== 'Refunded');
  const refundedSales = sales.filter((s) => s.paymentStatus === 'Refunded');

  const grossTotal = nonRefundedSales.reduce((sum, s) => sum + (s.grossAmount || 0), 0);
  const netTotal = nonRefundedSales.reduce((sum, s) => sum + (s.netProceeds || 0), 0);
  const commissionTotal = nonRefundedSales.reduce((sum, s) => sum + (s.galleryCommissionAmount || 0), 0);
  const refundTotal = refundedSales.reduce((sum, s) => sum + (s.grossAmount - s.discountAmount), 0);

  const pendingReceivable = sales.reduce((sum, s) => {
    if (s.paymentStatus === 'Pending') return sum + (s.netProceeds || 0);
    if (s.paymentStatus === 'Partially Paid') return sum + (s.balanceDue || 0);
    return sum;
  }, 0);

  // Breakdown by currency
  const currencyBreakdown: Record<string, { gross: number; net: number; pending: number }> = {};
  sales.forEach((s) => {
    const cur = s.currency || baseCurrency;
    if (!currencyBreakdown[cur]) currencyBreakdown[cur] = { gross: 0, net: 0, pending: 0 };
    if (s.paymentStatus !== 'Refunded') {
      currencyBreakdown[cur].gross += s.grossAmount || 0;
      currencyBreakdown[cur].net += s.netProceeds || 0;
    }
    if (s.paymentStatus === 'Pending') currencyBreakdown[cur].pending += s.netProceeds || 0;
    if (s.paymentStatus === 'Partially Paid') currencyBreakdown[cur].pending += s.balanceDue || 0;
  });

  const handleArtworkSelect = (artId: string) => {
    const art = inventory.find((a) => a.id === artId);
    if (art) {
      setFormData({
        ...formData,
        artworkId: art.id,
        artworkTitle: art.title,
        grossAmount: art.listPrice,
        currency: art.currency || baseCurrency,
        amountReceived: art.listPrice,
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
      amountReceived: formData.paymentStatus === 'Partially Paid' ? Number(formData.amountReceived) : (formData.paymentStatus === 'Paid' ? calculatedNet : 0),
      balanceDue: calculatedBalanceDue,
      refundAmount: formData.paymentStatus === 'Refunded' ? netSellingPrice : 0,
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
      { key: 'discountAmount', label: 'Discount' },
      { key: 'galleryCommissionAmount', label: 'Commission' },
      { key: 'netProceeds', label: 'Net Proceeds' },
      { key: 'balanceDue', label: 'Balance Due' },
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
            Accurate financial tracking: net selling prices, gallery splits, partial payment deposits, refunds, and true realized proceeds.
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

      {/* Multi-Currency Warning Banner if applicable */}
      {isMultiCurrency && (
        <div className="alert-card info-accent">
          <span className="alert-icon" aria-hidden="true">ℹ️</span>
          <span>
            <strong>Multi-Currency Portfolio:</strong> You have transactions recorded across multiple currencies ({distinctCurrencies.join(', ')}). Totals are displayed per currency below to prevent conflation.
          </span>
        </div>
      )}

      {/* Financial KPI Summary */}
      <div className="metrics-summary-grid">
        <div className="metric-card gold-border">
          <div className="metric-header">
            <span className="metric-title">Realized Net Proceeds</span>
            <span className="metric-badge green">Artist Earnings</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {netTotal.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Excludes refunded sales and unpaid balances</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Gross Sales Volume</span>
            <span className="metric-badge">Total Invoiced</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {grossTotal.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>{nonRefundedSales.length} confirmed sales</span>
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
            <span>Total gallery/agent deductions</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Accounts Receivable</span>
            <span className="metric-badge">Pending Balance</span>
          </div>
          <div className="metric-value">
            {baseCurrency} {pendingReceivable.toLocaleString()}
          </div>
          <div className="metric-footer">
            <span>Awaiting buyer settlement</span>
            {refundTotal > 0 && <span> • Refunds: {baseCurrency} {refundTotal.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {/* Currency Breakdown Table if multi-currency */}
      {isMultiCurrency && (
        <div className="currency-breakdown-card">
          <h4>Currency Breakdown</h4>
          <div className="currency-pills-row">
            {Object.entries(currencyBreakdown).map(([cur, data]) => (
              <div key={cur} className="currency-pill">
                <strong>{cur}:</strong> Gross {cur} {data.gross.toLocaleString()} | Realized Net {cur} {data.net.toLocaleString()} | Pending {cur} {data.pending.toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Strip */}
      <div className="filters-strip">
        <div className="filter-group">
          <label htmlFor="filter-ch">Sales Channel:</label>
          <select id="filter-ch" value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
            <option value="all">All Channels</option>
            {CHANNELS.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-st">Payment Status:</label>
          <select id="filter-st" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
          </select>
        </div>

        <div className="filter-results-count">
          Showing {filteredSales.length} of {sales.length} records
        </div>
      </div>

      {/* Sales Transactions Table */}
      {filteredSales.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-icon" aria-hidden="true">🧾</div>
          <h3>No Transactions Recorded Yet</h3>
          <p>Record your gallery consignments, studio sales, or art fair acquisitions to see automated revenue attribution.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsAddModalOpen(true)}>
            + Record First Sale
          </button>
        </div>
      ) : (
        <div className="table-responsive-wrapper" tabIndex={0} role="region" aria-label="Sales transactions data table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Artwork</th>
                <th>Buyer</th>
                <th>Channel</th>
                <th>Gross Price</th>
                <th>Commission</th>
                <th>Net Proceeds</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className={sale.paymentStatus === 'Refunded' ? 'row-refunded' : ''}>
                  <td>{sale.saleDate}</td>
                  <td>
                    <strong>{sale.artworkTitle}</strong>
                  </td>
                  <td>{sale.buyerName}</td>
                  <td>
                    <span className="spec-tag">{sale.channel}</span>
                  </td>
                  <td>
                    {sale.currency} {sale.grossAmount.toLocaleString()}
                    {sale.discountAmount > 0 && (
                      <span className="discount-tag"> (-{sale.discountAmount})</span>
                    )}
                  </td>
                  <td>
                    {sale.galleryCommissionAmount > 0 ? (
                      <span>{sale.currency} {sale.galleryCommissionAmount.toLocaleString()} ({sale.galleryCommissionRate}%)</span>
                    ) : (
                      <span className="text-muted">0%</span>
                    )}
                  </td>
                  <td>
                    <strong>{sale.currency} {sale.netProceeds.toLocaleString()}</strong>
                    {sale.balanceDue && sale.balanceDue > 0 ? (
                      <div className="balance-due-text">Due: {sale.currency} {sale.balanceDue.toLocaleString()}</div>
                    ) : null}
                  </td>
                  <td>
                    <span className={`status-pill pill-${sale.paymentStatus.toLowerCase().replace(' ', '-')}`}>
                      {sale.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={() => onDeleteSale(sale.id)}
                      title="Delete Transaction"
                      aria-label="Delete Transaction"
                    >
                      🗑️
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
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="addSaleTitle">
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h3 id="addSaleTitle">Record Sale Transaction</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="select-artwork">Select from Inventory</label>
                  <select id="select-artwork" onChange={(e) => handleArtworkSelect(e.target.value)}>
                    <option value="">-- Manual Title Entry or Select --</option>
                    {inventory.map((art) => (
                      <option key={art.id} value={art.id}>
                        {art.title} ({art.currency} {art.listPrice.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="sale-title">Artwork Title *</label>
                  <input
                    id="sale-title"
                    type="text"
                    required
                    value={formData.artworkTitle}
                    onChange={(e) => setFormData({ ...formData, artworkTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-date">Sale Date *</label>
                  <input
                    id="sale-date"
                    type="date"
                    required
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sale-buyer">Buyer / Patron Name</label>
                  <input
                    id="sale-buyer"
                    type="text"
                    value={formData.buyerName}
                    placeholder="Private Collector"
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
                  <label htmlFor="sale-currency">Currency</label>
                  <select
                    id="sale-currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-gross">Gross Selling Price *</label>
                  <input
                    id="sale-gross"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.grossAmount}
                    onChange={(e) => setFormData({ ...formData, grossAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sale-discount">Collector Discount ({formData.currency})</label>
                  <input
                    id="sale-discount"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-comm">Gallery Commission Split (%)</label>
                  <input
                    id="sale-comm"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.galleryCommissionRate}
                    onChange={(e) => setFormData({ ...formData, galleryCommissionRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="sale-shipping">Shipping / Packing Deductions ({formData.currency})</label>
                  <input
                    id="sale-shipping"
                    type="number"
                    min="0"
                    value={formData.shippingAmount}
                    onChange={(e) => setFormData({ ...formData, shippingAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="sale-status">Payment Status</label>
                  <select
                    id="sale-status"
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PaymentStatus })}
                  >
                    <option value="Paid">Paid in Full</option>
                    <option value="Partially Paid">Partially Paid (Deposit)</option>
                    <option value="Pending">Pending / Invoiced</option>
                    <option value="Refunded">Refunded / Cancelled</option>
                  </select>
                </div>

                {formData.paymentStatus === 'Partially Paid' && (
                  <div className="form-field">
                    <label htmlFor="sale-rec">Amount Received So Far ({formData.currency})</label>
                    <input
                      id="sale-rec"
                      type="number"
                      min="0"
                      value={formData.amountReceived}
                      onChange={(e) => setFormData({ ...formData, amountReceived: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              {/* Live Proceeds Formula Breakdown */}
              <div className="formula-breakdown-box">
                <div className="breakdown-title">Automated Financial Calculation</div>
                <div className="breakdown-line">
                  <span>Net Selling Price (Gross - Discount):</span>
                  <span>{formData.currency} {netSellingPrice.toLocaleString()}</span>
                </div>
                <div className="breakdown-line">
                  <span>Gallery Commission ({formData.galleryCommissionRate}% of Net Price):</span>
                  <span className="negative-accent">- {formData.currency} {calculatedCommission.toLocaleString()}</span>
                </div>
                {formData.shippingAmount > 0 && (
                  <div className="breakdown-line">
                    <span>Shipping Deductions:</span>
                    <span className="negative-accent">- {formData.currency} {formData.shippingAmount.toLocaleString()}</span>
                  </div>
                )}
                {formData.paymentStatus === 'Partially Paid' && (
                  <div className="breakdown-line">
                    <span>Balance Due from Buyer:</span>
                    <span className="info-accent">{formData.currency} {calculatedBalanceDue.toLocaleString()}</span>
                  </div>
                )}
                <div className="breakdown-line total-line">
                  <span>Estimated Net Artist Proceeds:</span>
                  <strong>{formData.currency} {calculatedNet.toLocaleString()}</strong>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="sale-notes">Notes / Consignment Contract Ref</label>
                <textarea
                  id="sale-notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Sold via Chemould Prescott Road summer salon; 50% split agreed."
                />
              </div>

              <div className="modal-footer-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
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
