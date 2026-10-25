import React, { useState } from 'react';
import { UserArtwork, ArtistProfileSettings } from '../../types';

interface CatalogViewProps {
  inventory: UserArtwork[];
  profile: ArtistProfileSettings;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ inventory, profile }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(inventory.map((a) => a.id));
  const [showPrices, setShowPrices] = useState(true);
  const [artistBio, setArtistBio] = useState(
    `${profile.artistName} is an active contemporary artist presenting works across painting, sculptural relief, and architectural art integration.`
  );

  const selectedArtworks = inventory.filter((a) => selectedIds.includes(a.id));

  const toggleSelectAll = () => {
    if (selectedIds.length === inventory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inventory.map((a) => a.id));
    }
  };

  const toggleArtwork = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="workspace-view-container" id="ws-panel-catalog">
      <div className="view-header-strip no-print">
        <div>
          <h2 className="view-heading">Portfolio & Editorial Catalog Generator</h2>
          <p className="view-subheading">
            Generate clean, publication-ready exhibition portfolios and collector tear-sheets with automatic privacy protection.
          </p>
        </div>
        <div className="view-actions-group">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => window.print()}
            disabled={selectedArtworks.length === 0}
          >
            🖨️ Print / Save to PDF
          </button>
        </div>
      </div>

      {/* Catalog Customization Controls (Hidden on Print) */}
      <div className="catalog-controls-card no-print">
        <h3>Catalog Configuration</h3>
        <div className="catalog-controls-grid">
          <div className="form-field">
            <label htmlFor="cat-bio">Artist Introduction / Statement</label>
            <textarea
              id="cat-bio"
              rows={2}
              value={artistBio}
              onChange={(e) => setArtistBio(e.target.value)}
            />
          </div>

          <div className="catalog-toggles">
            <label className="checkbox-toggle-label">
              <input
                type="checkbox"
                checked={showPrices}
                onChange={(e) => setShowPrices(e.target.checked)}
              />
              <span>Display List Prices in Catalog</span>
            </label>

            <button type="button" className="btn btn-outline btn-xs" onClick={toggleSelectAll}>
              {selectedIds.length === inventory.length ? 'Deselect All' : 'Select All Works'}
            </button>
          </div>
        </div>

        <div className="artwork-selector-chips">
          <span className="selector-label">Select Artworks to Include:</span>
          <div className="chips-list">
            {inventory.map((art) => {
              const isSelected = selectedIds.includes(art.id);
              return (
                <button
                  key={art.id}
                  type="button"
                  className={`chip-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => toggleArtwork(art.id)}
                >
                  {isSelected ? '✓ ' : '+ '}{art.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formal Printable Catalog Dossier */}
      <div className="printable-catalog-document">
        <header className="catalog-doc-header">
          <div className="catalog-brand-badge">MORROWKIND SELECTED WORKS</div>
          <h1 className="catalog-artist-title">{profile.artistName}</h1>
          {profile.studioName && <div className="catalog-studio-subtitle">{profile.studioName}</div>}
          <p className="catalog-bio-text">{artistBio}</p>
          <div className="catalog-header-divider"></div>
        </header>

        {selectedArtworks.length === 0 ? (
          <div className="empty-catalog-notice no-print">
            No artworks selected for this portfolio catalog. Check the artworks above to include them.
          </div>
        ) : (
          <div className="catalog-artworks-sheet">
            {selectedArtworks.map((art) => (
              <div key={art.id} className="catalog-art-item">
                <div className="catalog-art-image-box">
                  {art.imageUrl ? (
                    <img src={art.imageUrl} alt={art.title} className="catalog-img" />
                  ) : (
                    <div className="catalog-placeholder">
                      <span>{art.dimensions.width} × {art.dimensions.height} {art.dimensions.unit}</span>
                      <span>{art.medium}</span>
                    </div>
                  )}
                </div>

                <div className="catalog-art-details">
                  <h3 className="catalog-art-title">{art.title}</h3>
                  <div className="catalog-art-line">{art.yearCreated}</div>
                  <div className="catalog-art-line">{art.medium}</div>
                  <div className="catalog-art-line">
                    Dimensions: {art.dimensions.width} × {art.dimensions.height} {art.dimensions.unit}
                    {art.dimensions.depth ? ` × ${art.dimensions.depth} ${art.dimensions.unit}` : ''}
                  </div>
                  <div className="catalog-art-line">Edition: {art.artworkType}</div>
                  {art.framingNotes && <div className="catalog-art-line">Framing: {art.framingNotes}</div>}

                  {showPrices && art.listPrice > 0 && (
                    <div className="catalog-art-price">
                      List Price: {art.currency} {art.listPrice.toLocaleString()}
                    </div>
                  )}

                  <div className="catalog-inquiry-box">
                    <span>Inquiries & Sourcing:</span> <strong>{profile.email}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="catalog-doc-footer">
          <p>© {new Date().getFullYear()} {profile.artistName}. All moral and intellectual property rights reserved.</p>
          <p className="privacy-footer-note">
            Confidential portfolio tear-sheet generated via Morrowkind Artist Intelligence Platform.
          </p>
        </footer>
      </div>
    </div>
  );
};
