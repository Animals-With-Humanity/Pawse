/**
 * The "current" event this deployment is selling tickets for.
 * My Tickets (phone lookup) needs an eventId before any event page has
 * loaded, so it can't come from EventContext. Once the platform serves
 * multiple simultaneous events this should come from the URL instead
 * (e.g. /e/:eventId/my-tickets) — flagged here so it's a one-line change.
 */
export const EVENT_ID = "KTP";
