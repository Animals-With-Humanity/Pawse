export default function EventDetails({ event }) {
  return (
    <aside className="event-info">
      <div className="info-card">
        <div className="info-card-label">EVENT</div>
        <div className="info-card-title">{event.name.toUpperCase()} 🐱</div>

        <div className="info-detail">
          <span className="info-icon">📅</span>
          <div>
            <div className="info-detail-title">Date &amp; Time</div>
            <div className="info-detail-val">
              {event.dateShort} | {event.time}
            </div>
          </div>
        </div>
        <div className="info-detail">
          <span className="info-icon">📍</span>
          <div>
            <div className="info-detail-title">Venue</div>
            <a className="info-detail-val" href={event.venueMapUrl} style={{ textDecoration: "none" }} target="_blank" rel="noreferrer">
              {event.venue}
            </a>
          </div>
        </div>
        <div className="info-detail">
          <span className="info-icon">🎟️</span>
          <div>
            <div className="info-detail-title">Pass Type</div>
            <div className="info-detail-val">{event.passType}</div>
          </div>
        </div>
      </div>

      {event.perks?.length > 0 && (
        <div className="info-card perks-card">
          <div className="info-card-label">INCLUDED</div>
          <ul className="perks-list">
            {event.perks.map((perk) => (
              <li key={perk} className="perk-item">
                <span className="perk-check">✓</span>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
