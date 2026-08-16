# PAWSE — React Migration

Configuration-driven React rewrite of the PAWSE ticket-booking frontend
(originally vanilla HTML/CSS/JS). Talks to the **same existing backend** —
no backend changes required to run this for the KTP (Kitty Party) event.

## Quick start

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE_URL to your backend
npm run dev
```

Open http://localhost:5173. Admin dashboard is at `/admin`.

## What changed vs. the legacy site

- **No hardcoded event data in components.** Everything about "Kitty
  Party" — name, date, venue, theme colors, registration fields, FAQ —
  lives in `src/config/events/ktp.json`, loaded through
  `eventContentService.js`. A second event means adding a second JSON
  file, not touching any `.jsx`.
- **Dynamic registration form.** `DynamicRegistrationForm` +
  `DynamicField` render whatever fields an event's config declares
  (text/email/tel/textarea/select/checkbox/radio/file), with
  required/optional validation driven by the same config
  (`src/utils/formValidation.js`).
- **Same API contract.** Every endpoint the legacy `app.js` / `ticket.js`
  / `my-tickets.js` / `admin.js` called is wrapped 1:1 in
  `src/services/*.js` — nothing new was invented, nothing was dropped.
- **Theme system.** `ThemeProvider` applies `event.theme` as CSS custom
  properties (`--bg`, `--accent`, `--accent-2`, `--text`) on top of the
  existing `legacy.css`, so a themed event doesn't need new component
  code, just new colors in its JSON.
- **Styling preserved on purpose.** `src/styles/legacy.css` is the
  original `styles.css` (one syntax typo fixed — see below) plus
  `src/styles/booking-form.css`, which is the `<style>` block that used
  to be embedded directly in `index.html`. Visual output should look
  identical to the legacy site.

## Project structure

```
src/
  assets/            (none yet — images are in /public)
  components/
    common/          Header, Footer — shared across all pages
    event/           Booking flow: BookingForm, TicketTypeSelector,
                      QuantityCounter, CouponBox, PriceSummary,
                      EventBanner, EventDetails, FaqSection
    forms/            DynamicField, DynamicRegistrationForm
    ticket/           TicketCard, TicketListItem
    admin/            AdminLogin, GatePanel, AttendeesPanel,
                      TicketTypesPanel, CouponsPanel, EventSettingsPanel,
                      StatsBar
  pages/
    Home/EventPage.jsx        generic event landing + booking page
    MyTickets/MyTicketsPage.jsx
    Ticket/TicketPage.jsx
    Admin/AdminPage.jsx
  layouts/           (not needed yet — Header/Footer cover it)
  services/          api.js, eventContentService.js, eventService.js,
                      ticketService.js, paymentService.js, couponService.js
  hooks/             useBooking, useRazorpay, useQrCode, useScanner,
                      useAdminAuth
  context/           EventContext, ThemeProvider, ToastContext
  config/            env.js (API base URL), app.js (current EVENT_ID),
                      events/ktp.json (sample event content)
  utils/             pricing.js, validators.js, formValidation.js,
                      confetti.js, ticketActions.js, beep.js
  routes/            (routing lives in App.jsx via react-router-dom)
```

## Known gaps (see full migration writeup for detail)

1. **Event content is local JSON, not an API.** The backend doesn't yet
   serve name/date/venue/theme/registrationFields for an event — only
   ticket-types and numeric config (fees/GST/active). Swap the body of
   `getEventContent()` in `eventContentService.js` for a real
   `api.get()` call once that endpoint exists; no component changes
   needed.
2. **Dynamic fields beyond name/email/phone/whatsapp aren't accepted by
   the backend yet.** `POST /api/payment/create-order` only reads those
   four fields today. The frontend form engine already supports
   text/email/tel/number/textarea/select/checkbox/radio/file — a new
   event with a "College" or "Photo" field will render and validate
   correctly, but `paymentService.createOrder()` needs a corresponding
   backend change to actually persist extra fields.
3. **Single-event routing.** Routes assume one active event
   (`src/config/app.js` → `EVENT_ID`). Multi-event support means
   switching to `/e/:eventId` routes — every page already reads its data
   through `EventContext`, so this is a routing change, not a component
   rewrite.

## Pre-existing bugs found and fixed during migration

- `styles.css` had a stray `*/` inside `.section-title` that broke CSS
  parsing entirely in Vite's stricter PostCSS pipeline (worked in
  browsers because browsers silently recover from malformed CSS).
  Fixed in `src/styles/legacy.css`.
- The legacy `admin.html` `<title>` said "PIY 2026" while the rest of
  the site says "PAWSE" / "Kitty Party" — left as-is architecturally
  (title bar copy, not app logic) but worth flagging to the team.
