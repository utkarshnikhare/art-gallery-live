import React, { useEffect, useRef } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-card"
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="about-modal-title" className="modal-title">
            Field-Level Data Verification Policy
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body about-content">
          <h3>Non-Negotiable Data Integrity Protocol</h3>
          <p>
            Art Gallery Live is designed to be an uncompromisingly truthful directory of visual arts exhibitions.
            Every record in the confirmed feed must meet our strict verification criteria:
          </p>

          <ul>
            <li>
              <strong>Exhibition-Level Evidence:</strong> Generic institution homepages are insufficient.
              Every listing must be confirmed by an individual exhibition page, official curatorial statement, or organiser calendar entry.
            </li>
            <li>
              <strong>Field-Level Tracking:</strong> Each event explicitly publishes which fields have been verified
              (title, dates, venue, city, entry fee, organiser, timing).
            </li>
            <li>
              <strong>Honest Admission Fees:</strong> Free admission is never assumed. Unless the organiser explicitly
              confirms free entry, events are honestly marked <code>Fee: Check Organiser</code>.
            </li>
            <li>
              <strong>Authentic Ticket Links Only:</strong> "Book Tickets" buttons appear only when a genuine,
              authenticated booking or ticketing portal exists. No dead anchors or misleading buttons.
            </li>
            <li>
              <strong>Quarantine Review Queue:</strong> Unconfirmed leads, permanent collections, or rotating schedules
              without confirmed artist line-ups are held in a separate review queue and excluded from the public directory.
            </li>
            <li>
              <strong>Freshness & Expiry Protection:</strong> Multi-day exhibitions are evaluated against current date-time.
              Past exhibitions are automatically excluded from the upcoming directory.
            </li>
          </ul>

          <h3>Report an Inaccuracy or Schedule Change</h3>
          <p>
            Galleries and visitors can flag changes, postponements, or revised opening hours directly on our
            open issue tracker at <code>https://github.com/utkarshnikhare/art-gallery-live/issues</code>.
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
