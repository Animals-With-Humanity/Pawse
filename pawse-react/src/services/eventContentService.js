/**
 * Event "content" (name, venue, date, theme, registration fields, FAQ...)
 * is not yet served by the backend — only numeric config (fees/active)
 * and ticket-types are. Until a real `/api/events/:id/full-config`
 * endpoint exists, this loads from a local JSON file per event.
 *
 * IMPORTANT: this is the ONLY file that needs to change when the backend
 * grows a real endpoint for this — swap the body of getEventContent()
 * for an api.get() call and every component keeps working unmodified.
 */

const localEventContent = {
  KTP: () => import("../config/events/ktp.json"),
};

export async function getEventContent(eventId) {
  const loader = localEventContent[eventId];
  if (!loader) {
    throw new Error(`No local event configuration found for "${eventId}". Add one in src/config/events/.`);
  }
  const mod = await loader();
  return mod.default || mod;
}
