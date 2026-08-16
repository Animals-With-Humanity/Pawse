import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/common/Header";
import TicketListItem from "../../components/ticket/TicketListItem";
import { findTicketsByPhone } from "../../services/ticketService";
import { isValidIndianMobile, normalizePhone } from "../../utils/validators";
import { EVENT_ID } from "../../config/app";

export default function MyTicketsPage() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState(null); // null = not searched yet
  const [searchError, setSearchError] = useState("");

  async function handleSearch() {
    const cleaned = normalizePhone(phone);
    if (!isValidIndianMobile(cleaned)) {
      setError("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setError("");
    setLoading(true);
    setSearchError("");
    try {
      const data = await findTicketsByPhone(cleaned, EVENT_ID);
      setTickets(data.tickets || []);
    } catch (err) {
      setSearchError(err.message || "Failed to fetch tickets");
      setTickets(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main
        style={{
          maxWidth: 600,
          margin: "100px auto 40px",
          padding: "2rem",
          background: "rgba(255,255,255,0.15)",
          border: "2px solid rgba(255,255,255,0.3)",
          borderRadius: 24,
          backdropFilter: "blur(12px)",
        }}
      >
        <h2 className="section-title" style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "0.5rem", color: "white" }}>
          Find My Tickets 🐱
        </h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", marginBottom: "2rem" }}>
          Enter the phone number used during booking
        </p>

        <div className="field-group">
          <label className="field-label" htmlFor="phone-search">
            Phone Number
          </label>
          <div className="field-wrap phone-wrap">
            <span className="phone-prefix">+91</span>
            <input
              type="tel"
              id="phone-search"
              className={"field-input phone-input" + (error ? " error" : "")}
              placeholder="98765 43210"
              maxLength={10}
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <div className="field-border" />
          </div>
          <span className="field-error">{error}</span>
        </div>

        <button
          className="cta-btn"
          style={{ width: "100%", marginTop: "1rem", display: "flex", justifyContent: "center" }}
          disabled={loading}
          onClick={handleSearch}
        >
          {loading ? "Searching..." : "Search Tickets"}
        </button>

        <div className="ticket-list" style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {searchError && <p style={{ textAlign: "center", color: "var(--red)" }}>{searchError}</p>}

          {tickets && tickets.length > 0 && (
            <>
              <div className="ticket-summary-banner">
                <span className="tsb-icon">🎟️</span>
                <span className="tsb-text">
                  {tickets.length} ticket{tickets.length > 1 ? "s" : ""} found
                </span>
              </div>
              {tickets.map((t) => (
                <TicketListItem key={t.ticketId} ticket={t} />
              ))}
              {tickets.length > 1 && (
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <Link
                    to={`/ticket?ids=${tickets.map((t) => t.ticketId).join(",")}`}
                    className="view-btn"
                    style={{ display: "inline-flex", gap: "0.5rem", padding: "0.75rem 1.5rem" }}
                  >
                    🎟️ View All {tickets.length} Tickets Together
                  </Link>
                </div>
              )}
            </>
          )}

          {tickets && tickets.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-dim)" }}>No tickets found for this number.</p>
          )}
        </div>
      </main>
    </>
  );
}
