import { useState } from "react";
import { useScanner } from "../../hooks/useScanner";
import { verifyTicket } from "../../services/ticketService";
import { playBeep } from "../../utils/beep";

const INVALID_REASONS = {
  TICKET_NOT_FOUND: "Ticket does not exist",
  WRONG_EVENT: "Ticket is for a different event",
  ALREADY_USED: "Ticket already used — DENY ENTRY",
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function GatePanel({ token, eventId, onVerified }) {
  const [manualId, setManualId] = useState("");
  const [resultState, setResultState] = useState("idle"); // idle | loading | valid | invalid
  const [validData, setValidData] = useState(null);
  const [invalidData, setInvalidData] = useState(null);

  async function handleVerify(ticketId) {
    if (!ticketId) return;
    setResultState("loading");
    try {
      const data = await verifyTicket(ticketId, eventId, token);
      if (data.valid) {
        setValidData(data);
        setResultState("valid");
        playBeep(880, 150, "success");
        onVerified();
      } else {
        setInvalidData(data);
        setResultState("invalid");
        playBeep(220, 300, "error");
      }
    } catch {
      setResultState("idle");
    }
  }

  const scanner = useScanner(handleVerify);

  return (
    <div className="admin-layout">
      <div className="scan-panel">
        <div className="scan-panel-header">
          <div className="section-label">// QR SCANNER</div>
          <button className="toggle-scanner-btn" style={scanner.active ? { background: "var(--red)" } : undefined} onClick={() => (scanner.active ? scanner.stop() : scanner.start())}>
            {scanner.active ? "Stop Camera" : "Start Camera"}
          </button>
        </div>
        <div className="scanner-box">
          <div id="qr-reader" />
          <div className="scanner-overlay">
            <div className="scanner-corner tl" />
            <div className="scanner-corner tr" />
            <div className="scanner-corner bl" />
            <div className="scanner-corner br" />
            <div className="scanner-line" />
          </div>
          <p className="scanner-hint">Point camera at ticket QR code</p>
        </div>
        <div className="manual-entry">
          <div className="manual-divider">
            <span>or enter manually</span>
          </div>
          <div className="manual-input-row">
            <div className="field-wrap" style={{ flex: 1 }}>
              <input
                type="text"
                className="field-input"
                placeholder="TKT-XXXX-XXXXXXXX"
                style={{ textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleVerify(manualId.trim().toUpperCase());
                    setManualId("");
                  }
                }}
              />
              <div className="field-border" />
            </div>
            <button
              className="verify-manual-btn"
              onClick={() => {
                if (!manualId.trim()) return;
                handleVerify(manualId.trim().toUpperCase());
                setManualId("");
              }}
            >
              Verify
            </button>
          </div>
        </div>
      </div>

      <div className="result-panel">
        <div className="section-label">// VERIFICATION RESULT</div>

        {resultState === "idle" && (
          <div className="result-idle">
            <div className="result-idle-icon">🎟️</div>
            <p>Scan a QR code or enter a ticket ID to verify entry</p>
          </div>
        )}

        {resultState === "loading" && (
          <div className="result-loading">
            <div className="loader-ring" />
            <p>Verifying ticket...</p>
          </div>
        )}

        {resultState === "valid" && validData && (
          <div className="result-card valid">
            <div className="result-status valid-status">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 14l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              VALID — ENTRY ALLOWED
            </div>
            <div className="result-attendee">
              <img src={validData.ticket.imageUrl || ""} alt="Attendee" className="result-photo" />
              <div className="result-info">
                <div className="result-name">{validData.ticket.name}</div>
                <div className="result-phone">{validData.ticket.phone}</div>
                <div className="result-ticket-id">{validData.ticket.ticketId}</div>
                <div className="result-ticket-type">{validData.ticket.ticketTypeLabel || "General Admission"}</div>
              </div>
            </div>
            <div className="result-amount">Paid: ₹{validData.ticket.amount}</div>
            <button className="scan-next-btn" onClick={() => setResultState("idle")}>
              Scan Next →
            </button>
          </div>
        )}

        {resultState === "invalid" && invalidData && (
          <div className="result-card invalid">
            <div className="result-status invalid-status">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 9l10 10M19 9L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              DENIED — DO NOT ALLOW ENTRY
            </div>
            <div className="invalid-reason">{INVALID_REASONS[invalidData.reason] || invalidData.message || "Invalid ticket"}</div>
            <div className="invalid-detail">{invalidData.ticket?.usedAt ? `Used at: ${formatDate(invalidData.ticket.usedAt)}` : ""}</div>
            <button className="scan-next-btn" onClick={() => setResultState("idle")}>
              Scan Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
