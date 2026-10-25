import React, { useState, useMemo } from 'react';
import { UserArtwork, ArtworkAvailability } from '../../types';
import { parseCsvText, validateArtworkImport, exportToCsv, downloadFile, ImportPreview } from '../../utils/csvService';

interface InventoryViewProps {
  artworks: UserArtwork[];
  baseCurrency: string;
  artistName: string;
  onSaveArtwork: (artwork: UserArtwork) => void;
  onDeleteArtwork: (id: string) => void;
  onBulkImportArtworks: (artworks: UserArtwork[]) => void;
  onIssueCertificate: (artwork: UserArtwork) => void;
  onRecordSaleForArtwork: (artwork: UserArtwork) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  artworks,
  baseCurrency,
  artistName,
  onSaveArtwork,
  onDeleteArtwork,
  onBulkImportArtworks,
  onIssueCertificate,
  onRecordSaleForArtwork,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [mediumFilter, setMediumFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<UserArtwork | null>(null);

  // CSV Import states
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importPreview, setImportPreview] = useState<ImportPreview<UserArtwork> | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<UserArtwork>>({
    title: '',
    artistName: artistName,
    yearCreated: new Date().getFullYear(),
    medium: 'Oil on Canvas',
    dimensions: { height: 100, width: 80, unit: 'cm' },
    orientation: 'vertical',
    artworkType: 'original',
    productionCost: 0,
    listPrice: 0,
    currency: baseCurrency,
    availability: 'available',
    location: 'Studio Storage',
    framingNotes: '',
    tags: [],
    imageUrl: '',
  });

  const filteredArtworks = useMemo(() => {
    return artworks.filter((art) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          art.title.toLowerCase().includes(q) ||
          art.medium.toLowerCase().includes(q) ||
          art.location.toLowerCase().includes(q) ||
          art.tags.some((t) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (availabilityFilter !== 'all' && art.availability !== availabilityFilter) {
        return false;
      }
      if (mediumFilter !== 'all' && !art.medium.toLowerCase().includes(mediumFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [artworks, searchQuery, availabilityFilter, mediumFilter]);

  const handleOpenAdd = () => {
    setEditingArtwork(null);
    setFormData({
      title: '',
      artistName: artistName,
      yearCreated: new Date().getFullYear(),
      medium: 'Oil on Canvas',
      dimensions: { height: 100, width: 80, unit: 'cm' },
      orientation: 'vertical',
      artworkType: 'original',
      productionCost: 0,
      listPrice: 0,
      currency: baseCurrency,
      availability: 'available',
      location: 'Studio Storage',
      framingNotes: '',
      tags: [],
      imageUrl: '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (art: UserArtwork) => {
    setEditingArtwork(art);
    setFormData({ ...art });
    setIsEditModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    const width = formData.dimensions?.width || 0;
    const height = formData.dimensions?.height || 0;
    const orientation = width > height ? 'horizontal' : width < height ? 'vertical' : 'square';

    const artworkToSave: UserArtwork = {
      id: editingArtwork?.id || `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: formData.title.trim(),
      artistName: formData.artistName?.trim() || artistName,
      yearCreated: Number(formData.yearCreated) || new Date().getFullYear(),
      medium: formData.medium?.trim() || 'Mixed Media',
      dimensions: {
        height,
        width,
        depth: formData.dimensions?.depth,
        unit: formData.dimensions?.unit || 'cm',
      },
      orientation,
      artworkType: formData.artworkType || 'original',
      productionCost: Number(formData.productionCost) || 0,
      listPrice: Number(formData.listPrice) || 0,
      currency: formData.currency || baseCurrency,
      availability: (formData.availability as ArtworkAvailability) || 'available',
      location: formData.location?.trim() || 'Studio Storage',
      framingNotes: formData.framingNotes?.trim(),
      tags: formData.tags || [],
      imageUrl: formData.imageUrl?.trim() || '',
      createdAt: editingArtwork?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveArtwork(artworkToSave);
    setIsEditModalOpen(false);
  };

  // CSV File Handler
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCsvText(text);
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);

      // Auto-guess column mapping
      const initialMap: Record<string, string> = {};
      parsed.headers.forEach((h) => {
        const lower = h.toLowerCase();
        if (lower.includes('title')) initialMap['title'] = h;
        else if (lower.includes('medium') || lower.includes('material')) initialMap['medium'] = h;
        else if (lower.includes('year') || lower.includes('date')) initialMap['yearCreated'] = h;
        else if (lower.includes('height')) initialMap['height'] = h;
        else if (lower.includes('width')) initialMap['width'] = h;
        else if (lower.includes('price')) initialMap['listPrice'] = h;
        else if (lower.includes('cost')) initialMap['productionCost'] = h;
        else if (lower.includes('status') || lower.includes('avail')) initialMap['availability'] = h;
        else if (lower.includes('location')) initialMap['location'] = h;
      });
      setColumnMap(initialMap);

      const preview = validateArtworkImport(parsed.rows, initialMap, artworks, artistName);
      setImportPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleUpdateColumnMap = (targetField: string, csvHeader: string) => {
    const nextMap = { ...columnMap, [targetField]: csvHeader };
    setColumnMap(nextMap);
    if (csvRows.length > 0) {
      const preview = validateArtworkImport(csvRows, nextMap, artworks, artistName);
      setImportPreview(preview);
    }
  };

  const handleCommitImport = () => {
    if (!importPreview) return;
    const validArtworks = importPreview.rows
      .filter((r) => r.isValid && r.parsedData)
      .map((r) => r.parsedData!);

    if (validArtworks.length > 0) {
      onBulkImportArtworks(validArtworks);
      setIsImportDrawerOpen(false);
      setImportPreview(null);
    }
  };

  const handleExportCsv = () => {
    const columns: { key: keyof UserArtwork; label: string }[] = [
      { key: 'title', label: 'Artwork Title' },
      { key: 'yearCreated', label: 'Creation Year' },
      { key: 'medium', label: 'Medium' },
      { key: 'dimensions', label: 'Dimensions' },
      { key: 'orientation', label: 'Orientation' },
      { key: 'listPrice', label: 'List Price' },
      { key: 'productionCost', label: 'Production Cost' },
      { key: 'currency', label: 'Currency' },
      { key: 'availability', label: 'Availability' },
      { key: 'location', label: 'Location' },
    ];

    const csvContent = exportToCsv(artworks, columns);
    downloadFile(csvContent, `morrowkind-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-inventory">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Artwork Inventory & Provenance Catalog</h2>
          <p className="view-subheading">
            Private, structured catalog of your original artworks, prints, editions, storage locations, and valuations.
          </p>
        </div>
        <div className="view-actions-group">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsImportDrawerOpen(true)}>
            📥 Import CSV / Excel
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleExportCsv} disabled={artworks.length === 0}>
            📤 Export CSV
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            + Add Artwork
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-toolbar">
        <div className="search-input-wrapper">
          <input
            type="search"
            className="filter-search-input"
            placeholder="Search artworks by title, medium, tags, storage location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search artwork inventory"
          />
        </div>

        <div className="filter-select-group">
          <select
            className="filter-select"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            aria-label="Filter by availability"
          >
            <option value="all">All Availability Statuses</option>
            <option value="available">Available for Sale</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold / Collected</option>
            <option value="on-exhibition">On Exhibition</option>
            <option value="on-consignment">On Consignment</option>
            <option value="archived">Archived</option>
          </select>

          <select
            className="filter-select"
            value={mediumFilter}
            onChange={(e) => setMediumFilter(e.target.value)}
            aria-label="Filter by medium"
          >
            <option value="all">All Mediums</option>
            <option value="Oil">Oil on Canvas</option>
            <option value="Acrylic">Acrylic</option>
            <option value="Mixed Media">Mixed Media</option>
            <option value="Sculpture">Sculpture</option>
            <option value="Paper">Paper / Ink</option>
          </select>

          <div className="view-toggle-buttons">
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card View"
            >
              ▦
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className="results-counter" aria-live="polite">
        Showing <strong>{filteredArtworks.length}</strong> artworks (Total catalog: {artworks.length} pieces)
      </div>

      {/* Empty State */}
      {filteredArtworks.length === 0 && (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">🖼️</span>
          <h3>No Artworks Found</h3>
          <p>
            {artworks.length === 0
              ? 'Your artwork catalog is currently empty. Add your first piece or import an existing inventory spreadsheet.'
              : 'No artworks match your search query or filter selection.'}
          </p>
          <div className="empty-actions">
            {artworks.length === 0 ? (
              <>
                <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
                  + Add First Artwork
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setIsImportDrawerOpen(true)}>
                  Import CSV
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setAvailabilityFilter('all');
                  setMediumFilter('all');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && filteredArtworks.length > 0 && (
        <div className="workspace-inventory-grid">
          {filteredArtworks.map((art) => (
            <article key={art.id} className="inv-artwork-card">
              <div className="inv-card-media">
                {art.imageUrl ? (
                  <img src={art.imageUrl} alt={art.title} className="inv-card-img" />
                ) : (
                  <div className="inv-card-placeholder">
                    <span>{art.orientation.toUpperCase()}</span>
                    <span className="placeholder-dims">
                      {art.dimensions.width} × {art.dimensions.height} {art.dimensions.unit}
                    </span>
                  </div>
                )}
                <span className={`status-pill ${art.availability}`}>
                  {art.availability.toUpperCase()}
                </span>
              </div>

              <div className="inv-card-body">
                <div className="inv-card-title-row">
                  <h3 className="inv-card-title">{art.title}</h3>
                  <span className="inv-card-year">{art.yearCreated}</span>
                </div>
                <div className="inv-card-medium">{art.medium}</div>

                <div className="inv-card-meta">
                  <span>📐 {art.dimensions.width} × {art.dimensions.height} {art.dimensions.unit}</span>
                  <span>📍 {art.location}</span>
                </div>

                <div className="inv-card-price-row">
                  <span className="inv-price-tag">
                    {art.currency} {art.listPrice.toLocaleString()}
                  </span>
                  {art.productionCost > 0 && (
                    <span className="inv-cost-tag" title="Recorded production cost">
                      Cost: {art.currency} {art.productionCost.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="inv-card-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => handleOpenEdit(art)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => onIssueCertificate(art)}
                    title="Generate cryptographic certificate of authenticity"
                  >
                    Certificate
                  </button>
                  {art.availability === 'available' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => onRecordSaleForArtwork(art)}
                    >
                      Record Sale
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && filteredArtworks.length > 0 && (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Year</th>
                <th>Medium</th>
                <th>Dimensions</th>
                <th>Status</th>
                <th>Location</th>
                <th>List Price</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredArtworks.map((art) => (
                <tr key={art.id}>
                  <td><strong>{art.title}</strong></td>
                  <td>{art.yearCreated}</td>
                  <td>{art.medium}</td>
                  <td>{art.dimensions.width} × {art.dimensions.height} {art.dimensions.unit}</td>
                  <td>
                    <span className={`status-pill ${art.availability}`}>{art.availability}</span>
                  </td>
                  <td>{art.location}</td>
                  <td><strong>{art.currency} {art.listPrice.toLocaleString()}</strong></td>
                  <td>{art.productionCost > 0 ? `${art.currency} ${art.productionCost.toLocaleString()}` : '—'}</td>
                  <td className="table-actions-cell">
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => handleOpenEdit(art)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-outline btn-xs" onClick={() => onIssueCertificate(art)}>
                      COA
                    </button>
                    {art.availability === 'available' && (
                      <button type="button" className="btn btn-primary btn-xs" onClick={() => onRecordSaleForArtwork(art)}>
                        Sale
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Artwork Modal */}
      {isEditModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingArtwork ? 'Edit Artwork' : 'Add New Artwork'}</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitForm} className="modal-form">
              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="art-title">Artwork Title *</label>
                  <input
                    id="art-title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="art-year">Creation Year</label>
                  <input
                    id="art-year"
                    type="number"
                    value={formData.yearCreated}
                    onChange={(e) => setFormData({ ...formData, yearCreated: parseInt(e.target.value, 10) })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="art-medium">Medium & Materials *</label>
                  <input
                    id="art-medium"
                    type="text"
                    required
                    placeholder="e.g. Oil on Canvas, Bronze & Marble"
                    value={formData.medium}
                    onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="art-type">Artwork Type</label>
                  <select
                    id="art-type"
                    value={formData.artworkType}
                    onChange={(e) => setFormData({ ...formData, artworkType: e.target.value as any })}
                  >
                    <option value="original">Original (Unique 1 of 1)</option>
                    <option value="limited-edition">Limited Edition</option>
                    <option value="open-edition">Open Edition Print</option>
                    <option value="sculpture">Sculpture / 3D Object</option>
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="art-height">Height ({formData.dimensions?.unit || 'cm'}) *</label>
                  <input
                    id="art-height"
                    type="number"
                    required
                    min="1"
                    value={formData.dimensions?.height}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions!, height: parseFloat(e.target.value) || 0 },
                      })
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="art-width">Width ({formData.dimensions?.unit || 'cm'}) *</label>
                  <input
                    id="art-width"
                    type="number"
                    required
                    min="1"
                    value={formData.dimensions?.width}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dimensions: { ...formData.dimensions!, width: parseFloat(e.target.value) || 0 },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="art-price">List Price ({formData.currency}) *</label>
                  <input
                    id="art-price"
                    type="number"
                    required
                    min="0"
                    value={formData.listPrice}
                    onChange={(e) => setFormData({ ...formData, listPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="art-cost">Production / Material Cost ({formData.currency})</label>
                  <input
                    id="art-cost"
                    type="number"
                    min="0"
                    value={formData.productionCost}
                    onChange={(e) => setFormData({ ...formData, productionCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-field">
                  <label htmlFor="art-avail">Current Availability</label>
                  <select
                    id="art-avail"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value as any })}
                  >
                    <option value="available">Available for Sale</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                    <option value="on-exhibition">On Exhibition</option>
                    <option value="on-consignment">On Consignment</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="art-loc">Storage / Physical Location</label>
                  <input
                    id="art-loc"
                    type="text"
                    placeholder="e.g. Main Studio Rack 3, Gallery Consignment"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="art-img">Artwork Image URL</label>
                <input
                  id="art-img"
                  type="url"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>

              <div className="modal-actions-bar">
                {editingArtwork && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this artwork record?')) {
                        onDeleteArtwork(editingArtwork.id);
                        setIsEditModalOpen(false);
                      }
                    }}
                  >
                    Delete Artwork
                  </button>
                )}
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingArtwork ? 'Save Changes' : 'Create Artwork'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal / Drawer */}
      {isImportDrawerOpen && (
        <div className="modal-backdrop" onClick={() => setIsImportDrawerOpen(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📥 Intelligent Spreadsheet Import</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsImportDrawerOpen(false)}>✕</button>
            </div>

            <div className="import-workflow-body">
              <p className="import-instructions">
                Upload your inventory spreadsheet (.csv). Morrowkind intelligently maps your spreadsheet columns to
                catalog fields with row-level validation and conflict detection before committing.
              </p>

              <div className="file-dropzone">
                <input type="file" accept=".csv" onChange={handleCsvFileSelect} id="csvFileInput" />
                <label htmlFor="csvFileInput" className="dropzone-label">
                  📁 Click to Select CSV Spreadsheet File
                </label>
              </div>

              {csvHeaders.length > 0 && (
                <div className="column-mapping-panel">
                  <h3>Map Spreadsheet Columns to Catalog Fields</h3>
                  <div className="mapping-grid">
                    {[
                      { field: 'title', label: 'Title *' },
                      { field: 'medium', label: 'Medium' },
                      { field: 'yearCreated', label: 'Creation Year' },
                      { field: 'height', label: 'Height (cm) *' },
                      { field: 'width', label: 'Width (cm) *' },
                      { field: 'listPrice', label: 'List Price *' },
                      { field: 'productionCost', label: 'Production Cost' },
                      { field: 'availability', label: 'Availability / Status' },
                      { field: 'location', label: 'Location' },
                    ].map((target) => (
                      <div key={target.field} className="mapping-item">
                        <label>{target.label}</label>
                        <select
                          value={columnMap[target.field] || ''}
                          onChange={(e) => handleUpdateColumnMap(target.field, e.target.value)}
                        >
                          <option value="">(Select Column)</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importPreview && (
                <div className="import-preview-section">
                  <div className="preview-summary-strip">
                    <span>Total Rows: <strong>{importPreview.totalRows}</strong></span>
                    <span className="valid-pill">Ready to Import: <strong>{importPreview.validCount}</strong></span>
                    {importPreview.duplicateCount > 0 && (
                      <span className="warning-pill">Potential Duplicates: <strong>{importPreview.duplicateCount}</strong></span>
                    )}
                    {importPreview.errorCount > 0 && (
                      <span className="error-pill">Rows with Errors: <strong>{importPreview.errorCount}</strong></span>
                    )}
                  </div>

                  <div className="table-responsive-wrapper preview-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Status</th>
                          <th>Title</th>
                          <th>Medium</th>
                          <th>Dimensions</th>
                          <th>Price</th>
                          <th>Validation Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.slice(0, 10).map((r) => (
                          <tr key={r.rowNumber} className={r.isValid ? '' : 'row-error'}>
                            <td>{r.rowNumber}</td>
                            <td>
                              <span className={`status-pill ${r.isValid ? 'available' : 'destroyed'}`}>
                                {r.isValid ? 'Valid' : 'Error'}
                              </span>
                            </td>
                            <td>{r.parsedData?.title || r.originalData['title'] || '—'}</td>
                            <td>{r.parsedData?.medium || '—'}</td>
                            <td>
                              {r.parsedData
                                ? `${r.parsedData.dimensions.width} × ${r.parsedData.dimensions.height} cm`
                                : '—'}
                            </td>
                            <td>{r.parsedData ? `${r.parsedData.currency} ${r.parsedData.listPrice}` : '—'}</td>
                            <td>
                              {r.errors.length > 0 ? (
                                <span className="error-text">{r.errors.join('; ')}</span>
                              ) : r.isDuplicate ? (
                                <span className="warning-text">Duplicate title matches existing record</span>
                              ) : (
                                <span className="valid-text">✓ Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importPreview.rows.length > 10 && (
                    <div className="preview-more-note">
                      Showing first 10 rows of {importPreview.rows.length} total rows.
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions-bar">
                <button type="button" className="btn btn-outline" onClick={() => setIsImportDrawerOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!importPreview || importPreview.validCount === 0}
                  onClick={handleCommitImport}
                >
                  Commit Import ({importPreview ? importPreview.validCount : 0} Artworks)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
