import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/common/Header";
import TicketCard from "../../components/ticket/TicketCard";
import { getTicket } from "../../services/ticketService";
import { getEventContent } from "../../services/eventContentService";
import { downloadTicketImage, shareTicketLink } from "../../utils/ticketActions";
import { launchConfetti } from "../../utils/confetti";
import { useToast } from "../../context/ToastContext";
import { EVENT_ID } from "../../config/app";

export default function TicketPage() {
  const [params] = useSearchParams();
  const showToast = useToast();

  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [event, setEvent] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState(null);

  const confettiRef = useRef(null);
  const cardRefs = useRef({});

  const singleId = params.get("id");
  const multiIds = params.get("ids");
  const bogoId = params.get("bogo");

  let ticketIds = [];
  if (multiIds) ticketIds = multiIds.split(",").filter(Boolean);
  else if (singleId) {
    ticketIds = [singleId];
    if (bogoId) ticketIds.push(bogoId);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ticketIds.length) {
        setErrored(true);
        setLoading(false);
        return;
      }
      try {
        const [content, ...results] = await Promise.all([
          getEventContent(EVENT_ID),
          ...ticketIds.map((id) => getTicket(id).catch(() => null)),
        ]);
        const loaded = results.filter((r) => r && r.ticket).map((r) => r.ticket);
        if (cancelled) return;
        if (loaded.length === 0) {
          setErrored(true);
        } else {
          setEvent(content);
          setTickets(loaded);
          const fromPayment = document.referrer.includes(window.location.origin) || params.get("new") === "1" || multiIds;
          if (fromPayment) setTimeout(() => launchConfetti(confettiRef.current), 400);
        }
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiIds, singleId, bogoId]);

  async function handleDownloadSingle(index) {
    const el = cardRefs.current[index];
    if (!el) return;
    setDownloadingIndex(index);
    try {
      await downloadTicketImage(el, `PAWSE-ticket-${ticketIds[index] || index + 1}.png`);
    } catch {
      window.print();
    } finally {
      setDownloadingIndex(null);
    }
  }

  async function handleDownloadAll() {
    setDownloadingAll(true);
    try {
      for (let i = 0; i < tickets.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        await downloadTicketImage(el, `PAWSE-ticket-${ticketIds[i] || i + 1}.png`);
        if (i < tickets.length - 1) await new Promise((r) => setTimeout(r, 500));
      }
    } catch {
      window.print();
    } finally {
      setDownloadingAll(false);
    }
  }

  async function handleShare() {
    try {
      const result = await shareTicketLink({
        title: `My ${event?.name || "Event"} Tickets`,
        text: `I'm going to ${event?.name || "the event"} with ${ticketIds.length} ticket(s)! 🎉`,
        url: window.location.href,
      });
      if (result === "copied") showToast("Ticket link copied to clipboard!", "success");
    } catch {
      /* user cancelled share sheet — not an error */
    }
  }

  return (
    <div className="ticket-page">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <canvas className="confetti-canvas" ref={confettiRef} />

      <Header />

      {loading && (
        <div className="page-loader">
          <div className="loader-ring" />
          <p className="loader-text">Fetching your ticket...</p>
        </div>
      )}

      {!loading && errored && (
        <div className="ticket-error-state">
          <div className="error-icon">⚠️</div>
          <h2>Ticket Not Found</h2>
          <p>We couldn't find this ticket. Check your link or contact support.</p>
          <a href="/" className="cta-btn" style={{ display: "inline-flex", marginTop: "2rem" }}>
            ← Book a Ticket
          </a>
        </div>
      )}

      {!loading && !errored && event && (
        <main className="ticket-main">
          <div className="success-banner">
            <div className="success-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 16l5 5 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="success-text">
              <strong>Payment Confirmed!</strong>
              <span>
                {tickets.length > 1
                  ? `${tickets.length} tickets have been generated and are ready for use.`
                  : "Your ticket has been generated and is ready for use."}
              </span>
            </div>
          </div>

          <div className="tickets-container">
            {tickets.length > 1 && (
              <div className="ticket-nav-bar">
                <div className="ticket-nav-count">
                  <span className="ticket-nav-icon">🎟️</span>
                  <span>{tickets.length} Tickets</span>
                </div>
                <div className="ticket-nav-hint">Scroll to view all tickets ↓</div>
              </div>
            )}

            {tickets.map((ticket, index) => (
              <div key={ticket.ticketId}>
                <TicketCard
                  ticket={ticket}
                  index={index}
                  total={tickets.length}
                  event={event}
                  ref={(el) => (cardRefs.current[index] = el)}
                />
                <div className="ticket-card-actions">
                  <button className="ticket-action-btn primary-action" disabled={downloadingIndex === index} onClick={() => handleDownloadSingle(index)}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M10 3v10M5 9l5 5 5-5M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {downloadingIndex === index ? "Preparing..." : `Download Ticket ${tickets.length > 1 ? index + 1 : ""}`}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ticket-actions">
            <button className="ticket-action-btn primary-action" disabled={downloadingAll} onClick={handleDownloadAll}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v10M5 9l5 5 5-5M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {downloadingAll ? "Preparing..." : "Download All Tickets"}
            </button>
            <button className="ticket-action-btn" onClick={handleShare}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="15" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="15" cy="16" r="2" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M13 5.5l-6 3M13 14.5l-6-3" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              Share Link
            </button>
          </div>

          <div className="next-steps">
            <div className="section-label">// NEXT STEPS</div>
            <div className="steps-grid">
              <div className="next-step-card">
                <div className="next-step-num">01</div>
                <div className="next-step-title">Save this page</div>
                <div className="next-step-desc">Bookmark this URL or download your tickets. You'll need them at the entrance.</div>
              </div>
              <div className="next-step-card">
                <div className="next-step-num">02</div>
                <div className="next-step-title">Arrive on time</div>
                <div className="next-step-desc">When doors open, each person needs their own QR code to enter.</div>
              </div>
              <div className="next-step-card">
                <div className="next-step-num">03</div>
                <div className="next-step-title">Scan &amp; Enter</div>
                <div className="next-step-desc">Each ticket has a unique QR code. Show it at the gate for individual entry.</div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
