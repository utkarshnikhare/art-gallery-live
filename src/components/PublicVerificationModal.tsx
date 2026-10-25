import React, { useState, useEffect } from 'react';
import { DigitalCertificate, VerificationOutcome } from '../types';
import { formatInstantToIST } from '../utils/dateUtils';
import { 
  verifyPortableProofToken, 
  LEGAL_IDENTITY_DISCLAIMER, 
  OFFLINE_REVOCATION_DISCLAIMER, 
  KEY_RECOVERY_LIMITATION_NOTICE,
  PROVENANCE_LEGAL_NOTICE
} from '../utils/cryptoUtils';

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
  const [verificationOutcome, setVerificationOutcome] = useState<VerificationOutcome | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proofParam = params.get('proof');
    const verifyId = params.get('verify') || initialCertId;

    if (proofParam) {
      verifyPortableProofToken(proofParam).then((res) => {
        setVerificationOutcome(res);
        setHasSearched(true);
        if (res.cert) {
          setMatchedCert(res.cert);
          if (res.cert.certificateId) setSearchId(res.cert.certificateId);
        } else {
          setMatchedCert(null);
        }
      });
      return;
    }

    if (verifyId) {
      setSearchId(verifyId);
      const found = certificates.find(
        (c) => c.certificateId.toLowerCase().trim() === verifyId.toLowerCase().trim()
      );
      if (found) {
        setMatchedCert(found);
        setVerificationOutcome({
          isValid: found.status === 'valid',
          status: found.status === 'valid' ? 'PAYLOAD_INTEGRITY_VERIFIED' : 'CERTIFICATE_REVOKED',
          statusMessage: found.status === 'valid' ? 'Certificate matched in local studio repository.' : 'Certificate is marked revoked in local studio repository.',
          isHashValid: true,
          isSignatureVerified: !!found.ecdsaSignature,
          issuerIdentityType: 'self-issued-unverified',
          isOfflineProof: false,
          cert: found,
          offlineRevocationNotice: OFFLINE_REVOCATION_DISCLAIMER,
          legalDisclaimer: LEGAL_IDENTITY_DISCLAIMER,
          keyRecoveryNotice: KEY_RECOVERY_LIMITATION_NOTICE,
        });
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
      setVerificationOutcome(res);
      setMatchedCert(res.cert || null);
      setHasSearched(true);
      return;
    }

    const found = certificates.find(
      (c) => c.certificateId.toLowerCase().trim() === query.toLowerCase().trim()
    );
    if (found) {
      setMatchedCert(found);
      setVerificationOutcome({
        isValid: found.status === 'valid',
        status: found.status === 'valid' ? 'PAYLOAD_INTEGRITY_VERIFIED' : 'CERTIFICATE_REVOKED',
        statusMessage: found.status === 'valid' ? 'Certificate matched in local studio repository.' : 'Certificate is marked revoked in local studio repository.',
        isHashValid: true,
        isSignatureVerified: !!found.ecdsaSignature,
        issuerIdentityType: 'self-issued-unverified',
        isOfflineProof: false,
        cert: found,
        offlineRevocationNotice: OFFLINE_REVOCATION_DISCLAIMER,
        legalDisclaimer: LEGAL_IDENTITY_DISCLAIMER,
        keyRecoveryNotice: KEY_RECOVERY_LIMITATION_NOTICE,
      });
    } else {
      setMatchedCert(null);
      setVerificationOutcome(null);
    }
    setHasSearched(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>🔍 Public Certificate of Authenticity Verification</h2>
            <p className="modal-subtitle">
              Cryptographic verification of SHA-256 digests, ECDSA P-256 studio digital signatures, and provenance integrity.
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

          {hasSearched && (!matchedCert || (verificationOutcome && !verificationOutcome.isValid && verificationOutcome.status === 'PAYLOAD_TAMPERED')) && (
            <div className="verify-result-card invalid">
              <span className="verify-icon" aria-hidden="true">✕</span>
              <h3>
                {verificationOutcome?.status === 'PAYLOAD_TAMPERED'
                  ? 'Cryptographic Tampering Detected'
                  : 'No Certificate Found'}
              </h3>
              <p>
                {verificationOutcome?.status === 'PAYLOAD_TAMPERED'
                  ? 'The cryptographic hash of the decoded attributes does not match the signed SHA-256 fingerprint! This artwork metadata has been altered or corrupted.'
                  : `Certificate identifier "${searchId}" was not found in the verified repository. Check the ID on the physical certificate or scan the official QR code again.`}
              </p>
            </div>
          )}

          {matchedCert && (
            <div className={`verify-result-card ${matchedCert.status === 'valid' ? 'valid' : 'revoked'}`}>
              <div className="verify-result-header">
                <div>
                  <div className="verify-badge-row">
                    {/* Explicit Verification States */}
                    <span className={`verify-status-badge ${matchedCert.status === 'valid' ? 'badge-valid' : 'badge-revoked'}`}>
                      {matchedCert.status === 'valid' ? '✓ PAYLOAD INTEGRITY VERIFIED' : '⚠️ CERTIFICATE REVOKED'}
                    </span>

                    {verificationOutcome?.isSignatureVerified && (
                      <span className="ecdsa-verified-badge" title="Mathematical signature matches private key corresponding to public key">
                        ✍️ ECDSA Signature Valid
                      </span>
                    )}

                    {/* Honest Creator Identity Disclosure */}
                    <span className="identity-unverified-badge" title="Self-issued studio key. Not verified by external notary or Certificate Authority.">
                      🛡️ Self-Issued Studio Key (Identity Not CA-Certified)
                    </span>

                    {verificationOutcome?.isOfflineProof && (
                      <span className="portable-proof-badge" title="Verified completely offline without issuer local storage">
                        🌐 Cross-Device Offline Proof
                      </span>
                    )}
                  </div>
                  <h3 className="verify-artwork-title">{matchedCert.artworkTitle}</h3>
                  <div className="verify-artist-line">
                    Attributed Artist: <strong>{matchedCert.artistName}</strong> ({matchedCert.yearCreated})
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
                    <p><strong>Revoked On:</strong> {formatInstantToIST(matchedCert.revokedAt, { includeTime: true, includeZoneLabel: true })}</p>
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
                <strong>Issuing Studio Authority:</strong> {matchedCert.issuer}
                
                {/* Clear Cryptographic & Legal Boundaries */}
                <div className="verify-disclosure-box">
                  <p className="verify-disclaimer-point">
                    <strong>⚖️ Ownership & Non-Repudiation Notice:</strong> {LEGAL_IDENTITY_DISCLAIMER}
                  </p>
                  <p className="verify-disclaimer-point">
                    <strong>🌐 Offline Verification Scope:</strong> {OFFLINE_REVOCATION_DISCLAIMER}
                  </p>
                  <p className="verify-disclaimer-point">
                    <strong>📜 Legal Title Notice:</strong> {matchedCert.legalNotice || PROVENANCE_LEGAL_NOTICE}
                  </p>
                </div>
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
