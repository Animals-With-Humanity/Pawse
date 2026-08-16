export default function TicketTypeSelector({ ticketTypes, loading, loaded, selectedId, onSelect }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "1rem 0", color: "#9CA3AF", fontFamily: "Montserrat, sans-serif", fontSize: "0.85rem" }}>
        Loading ticket options...
      </div>
    );
  }

  if (!loaded) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "1.5rem 1rem",
          color: "#ef4444",
          fontFamily: "Montserrat, sans-serif",
          fontSize: "0.85rem",
          border: "1.5px dashed #fca5a5",
          borderRadius: 12,
          background: "rgba(239,68,68,0.04)",
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠️</div>
        <div style={{ fontWeight: 600 }}>No ticket types available for this event.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {ticketTypes.map((type) => {
        const selected = selectedId === type.id;
        let availText = "";
        if (type.soldOut) availText = "Sold out";
        else if (type.remaining !== null && type.remaining <= 20) availText = `${type.remaining} left`;
        else if (type.remaining !== null) availText = `${type.remaining} available`;

        return (
          <div
            key={type.id}
            className={"ticket-type-card" + (type.soldOut ? " sold-out" : "") + (selected ? " selected" : "")}
            onClick={() => !type.soldOut && onSelect(type)}
            style={{ position: "relative" }}
          >
            {type.soldOut && <span className="sold-out-badge">SOLD OUT</span>}
            <div className="ticket-type-card-left">
              <div className="ticket-type-radio">
                <div className="ticket-type-radio-dot" style={{ display: selected ? "block" : "none" }} />
              </div>
              <div className="ticket-type-info">
                <span className="ticket-type-name">{type.label}</span>
                {type.description && <span className="ticket-type-desc">{type.description}</span>}
              </div>
            </div>
            <div className="ticket-type-right">
              <span className="ticket-type-price">₹{type.price}</span>
              {availText && (
                <span className={"ticket-type-avail" + (type.remaining !== null && type.remaining <= 10 && !type.soldOut ? " low" : "")}>
                  {availText}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
