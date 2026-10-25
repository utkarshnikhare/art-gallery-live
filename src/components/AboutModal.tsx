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
            About Art Gallery Live Data
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
          <h3>Truthful Art Discovery</h3>
          <p>
            Art Gallery Live was built to solve the frustration of finding reliable, active cultural events.
            Unlike platforms with expired posters or unverified listings, our dataset follows strict verification rules:
          </p>

          <ul>
            <li>
              <strong>Verified Official Sources:</strong> Every exhibition is validated against official gallery,
              museum, or festival announcements.
            </li>
            <li>
              <strong>No Guesswork on Fees:</strong> If an admission fee is not explicitly stated on the official page,
              we honestly display "Fee: Check Organiser" rather than assuming free entry.
            </li>
            <li>
              <strong>Real Links Only:</strong> "Book / Register" buttons are only shown when an actual official ticketing
              or registration link exists. No placeholder buttons or dead <code>#</code> anchors.
            </li>
            <li>
              <strong>Daily Synchronization:</strong> Our pipeline runs daily and preserves the last known-good dataset
              if an upstream source experiences downtime.
            </li>
          </ul>

          <h3>Geographic Priority</h3>
          <p>
            1. Pune and Pimpri-Chinchwad<br />
            2. Mumbai, Navi Mumbai, and Thane<br />
            3. Maharashtra and broader India<br />
            4. Landmark international biennales and exhibitions
          </p>

          <h3>Report an Inaccuracy</h3>
          <p>
            If you notice an exhibition has been rescheduled, closed early, or postponed, you can report it to
            our open repository at <code>https://github.com/utkarshnikhare/art-gallery-live/issues</code>.
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
