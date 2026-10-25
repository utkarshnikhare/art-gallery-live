import React, { useEffect, useRef } from 'react';
import { ArtEvent } from '../types';
import { calculateEventStatus, formatDateRange } from '../utils/dateUtils';

interface EventModalProps {
  event: ArtEvent | null;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (event) {
      window.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [event, onClose]);

  if (!event) return null;

  const status = calculateEventStatus(event);
  const formattedDates = formatDateRange(event.startDate, event.endDate, event.timeText);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-event-title"
      onClick={onClose}
    >
      <div
        className="modal-card"
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="category-pill">{event.category}</span>
            <span className={`status-badge ${status}`} style={{ marginLeft: '8px' }}>
              {status === 'happening-now' ? '● Happening Now' : status === 'upcoming' ? 'Upcoming' : 'Past'}
            </span>
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

        <h2 id="modal-event-title" className="modal-title">
          {event.title}
        </h2>

        <div className="modal-body">
          <div className="modal-detail-row">
            <strong>🏛️ Organiser / Institution:</strong>
            <span>{event.organiser || 'Official Organiser'}</span>
          </div>

          <div className="modal-detail-row">
            <strong>📍 Venue & Address:</strong>
            <span>
              {event.venueName || ''}{event.address ? ` — ${event.address}` : ''} ({event.city}, {event.region}, {event.country})
            </span>
          </div>

          <div className="modal-detail-row">
            <strong>📅 Dates & Timing:</strong>
            <span>{formattedDates}</span>
          </div>

          <div className="modal-detail-row">
            <strong>🎟️ Admission:</strong>
            <span>
              {event.entryFee.type === 'free'
                ? 'Free Public Admission'
                : event.entryFee.type === 'price'
                ? event.entryFee.amountText || 'Ticket required'
                : 'Fee not published / Check official organiser page'}
            </span>
          </div>

          <div className="modal-detail-row">
            <strong>🔍 Source Verification:</strong>
            <span>
              {event.sourceName} ({event.sourceType === 'official' ? 'Official Primary Source' : 'Secondary Listing'}) — Checked: {new Date(event.lastCheckedAt).toLocaleDateString()}
            </span>
          </div>

          {event.description && (
            <div className="modal-description-box">
              <h4>About this exhibition</h4>
              <p>{event.description}</p>
            </div>
          )}

          {event.registrationDeadline && (
            <div className="modal-alert-box">
              ⚠️ <strong>Registration Deadline:</strong> {event.registrationDeadline}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <a
            href={event.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Visit Official Source Page ↗
          </a>

          {event.bookingUrl && (
            <a
              href={event.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent"
            >
              Book / Register Tickets ↗
            </a>
          )}

          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
