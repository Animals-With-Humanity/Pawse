import { useMemo, useState } from "react";
import { calculatePlatformFee } from "../utils/pricing";
import { validateCoupon } from "../services/couponService";
import { createOrder, verifyPayment } from "../services/paymentService";
import { normalizePhone } from "../utils/validators";

/**
 * Encapsulates the booking flow's business logic (ticket type selection,
 * quantity, coupon, price computation, Razorpay checkout) so BookingForm
 * stays a thin presentational component. Ported behavior-for-behavior
 * from the legacy app.js state object + handlers.
 */
export function useBooking({ eventId, eventName, eventConfig, ticketTypes }) {
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [coupon, setCoupon] = useState(null);
  const [couponPricing, setCouponPricing] = useState(null); // { originalAmount, discountAmount, finalAmount, bogoExtra }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState(null);

  function selectTicketType(type) {
    setSelectedTicketType(type);
    setCoupon(null);
    setCouponPricing(null);
    setCouponFeedback(null);
  }

  function changeQuantity(qty) {
    const next = Math.max(1, Math.min(10, qty));
    setQuantity(next);
    if (coupon) {
      setCoupon(null);
      setCouponPricing(null);
      setCouponFeedback(null);
    }
  }

  async function applyCoupon(code, phone) {
    if (!selectedTicketType) {
      setCouponFeedback({ message: "Please select a ticket type first", type: "error" });
      return;
    }
    setCouponLoading(true);
    setCouponFeedback(null);
    try {
      const data = await validateCoupon({
        code,
        eventId,
        phone: normalizePhone(phone),
        quantity,
        ticketTypeId: selectedTicketType.id,
      });
      if (!data.valid) {
        setCouponFeedback({ message: data.error || "Invalid coupon code", type: "error" });
        return;
      }
      setCoupon(data.coupon);
      setCouponPricing(data.pricing);
    } catch (err) {
      setCouponFeedback({ message: "Failed to validate coupon. Check connection.", type: "error" });
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponPricing(null);
    setCouponFeedback(null);
  }

  // ── Derived pricing (recomputed on every render, same as legacy updatePriceDisplay) ──
  const pricing = useMemo(() => {
    if (!selectedTicketType) {
      return { original: 0, discount: 0, final: 0, bogo: false, platformFee: 0, gst: 0, roundOff: 0, grandTotal: 0 };
    }
    const totalOriginal = selectedTicketType.price * quantity;
    const original = coupon ? couponPricing.originalAmount : totalOriginal;
    const final = coupon ? couponPricing.finalAmount : totalOriginal;
    const discount = coupon ? couponPricing.discountAmount : 0;
    const bogo = coupon ? !!couponPricing.bogoExtra : false;

    const { platformFee, gst, roundOff, totalWithFee } = calculatePlatformFee(final, eventConfig);

    return { original, discount, final, bogo, platformFee, gst, roundOff, grandTotal: totalWithFee };
  }, [selectedTicketType, quantity, coupon, couponPricing, eventConfig]);

  async function pay({ fields, needYogaMat, onFree, onRazorpayNeeded, onError }) {
    if (!selectedTicketType) return;

    try {
      const orderData = await createOrder({
        eventId,
        fields,
        ticketTypeId: selectedTicketType.id,
        quantity,
        couponCode: coupon?.code,
        needYogaMat,
      });

      if (orderData.free) {
        const ticketIds = orderData.ticketIds || [orderData.ticketId];
        const bogoIds = orderData.bogoTicketIds || (orderData.bogoTicketId ? [orderData.bogoTicketId] : []);
        onFree([...ticketIds, ...bogoIds]);
        return;
      }

      onRazorpayNeeded({
        orderData,
        onVerified: async (response) => {
          const verifyData = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          const ticketIds = verifyData.ticketIds || [verifyData.ticketId];
          const bogoIds = verifyData.bogoTicketIds || (verifyData.bogoTicketId ? [verifyData.bogoTicketId] : []);
          return [...ticketIds, ...bogoIds];
        },
      });
    } catch (err) {
      if (err.data?.soldOut) {
        onError("Ticket type just sold out — please choose another", true);
      } else {
        onError(err.message || "Failed to create order", false);
      }
    }
  }

  return {
    selectedTicketType,
    selectTicketType,
    quantity,
    changeQuantity,
    coupon,
    couponPricing,
    couponLoading,
    couponFeedback,
    applyCoupon,
    removeCoupon,
    pricing,
    pay,
  };
}
