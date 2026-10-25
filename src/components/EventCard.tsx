import React from 'react';
import { ArtEvent } from '../types';
import { calculateEventStatus, formatDateRange } from '../utils/dateUtils';

interface EventCardProps {
  event: ArtEvent;
  onOpenModal: (event: ArtEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onOpenModal }) => {
  const status = calculateEventStatus(event);
  const formattedDates = formatDateRange(event.startDate, event.endDate, event.timeText);

  // Category labels
  const categoryLabels: Record<string, string> = {
    'exhibition': 'Exhibition',
    'gallery-show': 'Gallery Show',
    'art-fair': 'Art Fair',
    'workshop': 'Workshop',
    'artist-talk': 'Artist Talk',
    'biennale': 'Biennale',
    'open-studio': 'Open Studio',
    'other': 'Visual Art',
  };

  return (
    <article className="event-card" aria-labelledby={`event-title-${event.id}`}>
      <div className="card-top">
        <span className="category-pill">{categoryLabels[event.category] || event.category}</span>
        
        {status === 'happening-now' ? (
          <span className="status-badge ongoing" title="Exhibition is currently open to the public">
            ● Happening Now
          </span>
        ) : status === 'upcoming' ? (
          <span className="status-badge upcoming">
            Upcoming
          </span>
        ) : (
          <span className="status-badge past">
            Past
          </span>
        )}
      </div>

      <h3 id={`event-title-${event.id}`} className="card-title">
        {event.title}
      </h3>

      {event.organiser && (
        <div className="card-organiser">
          <span className="icon" aria-hidden="true">🏛️</span>
          <span>{event.organiser}</span>
        </div>
      )}

      <div className="card-location">
        <span className="icon" aria-hidden="true">📍</span>
        <span>
          {event.venueName ? `${event.venueName}, ` : ''}{event.city}, {event.country}
        </span>
      </div>

      <div className="card-date">
        <span className="icon" aria-hidden="true">📅</span>
        <span className="date-text">{formattedDates}</span>
      </div>

      <div className="card-badges">
        {/* Fee status */}
        {event.entryFee.type === 'free' ? (
          <span className="fee-badge free" title="Verified free public entry">
            ✓ Free Admission
          </span>
        ) : event.entryFee.type === 'price' ? (
          <span className="fee-badge paid" title="Paid ticket required">
            🎟️ {event.entryFee.amountText || 'Ticket Required'}
          </span>
        ) : (
          <span className="fee-badge unknown" title="Entry fee not explicitly published in official sources">
            ℹ️ Fee: Check Organiser
          </span>
        )}

        {/* Verification status */}
        {event.sourceType === 'official' && event.verificationStatus === 'official-checked' ? (
          <span className="verification-badge official" title="Verified against official museum/gallery announcements">
            ✓ Official Source
          </span>
        ) : (
          <span className="verification-badge secondary" title="Secondary listing — please verify with organiser">
            Secondary Listing
          </span>
        )}
      </div>

      {event.description && (
        <p className="card-description">
          {event.description.length > 130
            ? `${event.description.substring(0, 130)}…`
            : event.description}
        </p>
      )}

      <div className="card-actions">
        <a
          href={event.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm external-link"
          aria-label={`View official details for ${event.title} on ${event.sourceName}`}
        >
          Official Details ↗
        </a>

        {event.bookingUrl && (
          <a
            href={event.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent btn-sm external-link"
            aria-label={`Book or register for ${event.title}`}
          >
            Book / Register ↗
          </a>
        )}

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => onOpenModal(event)}
          aria-label={`More details about ${event.title}`}
        >
          More Info
        </button>
      </div>
    </article>
  );
};
