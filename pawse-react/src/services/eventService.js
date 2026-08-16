import { api } from "./api";

/** Public: numeric event config (platform fee, GST, active flag) */
export function getEventConfig(eventId) {
  return api.get(`/api/events/${eventId}/config`);
}

/** Admin: update platform fee / GST config */
export function updateEventConfig(eventId, token, { platformFeeType, platformFee, platformFeeGstPercent }) {
  return api.patch(`/api/events/${eventId}/config`, { platformFeeType, platformFee, platformFeeGstPercent }, { token });
}

/** Admin: toggle whether the event is accepting bookings */
export function toggleEventActive(eventId, token) {
  return api.patch(`/api/events/${eventId}/toggle-active`, undefined, { token });
}

/** Public: ticket types available for booking */
export function getTicketTypes(eventId) {
  return api.get(`/api/events/${eventId}/ticket-types`);
}

/** Admin: full ticket type list including inactive/sold-out detail */
export function getTicketTypesAdmin(eventId, token) {
  return api.get(`/api/events/${eventId}/ticket-types/admin`, { token });
}

export function createTicketType(eventId, token, payload) {
  return api.post(`/api/events/${eventId}/ticket-types`, payload, { token });
}

export function updateTicketType(eventId, token, ticketTypeId, payload) {
  return api.patch(`/api/events/${eventId}/ticket-types/${ticketTypeId}`, payload, { token });
}

export function toggleTicketType(eventId, token, ticketTypeId) {
  return api.patch(`/api/events/${eventId}/ticket-types/${ticketTypeId}/toggle`, undefined, { token });
}

export function deleteTicketType(eventId, token, ticketTypeId) {
  return api.delete(`/api/events/${eventId}/ticket-types/${ticketTypeId}`, { token });
}
