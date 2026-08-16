import { api } from "./api";

export function validateCoupon({ code, eventId, phone, quantity, ticketTypeId }) {
  return api.post(`/api/coupon/validate`, { code, eventId, phone, quantity, ticketTypeId });
}

export function listCoupons(eventId, token) {
  return api.get(`/api/coupon/admin/list?eventId=${eventId}`, { token });
}

export function createCoupon(token, payload) {
  return api.post(`/api/coupon/admin/create`, payload, { token });
}

export function toggleCoupon(token, code) {
  return api.patch(`/api/coupon/admin/${code}/toggle`, undefined, { token });
}

export function deleteCoupon(token, code) {
  return api.delete(`/api/coupon/admin/${code}`, { token });
}
