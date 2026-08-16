import { api } from "./api";

/** Fetch a single ticket by ID (used on the ticket page). */
export function getTicket(ticketId) {
  return api.get(`/api/ticket/${ticketId}`);
}

/** Fetch every ticket for a phone number, scoped to an event (My Tickets page). */
export function findTicketsByPhone(phone, eventId) {
  return api.get(`/api/ticket/phone/${phone}?eventId=${eventId}`);
}

/** Admin: list every ticket for an event (also doubles as the admin-login check). */
export function listEventTickets(eventId, token) {
  return api.get(`/api/ticket/event/${eventId}/list`, { token });
}

/** Admin/gate: verify + mark a ticket as used. */
export function verifyTicket(ticketId, eventId, token) {
  return api.post(`/api/ticket/verify`, { ticketId, eventId }, { token });
}
