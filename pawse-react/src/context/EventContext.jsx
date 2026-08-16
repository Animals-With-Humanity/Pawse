import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getEventContent } from "../services/eventContentService";
import { getEventConfig, getTicketTypes } from "../services/eventService";

const EventContext = createContext(null);

/**
 * Loads everything a public event page needs:
 *  - content (name/venue/date/theme/registrationFields/faq...) — local JSON today
 *  - config (platform fee/GST/active) — real API
 *  - ticketTypes — real API
 *
 * Any page can call useEvent() instead of re-fetching this itself.
 */
export function EventProvider({ eventId, children }) {
  const [content, setContent] = useState(null);
  const [config, setConfig] = useState({
    platformFeeType: "flat",
    platformFee: 0,
    platformFeeGstPercent: 0,
    isActive: true,
  });
  const [ticketTypes, setTicketTypes] = useState([]);
  const [status, setStatus] = useState({
    contentLoading: true,
    ticketTypesLoading: true,
    ticketTypesLoaded: false,
    error: null,
  });

  const loadTicketTypes = useCallback(async () => {
    setStatus((s) => ({ ...s, ticketTypesLoading: true }));
    try {
      const data = await getTicketTypes(eventId);
      setTicketTypes(data.ticketTypes || []);
      setStatus((s) => ({
        ...s,
        ticketTypesLoading: false,
        ticketTypesLoaded: (data.ticketTypes || []).length > 0,
      }));
    } catch (err) {
      setTicketTypes([]);
      setStatus((s) => ({ ...s, ticketTypesLoading: false, ticketTypesLoaded: false }));
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getEventContent(eventId);
        if (!cancelled) setContent(c);
      } catch (err) {
        if (!cancelled) setStatus((s) => ({ ...s, error: err.message }));
      } finally {
        if (!cancelled) setStatus((s) => ({ ...s, contentLoading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    getEventConfig(eventId)
      .then((data) => data.config && setConfig(data.config))
      .catch(() => {
        /* non-fatal: fall back to defaults, same as legacy app.js */
      });
    loadTicketTypes();
  }, [eventId, loadTicketTypes]);

  const value = { eventId, content, config, ticketTypes, status, reloadTicketTypes: loadTicketTypes };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvent must be used within an EventProvider");
  return ctx;
}
