import React, { useEffect, useRef } from 'react';
import { RegisteredSource } from '../types';

interface SourceDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: RegisteredSource[];
}

export const SourceDirectoryModal: React.FC<SourceDirectoryModalProps> = ({
  isOpen,
  onClose,
  sources,
}) => {
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
      aria-labelledby="sources-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-card wide"
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="sources-modal-title" className="modal-title">
            Verified Source Registry & Coverage
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

        <div className="modal-body">
          <p className="notice-banner">
            Art Gallery Live only features real public events from official museum, gallery, and biennial portals.
            Every record is linked directly to the organiser’s official page.
          </p>

          <div className="table-responsive">
            <table className="sources-table">
              <thead>
                <tr>
                  <th>Institution / Source</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Collection Method</th>
                  <th>Refresh</th>
                  <th>Official Portal</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <div className="sub-text">{s.knownLimitations}</div>
                    </td>
                    <td>{s.city}, {s.country}</td>
                    <td>
                      <span className={`badge-pill ${s.sourceType}`}>
                        {s.sourceType}
                      </span>
                    </td>
                    <td><code>{s.collectionMethod}</code></td>
                    <td>{s.refreshFrequency}</td>
                    <td>
                      <a
                        href={s.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="table-link"
                      >
                        Visit Portal ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
