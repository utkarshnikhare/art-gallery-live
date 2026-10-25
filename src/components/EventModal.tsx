import React, { useEffect, useRef } from 'react';
import { ArtEvent } from '../types';
import { calculateEventStatus, formatDateRange, formatInstantToIST } from '../utils/dateUtils';

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
  const formattedDates = formatDateRange(event.startDate, event.endDate, event.timeText, event.timezone);

  const reportUrl = `https://github.com/utkarshnikhare/art-gallery-live/issues/new?title=${encodeURIComponent(`[Event Correction] ${event.title}`)}&body=${encodeURIComponent(`Event ID: ${event.id}\nVenue: ${event.venueName}\nOfficial URL: ${event.officialUrl}\n\nPlease specify the updated dates, status, or fee:`)}`;

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
            <span>{event.organiser || 'Official Host'}</span>
          </div>

          <div className="modal-detail-row">
            <strong>📍 Venue & Address:</strong>
            <span>
              {event.venueName || ''}{event.address ? ` — ${event.address}` : ''} ({event.city}, {event.region}, {event.country})
            </span>
          </div>

          <div className="modal-detail-row">
            <strong>📅 Dates & Hours:</strong>
            <span>{formattedDates}</span>
          </div>

          <div className="modal-detail-row">
            <strong>🎟️ Admission:</strong>
            <span>
              {event.entryFee.type === 'free' && event.entryFee.isConfirmedByOrganiser
                ? 'Confirmed Free Public Admission'
                : event.entryFee.type === 'price'
                ? event.entryFee.amountText || 'Ticket required'
                : 'Fee not published on public portal — check with organiser before visiting'}
            </span>
          </div>

          <div className="modal-detail-row">
            <strong>🔍 Verification Evidence:</strong>
            <span>
              Verified by {event.sourceName} on {formatInstantToIST(event.lastVerifiedAt, { includeTime: true, includeZoneLabel: true })}
            </span>
            <div className="verified-fields-strip" style={{ marginTop: '4px' }}>
              <span className="field-label">Verified Fields:</span>
              {event.verifiedFields?.map(f => (
                <span key={f} className="field-tag">✓ {f}</span>
              ))}
            </div>
          </div>

          {event.description && (
            <div className="modal-description-box">
              <h4>Curatorial Statement & Notes</h4>
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
            Open Official Announcement ↗
          </a>

          {event.bookingUrl && (
            <a
              href={event.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-accent"
            >
              Book Tickets ↗
            </a>
          )}

          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            🚩 Report Correction
          </a>

          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
