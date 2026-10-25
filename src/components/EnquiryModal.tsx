import React, { useState, useEffect } from 'react';
import { ArtEnquiryPayload } from '../types';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem?: {
    type: 'artwork' | 'designer';
    title: string;
    targetName: string;
    contactEmail?: string;
    inquiryUrl?: string;
  } | null;
}

export const EnquiryModal: React.FC<EnquiryModalProps> = ({
  isOpen,
  onClose,
  initialItem,
}) => {
  const [formData, setFormData] = useState<ArtEnquiryPayload>({
    specifierName: '',
    firmName: '',
    contactEmail: '',
    contactPhone: '',
    projectType: 'Luxury Residential',
    targetSpace: '',
    dimensionsRequired: '',
    budgetRange: 'Flexible / Professional Quote',
    timeline: '',
    isCustomCommission: false,
    notes: '',
    targetItemTitle: initialItem?.title || '',
    targetArtistOrStudio: initialItem?.targetName || '',
    recipientEmail: initialItem?.contactEmail || '',
  });

  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialItem) {
      setFormData((prev) => ({
        ...prev,
        targetItemTitle: initialItem.title,
        targetArtistOrStudio: initialItem.targetName,
        recipientEmail: initialItem.contactEmail || prev.recipientEmail,
      }));
    }
  }, [initialItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const generatedBrief = `
ART SOURCING & ARCHITECTURAL SPECIFICATION ENQUIRY
===================================================
Project Type: ${formData.projectType}
Specifier / Studio: ${formData.specifierName}${formData.firmName ? ` (${formData.firmName})` : ''}
Contact: ${formData.contactEmail} ${formData.contactPhone ? `| ${formData.contactPhone}` : ''}
Target Sourcing Item: ${formData.targetItemTitle || 'General Art Consultation'}
Artist / Studio Reference: ${formData.targetArtistOrStudio || 'General Sourcing'}

SPECIFICATIONS:
- Target Space: ${formData.targetSpace || 'Not specified'}
- Wall / Floor Dimensions: ${formData.dimensionsRequired || 'To be determined'}
- Budget Range: ${formData.budgetRange}
- Desired Timeline: ${formData.timeline || 'Flexible'}
- Custom Commission Requested: ${formData.isCustomCommission ? 'YES' : 'NO'}

ADDITIONAL ARCHITECTURAL NOTES & PALETTE REQUIREMENTS:
${formData.notes || 'None provided.'}
===================================================
Generated via Art Gallery Live Professional Sourcing
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedBrief).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const mailtoRecipient = formData.recipientEmail || 'info@artgallerylive.internal';
  const mailtoSubject = encodeURIComponent(`Art Specification Enquiry: ${formData.targetItemTitle || 'Project Inquiry'} [${formData.firmName || formData.specifierName || 'Client'}]`);
  const mailtoBody = encodeURIComponent(generatedBrief);
  const mailtoLink = `mailto:${mailtoRecipient}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="enquiry-modal-title">
      <div className="modal-content enquiry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="enquiry-modal-title" className="modal-title">
              📋 Professional Art Sourcing Specification
            </h2>
            <p className="modal-subtitle">
              Draft formal art procurement briefs for interior design projects, collectors, and architectural installations.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="enquiry-grid-layout">
          <form className="enquiry-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group-row">
              <div className="form-field">
                <label htmlFor="specifierName">Your Name / Title *</label>
                <input
                  id="specifierName"
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins (Principal Architect)"
                  value={formData.specifierName}
                  onChange={(e) => setFormData({ ...formData, specifierName: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="firmName">Design Studio / Architecture Firm</label>
                <input
                  id="firmName"
                  type="text"
                  placeholder="e.g. Jenkins & Associates Interior Architecture"
                  value={formData.firmName}
                  onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label htmlFor="contactEmail">Professional Email *</label>
                <input
                  id="contactEmail"
                  type="email"
                  required
                  placeholder="name@designstudio.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="contactPhone">Phone / WhatsApp</label>
                <input
                  id="contactPhone"
                  type="tel"
                  placeholder="+91 / +44 / +1 …"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label htmlFor="projectType">Project Type</label>
                <select
                  id="projectType"
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                >
                  <option value="Luxury Residential">Luxury Residential Penthouse / Villa</option>
                  <option value="Boutique Hospitality">Boutique Hospitality / Hotel Suite</option>
                  <option value="Corporate Art Programme">Corporate HQ / Executive Boardroom</option>
                  <option value="Cultural / Museum Space">Cultural / Museum Installation</option>
                  <option value="Commercial Retail">High-End Retail / Dining Salon</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="budgetRange">Budget Range</label>
                <select
                  id="budgetRange"
                  value={formData.budgetRange}
                  onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                >
                  <option value="Flexible / Professional Quote">Flexible / Professional Quote</option>
                  <option value="INR 1,00,000 – INR 5,00,000">INR 1,00,000 – INR 5,00,000</option>
                  <option value="INR 5,00,000 – INR 25,00,000">INR 5,00,000 – INR 25,00,000</option>
                  <option value="INR 25,00,000+ (Monumental / Primary)">INR 25,00,000+ (Monumental / Primary)</option>
                  <option value="$5,000 – $25,000 USD">$5,000 – $25,000 USD</option>
                  <option value="$25,000 – $100,000+ USD">$25,000 – $100,000+ USD</option>
                </select>
              </div>
            </div>

            <div className="form-group-row">
              <div className="form-field">
                <label htmlFor="targetSpace">Target Space & Wall Dimensions</label>
                <input
                  id="targetSpace"
                  type="text"
                  placeholder="e.g. Double-height lobby wall (4.5m H × 6m W)"
                  value={formData.targetSpace}
                  onChange={(e) => setFormData({ ...formData, targetSpace: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label htmlFor="timeline">Desired Installation Timeline</label>
                <input
                  id="timeline"
                  type="text"
                  placeholder="e.g. Q1 2027 Handover / 8-12 weeks"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                />
              </div>
            </div>

            <div className="form-field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isCustomCommission}
                  onChange={(e) => setFormData({ ...formData, isCustomCommission: e.target.checked })}
                />
                <span>Request Custom Site-Specific Commission / Sizing Adaptation</span>
              </label>
            </div>

            <div className="form-field">
              <label htmlFor="notes">Architectural Palette, Lighting & Specific Requirements</label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Describe surrounding materials (e.g., travertine, fluted oak, brass), desired colour balance, or acoustic considerations…"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </form>

          {/* Generated Specification Preview Panel */}
          <div className="enquiry-preview-panel">
            <div className="preview-header">
              <h3>Specification Preview</h3>
              <span className="live-pill">Live Draft</span>
            </div>

            <pre className="specification-code-block">{generatedBrief}</pre>

            <div className="enquiry-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopy}
              >
                {copied ? '✓ Copied to Clipboard!' : '📋 Copy Specification'}
              </button>

              <a
                href={mailtoLink}
                className="btn btn-secondary"
              >
                ✉️ Send via Email Client ↗
              </a>

              {initialItem?.inquiryUrl && (
                <a
                  href={initialItem.inquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  Visit Official Portal ↗
                </a>
              )}
            </div>

            <div className="privacy-reassurance">
              🔒 <strong>Client-side Guarantee:</strong> This enquiry is drafted securely in your browser. No private project data or client budgets are transmitted to third-party databases.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
