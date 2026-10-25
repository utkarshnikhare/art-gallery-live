import React, { useState } from 'react';
import { DigitalCertificate, UserArtwork } from '../../types';
import { generateArtworkFingerprint } from '../../utils/cryptoUtils';
import { generateQrSvgDataUri } from '../../utils/qrUtils';

interface CertificatesViewProps {
  certificates: DigitalCertificate[];
  inventory: UserArtwork[];
  artistName: string;
  onIssueCertificate: (cert: DigitalCertificate) => void;
  onRevokeCertificate: (certificateId: string) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certificates,
  inventory,
  artistName,
  onIssueCertificate,
  onRevokeCertificate,
}) => {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedCertForPrint, setSelectedCertForPrint] = useState<DigitalCertificate | null>(null);

  const [selectedArtworkId, setSelectedArtworkId] = useState('');
  const [editionText, setEditionText] = useState('Original 1 of 1');

  const baseUrl = import.meta.env.BASE_URL || '/';
  const publicBaseUrl = window.location.origin + baseUrl;

  const handleOpenIssue = () => {
    setSelectedArtworkId(inventory[0]?.id || '');
    setEditionText('Original 1 of 1');
    setIsIssueModalOpen(true);
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const artwork = inventory.find((a) => a.id === selectedArtworkId);
    if (!artwork) return;

    const certNum = Math.floor(1000 + Math.random() * 9000);
    const certId = `MK-COA-${new Date().getFullYear()}-${certNum}`;
    const dimsText = `${artwork.dimensions.width} × ${artwork.dimensions.height} ${artwork.dimensions.unit}`;

    // Cryptographic SHA-256 fingerprint of canonical artwork metadata
    const sha256 = generateArtworkFingerprint({
      title: artwork.title,
      artistName: artwork.artistName || artistName,
      yearCreated: artwork.yearCreated,
      medium: artwork.medium,
      dimensionsText: dimsText,
      editionText,
      uniqueSalt: certId,
    });

    const verifyUrl = `${publicBaseUrl}?verify=${certId}`;

    const newCertificate: DigitalCertificate = {
      certificateId: certId,
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      artistName: artwork.artistName || artistName,
      yearCreated: artwork.yearCreated,
      medium: artwork.medium,
      dimensionsText: dimsText,
      editionText,
      issueDate: new Date().toISOString().slice(0, 10),
      issuer: 'Morrowkind Provenance Vault',
      sha256Fingerprint: sha256,
      verificationUrl: verifyUrl,
      status: 'valid',
      blockchainAnchor: {
        isAnchored: false,
        note: 'Cryptographically hashed and verified in platform vault. Optional testnet anchoring available on demand.',
      },
    };

    onIssueCertificate(newCertificate);
    setIsIssueModalOpen(false);
  };

  return (
    <div className="workspace-view-container" id="ws-panel-certificates">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">Digital Certificates of Authenticity (COA) & Cryptographic Provenance</h2>
          <p className="view-subheading">
            Issue tamper-evident, SHA-256 cryptographically fingerprinted Certificates of Authenticity with offline-generated QR verification.
          </p>
        </div>
        <div className="view-actions-group">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenIssue}
            disabled={inventory.length === 0}
          >
            + Issue New Certificate
          </button>
        </div>
      </div>

      {/* Honest Blockchain & Legal Truth Banner */}
      <div className="legal-truth-banner">
        <span className="banner-icon" aria-hidden="true">📜</span>
        <div className="banner-body">
          <strong>Authenticity & Legal Distinction Standard:</strong>
          <p>
            Morrowkind uses industry-standard <strong>SHA-256 cryptographic hashing</strong> to freeze artwork metadata
            against alteration. A digital certificate or blockchain transaction proves data integrity at a point in time;
            it is not an automatic substitute for formal legal title.
          </p>
        </div>
      </div>

      {/* Certificates List */}
      {certificates.length === 0 ? (
        <div className="state-card empty-state">
          <span className="state-icon" aria-hidden="true">📜</span>
          <h3>No Certificates Issued Yet</h3>
          <p>
            {inventory.length === 0
              ? 'Add an artwork to your inventory first, then generate a Certificate of Authenticity with a verifiable QR code.'
              : 'Select an artwork from your inventory to issue your first Certificate of Authenticity with cryptographic proof.'}
          </p>
          {inventory.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={handleOpenIssue}>
              + Issue Your First Certificate
            </button>
          )}
        </div>
      ) : (
        <div className="certificates-grid">
          {certificates.map((cert) => {
            const qrUri = generateQrSvgDataUri(cert.verificationUrl, 160);
            return (
              <article key={cert.certificateId} className={`certificate-card ${cert.status}`}>
                <div className="cert-card-top">
                  <div>
                    <span className="cert-id-badge">{cert.certificateId}</span>
                    <h3 className="cert-title">{cert.artworkTitle}</h3>
                    <div className="cert-artist">By <strong>{cert.artistName}</strong> ({cert.yearCreated})</div>
                  </div>
                  <span className={`status-pill ${cert.status === 'valid' ? 'available' : 'destroyed'}`}>
                    {cert.status.toUpperCase()}
                  </span>
                </div>

                <div className="cert-details-grid">
                  <div>
                    <span className="cert-label">Medium:</span>
                    <span className="cert-val">{cert.medium}</span>
                  </div>
                  <div>
                    <span className="cert-label">Dimensions:</span>
                    <span className="cert-val">{cert.dimensionsText}</span>
                  </div>
                  <div>
                    <span className="cert-label">Edition:</span>
                    <span className="cert-val">{cert.editionText}</span>
                  </div>
                  <div>
                    <span className="cert-label">Issued:</span>
                    <span className="cert-val">{cert.issueDate}</span>
                  </div>
                </div>

                {/* SHA-256 Fingerprint Display */}
                <div className="sha-hash-strip">
                  <span className="hash-label">SHA-256 Cryptographic Fingerprint:</span>
                  <code className="hash-code">{cert.sha256Fingerprint}</code>
                </div>

                {/* QR Code and Actions */}
                <div className="cert-qr-row">
                  <img src={qrUri} alt="Verification QR Code" className="cert-qr-img" width="80" height="80" />
                  <div className="cert-qr-info">
                    <span className="qr-lead">Scan to verify provenance live</span>
                    <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer" className="verify-link">
                      Public Verification Link ↗
                    </a>
                  </div>
                </div>

                <div className="cert-actions-bar">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => setSelectedCertForPrint(cert)}
                  >
                    🖨️ View & Print COA
                  </button>
                  {cert.status === 'valid' && (
                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      onClick={() => {
                        if (window.confirm(`Revoke certificate ${cert.certificateId}? This action will mark it as revoked.`)) {
                          onRevokeCertificate(cert.certificateId);
                        }
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Issue Certificate Modal */}
      {isIssueModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsIssueModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Issue Certificate of Authenticity (COA)</h2>
              <button type="button" className="modal-close-btn" onClick={() => setIsIssueModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleIssueSubmit} className="modal-form">
              <div className="form-field">
                <label htmlFor="coa-art">Select Artwork from Inventory *</label>
                <select
                  id="coa-art"
                  required
                  value={selectedArtworkId}
                  onChange={(e) => setSelectedArtworkId(e.target.value)}
                >
                  {inventory.map((art) => (
                    <option key={art.id} value={art.id}>
                      {art.title} ({art.medium}, {art.yearCreated})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="coa-edition">Edition Specification *</label>
                <input
                  id="coa-edition"
                  type="text"
                  required
                  placeholder="e.g. Original 1 of 1, Edition 2 of 25"
                  value={editionText}
                  onChange={(e) => setEditionText(e.target.value)}
                />
              </div>

              <div className="alert-card info-accent">
                <span className="alert-icon" aria-hidden="true">🔒</span>
                <div>
                  <strong>Cryptographic Guarantee:</strong>
                  <p>
                    Upon issuance, Morrowkind calculates an immutable SHA-256 fingerprint binding the artwork's title,
                    medium, dimensions, edition, and artist attribution. A public verification QR code is generated instantly.
                  </p>
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" className="btn btn-outline" onClick={() => setIsIssueModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Cryptographic Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Certificate Dossier Modal */}
      {selectedCertForPrint && (
        <div className="modal-backdrop" onClick={() => setSelectedCertForPrint(null)}>
          <div className="modal-content modal-large printable-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h2>Official Certificate of Authenticity Preview</h2>
              <div className="print-controls">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
                  🖨️ Print Certificate
                </button>
                <button type="button" className="modal-close-btn" onClick={() => setSelectedCertForPrint(null)}>✕</button>
              </div>
            </div>

            {/* Formal Certificate Layout */}
            <div className="official-coa-document">
              <div className="coa-border-frame">
                <div className="coa-header">
                  <div className="coa-brand">MORROWKIND</div>
                  <h1 className="coa-main-title">Certificate of Authenticity</h1>
                  <div className="coa-cert-id">CERTIFICATE IDENTIFIER: {selectedCertForPrint.certificateId}</div>
                </div>

                <div className="coa-statement">
                  This document certifies that the artwork detailed below is an authentic, original creation created by the artist specified, verified in the Morrowkind Provenance Vault.
                </div>

                <div className="coa-specs-table">
                  <div className="coa-spec-row">
                    <span className="coa-key">Artwork Title:</span>
                    <strong className="coa-val">{selectedCertForPrint.artworkTitle}</strong>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-key">Artist / Creator:</span>
                    <strong className="coa-val">{selectedCertForPrint.artistName}</strong>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-key">Year of Creation:</span>
                    <span className="coa-val">{selectedCertForPrint.yearCreated}</span>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-key">Medium & Materials:</span>
                    <span className="coa-val">{selectedCertForPrint.medium}</span>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-key">Dimensions:</span>
                    <span className="coa-val">{selectedCertForPrint.dimensionsText}</span>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-key">Edition:</span>
                    <span className="coa-val">{selectedCertForPrint.editionText}</span>
                  </div>
                  <div className="coa-spec-row">
                    <span className="coa-key">Date of Issuance:</span>
                    <span className="coa-val">{selectedCertForPrint.issueDate}</span>
                  </div>
                </div>

                <div className="coa-security-section">
                  <div className="coa-hash-box">
                    <span className="coa-hash-title">Cryptographic SHA-256 Digest:</span>
                    <code className="coa-hash-str">{selectedCertForPrint.sha256Fingerprint}</code>
                  </div>

                  <div className="coa-qr-box">
                    <img
                      src={generateQrSvgDataUri(selectedCertForPrint.verificationUrl, 140)}
                      alt="Verification QR"
                      width="100"
                      height="100"
                    />
                    <span className="coa-qr-label">Scan to Verify Provenance</span>
                  </div>
                </div>

                <div className="coa-signatures">
                  <div className="sig-block">
                    <div className="sig-line">{selectedCertForPrint.artistName}</div>
                    <span className="sig-label">Authorized Artist Signature</span>
                  </div>
                  <div className="sig-block">
                    <div className="sig-line">Morrowkind Provenance Vault</div>
                    <span className="sig-label">Digital Issuance Authority</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
