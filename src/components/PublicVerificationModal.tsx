import React, { useState, useEffect } from 'react';
import { DigitalCertificate } from '../types';
import { verifyPortableProofToken } from '../utils/cryptoUtils';

interface PublicVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificates: DigitalCertificate[];
  initialCertId?: string;
}

export const PublicVerificationModal: React.FC<PublicVerificationModalProps> = ({
  isOpen,
  onClose,
  certificates,
  initialCertId = '',
}) => {
  const [searchId, setSearchId] = useState(initialCertId);
  const [matchedCert, setMatchedCert] = useState<DigitalCertificate | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPortableProof, setIsPortableProof] = useState(false);
  const [isSignatureValid, setIsSignatureValid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proofParam = params.get('proof');
    const verifyId = params.get('verify') || initialCertId;

    if (proofParam) {
      verifyPortableProofToken(proofParam).then((res) => {
        if (res.isValid && res.cert) {
          setMatchedCert(res.cert);
          setIsSignatureValid(res.isSignatureVerified);
          setIsPortableProof(true);
          setHasSearched(true);
          if (res.cert.certificateId) setSearchId(res.cert.certificateId);
          return;
        }
      });
    }

    if (verifyId && !proofParam) {
      setSearchId(verifyId);
      const found = certificates.find(
        (c) => c.certificateId.toLowerCase().trim() === verifyId.toLowerCase().trim()
      );
      if (found) {
        setMatchedCert(found);
        setIsPortableProof(false);
        setHasSearched(true);
      }
    }
  }, [initialCertId, certificates]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim();
    if (!query) return;

    // Check if user entered or pasted a portable proof token
    if (query.length > 50 && (query.includes('-') || query.includes('_') || query.includes('='))) {
      const res = await verifyPortableProofToken(query);
      if (res.isValid && res.cert) {
        setMatchedCert(res.cert);
        setIsSignatureValid(res.isSignatureVerified);
        setIsPortableProof(true);
        setHasSearched(true);
        return;
      }
    }

    const found = certificates.find(
      (c) => c.certificateId.toLowerCase().trim() === query.toLowerCase().trim()
    );
    setMatchedCert(found || null);
    setIsPortableProof(false);
    setHasSearched(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>🔍 Public Certificate of Authenticity Verification</h2>
            <p className="modal-subtitle">
              Verify artwork provenance, artist attribution, SHA-256 digests, and ECDSA P-256 studio digital signatures.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="verify-modal-body">
          <form onSubmit={handleSearch} className="verify-search-form">
            <div className="verify-search-row">
              <input
                type="text"
                placeholder="Enter Certificate ID (e.g. MK-COA-2026-7842) or Paste Cryptographic Proof Token..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="verify-input"
              />
              <button type="submit" className="btn btn-primary">
                Verify Authenticity
              </button>
            </div>
          </form>

          {hasSearched && !matchedCert && (
            <div className="verify-result-card invalid">
              <span className="verify-icon" aria-hidden="true">✕</span>
              <h3>No Certificate Found</h3>
              <p>
                Certificate identifier "<strong>{searchId}</strong>" was not found in the verified registry.
                Check the ID on the physical certificate or scan the official QR code again.
              </p>
            </div>
          )}

          {matchedCert && (
            <div className={`verify-result-card ${matchedCert.status === 'valid' ? 'valid' : 'revoked'}`}>
              <div className="verify-result-header">
                <div>
                  <div className="verify-badge-row">
                    <span className="verify-status-badge">
                      {matchedCert.status === 'valid' ? '✓ VERIFIED AUTHENTIC' : '⚠️ CERTIFICATE REVOKED'}
                    </span>
                    {isPortableProof && (
                      <span className="portable-proof-badge">
                        🌐 Cross-Device Verified Offline
                      </span>
                    )}
                    {isSignatureValid && (
                      <span className="ecdsa-verified-badge">
                        ✍️ ECDSA P-256 Signature Verified
                      </span>
                    )}
                  </div>
                  <h3 className="verify-artwork-title">{matchedCert.artworkTitle}</h3>
                  <div className="verify-artist-line">
                    By <strong>{matchedCert.artistName}</strong> ({matchedCert.yearCreated})
                  </div>
                </div>
                <div className="verify-cert-id-badge">{matchedCert.certificateId}</div>
              </div>

              <div className="verify-specs-grid">
                <div>
                  <span className="cert-label">Medium:</span>
                  <span className="cert-val">{matchedCert.medium}</span>
                </div>
                <div>
                  <span className="cert-label">Dimensions:</span>
                  <span className="cert-val">{matchedCert.dimensionsText}</span>
                </div>
                <div>
                  <span className="cert-label">Edition:</span>
                  <span className="cert-val">{matchedCert.editionText}</span>
                </div>
                <div>
                  <span className="cert-label">Issuance Date:</span>
                  <span className="cert-val">{matchedCert.issueDate}</span>
                </div>
              </div>

              <div className="verify-hash-container">
                <span className="hash-label">Cryptographic SHA-256 Digest:</span>
                <code className="hash-code">{matchedCert.sha256Fingerprint}</code>
              </div>

              {matchedCert.ecdsaSignature && (
                <div className="verify-hash-container">
                  <span className="hash-label">ECDSA P-256 Digital Signature:</span>
                  <code className="hash-code signature-code">{matchedCert.ecdsaSignature.slice(0, 48)}...</code>
                </div>
              )}

              {matchedCert.status === 'revoked' && (
                <div className="revocation-warning-banner">
                  <h4>⚠️ CERTIFICATE REVOKED</h4>
                  <p>
                    <strong>Revocation Reason:</strong> {matchedCert.revocationReason || 'Revoked by issuing artist/studio.'}
                  </p>
                  {matchedCert.revokedAt && (
                    <p><strong>Revoked On:</strong> {new Date(matchedCert.revokedAt).toLocaleString()}</p>
                  )}
                  {matchedCert.supersededByCertificateId && (
                    <p>
                      <strong>Replacement Certificate:</strong>{' '}
                      <span className="superseded-link">{matchedCert.supersededByCertificateId}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="verify-blockchain-status">
                <strong>Provenance Authority:</strong> {matchedCert.issuer}
                <p className="verify-disclaimer">
                  {matchedCert.legalNotice || "LEGAL TITLE NOTICE: This cryptographic digital certificate attests to the artwork attributes recorded by the artist's studio vault at issuance date. It establishes immutable cryptographic provenance but does not constitute a government-registered copyright, statutory title deed, or registered trademark without formal legal contracts of transfer."}
                </p>
              </div>
            </div>
          )}

          <div className="modal-actions-bar">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close Verification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
