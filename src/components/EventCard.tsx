import React from 'react';
import { ArtEvent } from '../types';
import { calculateEventStatus, formatDateRange, formatInstantToIST } from '../utils/dateUtils';

interface EventCardProps {
  event: ArtEvent;
  onOpenModal: (event: ArtEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onOpenModal }) => {
  const status = calculateEventStatus(event);
  const formattedDates = formatDateRange(event.startDate, event.endDate, event.timeText, event.timezone);

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

  const reportUrl = `https://github.com/utkarshnikhare/art-gallery-live/issues/new?title=${encodeURIComponent(`[Event Update] ${event.title}`)}&body=${encodeURIComponent(`Event ID: ${event.id}\nVenue: ${event.venueName}\nOfficial URL: ${event.officialUrl}\n\nPlease describe the correction (e.g. cancelled, date change, fee adjustment):`)}`;

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

      {/* Field-level verification badges */}
      <div className="card-badges">
        {/* Fee status */}
        {event.entryFee.type === 'free' && event.entryFee.isConfirmedByOrganiser ? (
          <span className="fee-badge free" title="Organiser explicitly confirmed free public admission">
            ✓ Confirmed Free Entry
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

        {/* Verification status badge */}
        {event.verificationStatus === 'official-event-verified' ? (
          <span className="verification-badge official" title="Verified against specific exhibition page and organizer announcement">
            ✓ Event Verified
          </span>
        ) : event.verificationStatus === 'organiser-confirmed' ? (
          <span className="verification-badge organiser" title="Confirmed by official festival/biennale organizer portal">
            ✓ Organiser Confirmed
          </span>
        ) : (
          <span className="verification-badge secondary" title="Secondary listing — check organiser page">
            Secondary Lead
          </span>
        )}

        {/* Freshness Badge */}
        {event.dataFreshness === 'stale' && (
          <span className="freshness-badge stale" title="Verification timestamp is older than 14 days without recheck">
            ⚠️ Needs Recheck
          </span>
        )}
      </div>

      {/* Verified fields indicator */}
      {event.verifiedFields && event.verifiedFields.length > 0 && (
        <div className="verified-fields-strip" title="Fields verified against official source">
          <span className="field-label">Verified:</span>
          {event.verifiedFields.map(field => (
            <span key={field} className="field-tag">✓ {field}</span>
          ))}
          {event.lastCheckedAt && (
            <span className="field-tag freshness-tag" title="Last checked in Indian Standard Time (IST)">
              {formatInstantToIST(event.lastCheckedAt, { includeTime: false })}
            </span>
          )}
        </div>
      )}

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

        <a
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-report-link"
          title="Report an error, cancellation, or schedule change"
        >
          🚩 Report Issue
        </a>
      </div>
    </article>
  );
};
