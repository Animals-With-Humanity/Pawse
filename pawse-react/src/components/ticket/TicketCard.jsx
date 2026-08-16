import { forwardRef } from "react";
import { useQrCode } from "../../hooks/useQrCode";

const COUPON_TYPE_LABEL = {
  percent: (c) => `${c.value}% OFF`,
  flat: (c) => `₹${c.value} OFF`,
  free: () => "FREE",
  bogo: () => "BOGO",
};

/**
 * Renders one ticket. Event name/date/venue come from `event` (content
 * config) rather than being hardcoded — the legacy ticket.js had
 * "Kitty Party" / "26 JULY 2026" / "Studio Jammin" baked directly into
 * the template string, which is exactly the kind of thing this
 * migration is meant to eliminate.
 */
const TicketCard = forwardRef(function TicketCard({ ticket, index, total, event }, forwardedRef) {
  const qrRef = useQrCode(ticket.qrData || ticket.ticketId);

  const couponBadge = ticket.coupon && (
    <div className="ticket-coupon-badge">
      🏷️ {ticket.coupon.code} — {(COUPON_TYPE_LABEL[ticket.coupon.type] || (() => "DISCOUNT"))(ticket.coupon)}
    </div>
  );
  const savingsLine =
    ticket.coupon && ticket.discountAmount > 0 && index === 0 ? (
      <div className="ticket-savings-line">You saved ₹{ticket.discountAmount}</div>
    ) : null;
  const bogoBadge = ticket.isBogoPair && <div className="ticket-bogo-badge">🎉 BOGO BONUS</div>;

  const priceBlock =
    ticket.originalAmount && ticket.originalAmount !== ticket.amount ? (
      <div className="ticket-price-line">
        <s>₹{ticket.originalAmount}</s> <span className="ticket-price-final">{ticket.amount === 0 ? "FREE" : `₹${ticket.amount}`}</span>
      </div>
    ) : (
      <div className="ticket-price-line">{ticket.amount === 0 ? "FREE" : `₹${ticket.amount}`}</div>
    );

  return (
    <div className="ticket-card-wrapper">
      {total > 1 && (
        <div className="ticket-index-label">
          <span className="til-num">Ticket {index + 1}</span>
          <span className="til-total">of {total}</span>
        </div>
      )}

      <div className="ticket" id={`ticket-card-${index}`} ref={forwardedRef}>
        <div className="ticket-left">
          <div className="ticket-event-name">{event.name}</div>
          <div className="ticket-event-year">{event.date?.match(/\d{4}/)?.[0] || ""}</div>
          <div className="ticket-date">{event.date?.toUpperCase()}</div>
          <div className="ticket-venue">{event.venue}</div>

          <div className="ticket-divider">
            <div className="ticket-notch left-notch" />
            <div className="ticket-dashes" />
            <div className="ticket-notch right-notch" />
          </div>

          <div className="ticket-holder">
            <div className="ticket-holder-info">
              <div className="ticket-holder-name">{ticket.name}</div>
              <div className="ticket-holder-phone">{ticket.phone}</div>
            </div>
          </div>

          <div className="ticket-type-badge">{ticket.isBogoPair ? "BOGO BONUS" : ticket.ticketTypeLabel || "GENERAL ADMISSION"}</div>
          {couponBadge}
          {savingsLine}
          {bogoBadge}
        </div>

        <div className="ticket-right">
          <div className="ticket-stub-label">SCAN AT ENTRY</div>
          <div className="qr-box">
            <canvas className="qr-canvas" ref={qrRef} />
          </div>
          <div className="ticket-id">{ticket.ticketId}</div>
          <div className="ticket-valid-text">Valid for 1 time entry only</div>
          {priceBlock}
        </div>
      </div>
    </div>
  );
});

export default TicketCard;
