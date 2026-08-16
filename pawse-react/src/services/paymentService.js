import { api } from "./api";

/**
 * Creates a Razorpay order. `fields` carries the dynamic registration
 * field values (name/email/phone/whatsapp today; more fields for future
 * events once the backend accepts them). We flatten known legacy field
 * names into the top-level body so the existing backend contract keeps
 * working unmodified.
 */
export function createOrder({ eventId, fields, ticketTypeId, quantity, couponCode, needYogaMat }) {
  return api.post(`/api/payment/create-order`, {
    eventId,
    ticketTypeId,
    quantity,
    couponCode: couponCode || null,
    needYogaMat: !!needYogaMat,
    name: fields.name || "",
    email: fields.email || "",
    phone: fields.phone || "",
    whatsapp: fields.whatsapp || fields.phone || "",
    imageUrl: fields.imageUrl || "",
  });
}

export function verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  return api.post(`/api/payment/verify`, {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
}
