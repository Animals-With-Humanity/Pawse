import { useState } from "react";
import { useEvent } from "../../context/EventContext";
import { useToast } from "../../context/ToastContext";
import { useBooking } from "../../hooks/useBooking";
import { useRazorpay } from "../../hooks/useRazorpay";
import { validateFields, resolveSubmitValues, defaultValuesFor } from "../../utils/formValidation";
import DynamicRegistrationForm from "../forms/DynamicRegistrationForm";
import TicketTypeSelector from "./TicketTypeSelector";
import QuantityCounter from "./QuantityCounter";
import CouponBox from "./CouponBox";
import PriceSummary from "./PriceSummary";

export default function BookingForm() {
  const { eventId, content, config, ticketTypes, status, reloadTicketTypes } = useEvent();
  const showToast = useToast();
  const { openCheckout } = useRazorpay();

  const fields = content.registrationFields;
  const [values, setValues] = useState(() => defaultValuesFor(fields));
  const [errors, setErrors] = useState({});
  const [payState, setPayState] = useState({ loading: false, text: null, error: null });

  const booking = useBooking({ eventId, eventName: content.name, eventConfig: config, ticketTypes });

  // Auto-select first available ticket type once loaded (matches legacy behavior)
  const [autoSelected, setAutoSelected] = useState(false);
  if (!autoSelected && ticketTypes.length > 0 && !booking.selectedTicketType) {
    const first = ticketTypes.find((t) => !t.soldOut);
    if (first) {
      booking.selectTicketType(first);
      setAutoSelected(true);
    }
  }

  function handleFieldChange(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handlePay() {
    const { valid, errors: fieldErrors } = validateFields(fields, values);
    setErrors(fieldErrors);

    if (!booking.selectedTicketType) {
      showToast("Please select a ticket type", "error");
      return;
    }
    if (!valid) {
      showToast("Please fix the highlighted fields", "error");
      return;
    }

    const resolved = resolveSubmitValues(fields, values);
    setPayState({ loading: true, text: "Creating order...", error: null });

    await booking.pay({
      fields: resolved,
      needYogaMat: false,
      onFree: (ticketIds) => {
        window.location.href = `/ticket?ids=${ticketIds.join(",")}`;
      },
      onRazorpayNeeded: ({ orderData, onVerified }) => {
        setPayState({ loading: true, text: "Opening payment...", error: null });
        openCheckout({
          orderData,
          eventName: content.name,
          quantity: booking.quantity,
          ticketTypeLabel: booking.selectedTicketType.label,
          eventDate: content.date,
          fields: resolved,
          onSuccess: async (response) => {
            setPayState({ loading: true, text: "Verifying payment...", error: null });
            try {
              const ticketIds = await onVerified(response);
              window.location.href = `/ticket?ids=${ticketIds.join(",")}`;
            } catch (err) {
              setPayState({
                loading: false,
                text: null,
                error: `Verification error: ${err.message}. Contact support with order: ${orderData.orderId}`,
              });
            }
          },
          onError: (err) => setPayState({ loading: false, text: null, error: err.message }),
          onDismiss: () => setPayState({ loading: false, text: null, error: null }),
        });
      },
      onError: (message, soldOut) => {
        setPayState({ loading: false, text: null, error: message });
        if (soldOut) {
          showToast(message, "error");
          reloadTicketTypes();
        }
      },
    });
  }

  const payDisabled =
    status.ticketTypesLoading || !status.ticketTypesLoaded || !booking.selectedTicketType || !config.isActive || payState.loading;

  const payLabel = payState.loading
    ? payState.text
    : !config.isActive
    ? "Booking Closed"
    : status.ticketTypesLoading
    ? "Loading Tickets..."
    : !status.ticketTypesLoaded
    ? "Tickets Unavailable"
    : !booking.selectedTicketType
    ? "Select a Ticket Type"
    : booking.pricing.final === 0
    ? `Get ${booking.quantity} Free Ticket${booking.quantity > 1 ? "s" : ""} →`
    : `Pay ₹${booking.pricing.grandTotal} Securely`;

  return (
    <div className="form-card single-form-card">
      {!config.isActive && (
        <div
          style={{
            textAlign: "center",
            padding: "1.25rem 1rem",
            color: "#ef4444",
            fontFamily: "Montserrat, sans-serif",
            fontSize: "0.9rem",
            border: "1.5px solid #fca5a5",
            borderRadius: 12,
            background: "rgba(239,68,68,0.06)",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>🚫</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>Booking Closed</div>
          <div>Ticket sales for this event are currently paused. Please check back later.</div>
        </div>
      )}

      <DynamicRegistrationForm fields={fields} values={values} errors={errors} onFieldChange={handleFieldChange} />

      <div className="form-section">
        <div className="form-section-title">Select Ticket Type</div>
        <TicketTypeSelector
          ticketTypes={ticketTypes}
          loading={status.ticketTypesLoading}
          loaded={status.ticketTypesLoaded}
          selectedId={booking.selectedTicketType?.id}
          onSelect={booking.selectTicketType}
        />
      </div>

      {booking.selectedTicketType && (
        <QuantityCounter
          quantity={booking.quantity}
          onChange={booking.changeQuantity}
          typeLabel={booking.selectedTicketType.label}
          typePrice={booking.selectedTicketType.price}
        />
      )}

      <CouponBox
        applied={booking.coupon}
        pricing={booking.pricing}
        loading={booking.couponLoading}
        feedback={booking.couponFeedback}
        onApply={(code) => booking.applyCoupon(code, values.phone)}
        onRemove={booking.removeCoupon}
      />

      <PriceSummary
        lineLabel={booking.selectedTicketType ? `${booking.selectedTicketType.label} ×${booking.quantity}` : "Select a ticket type"}
        pricing={booking.pricing}
        coupon={booking.coupon}
      />

      {payState.error && <div className="pay-error">{payState.error}</div>}

      <button className="pay-btn" style={{ width: "100%", marginTop: "1.5rem" }} disabled={payDisabled} onClick={handlePay}>
        <span>{payLabel}</span>
        {payState.loading && <div className="pay-spinner" />}
      </button>

      <div className="razorpay-trust">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L3 7v6c0 3.5 3 6.5 7 7.5C17 19.5 20 16.5 20 13V7l-7-5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
        Secured by Razorpay · 256-bit SSL encryption
      </div>
    </div>
  );
}
