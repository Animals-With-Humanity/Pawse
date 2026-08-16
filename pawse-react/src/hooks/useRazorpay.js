/**
 * Wraps window.Razorpay (loaded via the checkout.js script tag in
 * index.html — Razorpay does not ship an npm/ESM build meant for
 * this kind of client-side checkout, so keeping it as a global script
 * matches their own integration guide and the legacy app's approach).
 */
export function useRazorpay() {
  function openCheckout({ orderData, eventName, quantity, ticketTypeLabel, eventDate, fields, onSuccess, onError, onDismiss }) {
    if (!window.Razorpay) {
      onError(new Error("Payment gateway failed to load. Please refresh and try again."));
      return;
    }

    const rzp = new window.Razorpay({
      key: orderData.keyId,
      order_id: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: eventName,
      description: `${quantity} ${ticketTypeLabel}${quantity > 1 ? "s" : ""} — ${eventDate}`,
      prefill: {
        name: fields.name,
        email: fields.email,
        contact: `+91${fields.phone}`,
      },
      theme: { color: "#e8ff47", backdrop_color: "rgba(8,10,14,0.95)" },
      modal: { ondismiss: onDismiss },
      handler: onSuccess,
    });
    rzp.open();
  }

  return { openCheckout };
}
