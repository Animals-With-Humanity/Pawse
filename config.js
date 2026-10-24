/**
 * ╔══════════════════════════════════════════════╗
 * ║   PIY 2026  Frontend Configuration        ║
 * ║   Edit this file with your event details     ║
 * ╚══════════════════════════════════════════════╝
 */

const CONFIG = {
  // Your backend URL (no trailing slash)
  //API_BASE: "http://localhost:3001",
  // Production: "https://your-app.onrender.com"
  API_BASE: "https://ticketbookingbackend-k2m9.onrender.com",

  // Used only when the page is opened without ?event=
  // Event cards on awhbharat.org should link to /?event=YOUR_EVENT_ID
  DEFAULT_EVENT_ID: "TBP2026",
  EVENT_ID: "TBP2026",
  EVENT_NAME: "Tote Bag Painting",
  EVENT_DATE: "1st October 2026 | 4:00 PM - 6:00 PM",
  EVENT_VENUE: "Bansal Plaza, Bhopal",
  EVENT_DESCRIPTION:
    "Unleash your inner artist  hand-paint your own canvas tote bag with vibrant colors, fruit motifs, and playful designs. All materials provided.",

  // Ticket price in INR
  TICKET_PRICE: 250,

  PHOTO_GALLERY_URL: "https://awhbharat.org/event-photos",
};

// The website passes the event in the query string so one hosted booking
// site can sell tickets for every event.
(function applyEventFromUrl() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("event");
    if (fromUrl && /^[A-Za-z0-9_-]{1,64}$/.test(fromUrl)) {
      CONFIG.EVENT_ID = fromUrl;
    }
  } catch (_) {
    // Keep the default event if the URL cannot be read.
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const q = encodeURIComponent(CONFIG.EVENT_ID);
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
    const hashIdx = href.indexOf("#");
    const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
    const path = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
    if (path !== "my-tickets.html" && path !== "index.html") return;
    if (path.includes("?")) return;
    a.setAttribute("href", `${path}?event=${q}${hash}`);
  });
});
