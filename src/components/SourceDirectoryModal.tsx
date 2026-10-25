import React, { useEffect, useRef, useState } from 'react';
import { RegisteredSource, ReviewQueueItem } from '../types';

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
  const [activeTab, setActiveTab] = useState<'sources' | 'review'>('sources');
  const [reviewItems, setReviewItems] = useState<ReviewQueueItem[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();

      // Fetch review queue
      const baseUrl = import.meta.env.BASE_URL || '/';
      fetch(`${baseUrl.replace(/\/$/, '')}/data/review_queue.json`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.reviewItems) setReviewItems(data.reviewItems);
        })
        .catch(() => {});
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
          <div>
            <h2 id="sources-modal-title" className="modal-title">
              Source Registry & Data Integrity Audit
            </h2>
            <div className="tab-buttons" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
                onClick={() => setActiveTab('sources')}
              >
                Monitored Institutions ({sources.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                Internal Review Queue ({reviewItems.length})
              </button>
            </div>
          </div>
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
          {activeTab === 'sources' ? (
            <>
              <p className="notice-banner">
                Every published exhibition must be backed by an individual official exhibition announcement.
                Generic institution homepages are insufficient without specific event confirmation.
              </p>

              <div className="table-responsive">
                <table className="sources-table">
                  <thead>
                    <tr>
                      <th>Institution / Source</th>
                      <th>Location</th>
                      <th>Health</th>
                      <th>Method</th>
                      <th>Cadence</th>
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
                          <span className={`badge-health ${s.id.includes('jehangir') ? 'degraded' : 'healthy'}`}>
                            {s.id.includes('jehangir') ? 'Degraded' : 'Healthy'}
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
            </>
          ) : (
            <>
              <p className="notice-banner" style={{ backgroundColor: '#fffaf0', borderColor: '#feebc8', color: '#7b341e' }}>
                <strong>Quarantined Records:</strong> The following items lack individual exhibition catalogs,
                are permanent collections, or are pending organiser date confirmations. They are strictly excluded from the active confirmed feed.
              </p>

              <div className="table-responsive">
                <table className="sources-table">
                  <thead>
                    <tr>
                      <th>Provisional Title</th>
                      <th>Institution</th>
                      <th>Integrity Flag Reason</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewItems.map((item) => (
                      <tr key={item.id}>
                        <td><strong>{item.provisionalTitle}</strong></td>
                        <td>{item.institutionName}</td>
                        <td className="sub-text">{item.flagReason}</td>
                        <td>
                          <span className="badge-pill secondary">
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
