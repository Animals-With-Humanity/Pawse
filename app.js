/* ═══════════════════════════════════════════════════════
   app.js - Booking Page Logic (Single-Step)
   ═══════════════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);

const state = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  coupon: null,
  needYogaMat: false,
  city: "",
  requireStay: false,
  stayDays: null,
  allTicketTypes: [],
  cartLines: [],
  ticketTypesLoaded: false,
  ticketTypesLoading: true,
  maxCartLines: 5,
  maxTotalTickets: 10,
  pricing: {
    original: 0,
    discount: 0,
    final: 0,
    bogo: false,
    platformFee: 0,
    gst: 0,
    roundOff: 0,
    grandTotal: 0,
  },
  // Event-level config loaded from backend
  eventConfig: {
    platformFeeType: "flat",
    platformFee: 0,
    platformFeeGstPercent: 0,
    isActive: true,
  },
  eventName: CONFIG.EVENT_NAME,
  eventDate: CONFIG.EVENT_DATE,
  eventVenue: CONFIG.EVENT_VENUE,
};

/* ── Toast ────────────────────────────────────────────── */
function showToast(msg, type = "info") {
  const toast = $("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

/* ── Ticket Types ─────────────────────────────────────── */
// Render cold starts can take 30–60s and often return 502/503/504 or a
// network error before the service is ready. Keep the loading UI and
// retry; only show "Tickets Unavailable" after a definitive failure.
function isTransientStartupStatus(status) {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

async function fetchWithStartupRetry(url, options) {
  const maxAttempts = 8;
  const retryDelayMs = 4000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options);
      if (isTransientStartupStatus(res.status) && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      throw err;
    }
  }
}

async function loadTicketTypes() {
  state.ticketTypesLoading = true;
  const loadingEl = $("ticket-types-loading");
  // Keep loading visible until this request settles. Do not hide existing
  // cards on a sold-out refresh (types were already loaded once).
  if (loadingEl && !state.ticketTypesLoaded) loadingEl.style.display = "";
  updatePriceDisplay();
  try {
    const res = await fetchWithStartupRetry(`${CONFIG.API_BASE}/api/events/${CONFIG.EVENT_ID}/ticket-types`);
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();

    if (loadingEl) loadingEl.style.display = "none";
    state.ticketTypesLoading = false;

    if (!data.ticketTypes || data.ticketTypes.length === 0) {
      showTicketTypeError("No ticket types available for this event.");
      return;
    }

    state.ticketTypesLoaded = true;
    renderTicketTypeCards(data.ticketTypes);
  } catch (_) {
    if (loadingEl) loadingEl.style.display = "none";
    state.ticketTypesLoading = false;
    showTicketTypeError("Failed to load ticket options. Please refresh the page.");
  }
}

function showTicketTypeError(message) {
  state.ticketTypesLoaded = false;
  $("ticket-type-fallback").style.display = "none";
  $("ticket-types-loading").style.display = "none";
  const wrap = $("pass-picker-wrap");
  if (wrap) {
    wrap.classList.remove("hidden");
    wrap.innerHTML = `
    <div style="text-align:center;padding:1.5rem 1rem;color:#ef4444;font-family:'Montserrat',sans-serif;font-size:0.85rem;border:1.5px dashed #fca5a5;border-radius:12px;background:rgba(239,68,68,0.04);">
      <div style="font-size:1.5rem;margin-bottom:0.5rem;">⚠️</div>
      <div style="font-weight:600;">${message}</div>
    </div>`;
  }
  disablePayButton("Tickets Unavailable");
}

function disablePayButton(text) {
  const payBtn = $("pay-btn");
  payBtn.disabled = true;
  payBtn.style.opacity = "0.5";
  payBtn.style.cursor = "not-allowed";
  $("pay-btn-text").textContent = text || "Tickets Unavailable";
}

function enablePayButton() {
  const payBtn = $("pay-btn");
  payBtn.disabled = false;
  payBtn.style.opacity = "";
  payBtn.style.cursor = "";
}

function newCartLineId() {
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const LINE_DAY_FILTERS = [
  { key: "day1", label: "Day 1" },
  { key: "day2", label: "Day 2" },
  { key: "day3", label: "Day 3" },
  { key: "festival", label: "Full festival" },
];

function typeMatchesDayFilter(type, filter) {
  const keys = type.validDayKeys || [];
  if (filter === "festival") return keys.includes("all");
  return keys.includes(filter) || keys.includes("all");
}

function getFilteredTypesForLine(line) {
  const filter = line.dayFilter || "day1";
  return state.allTicketTypes.filter((t) => typeMatchesDayFilter(t, filter));
}

function renderDayFilterTabsForLine(line) {
  const active = line.dayFilter || "day1";
  const buttons = LINE_DAY_FILTERS.map(
    (f) =>
      `<button type="button" class="day-filter-tab${active === f.key ? " active" : ""}" data-line-filter="${line.id}" data-filter="${f.key}">${f.label}</button>`,
  ).join("");
  return `<div class="day-filter-tabs" role="tablist" aria-label="Filter pass ${line.id} by day">${buttons}</div>`;
}

function getTotalCartQty() {
  return state.cartLines.reduce((sum, line) => sum + (line.quantity || 0), 0);
}

function getCartSummary() {
  let totalQty = 0;
  let original = 0;
  const labels = [];
  const lineItems = [];

  for (const line of state.cartLines) {
    const type = state.allTicketTypes.find((t) => t.id === line.ticketTypeId);
    if (!type) continue;
    totalQty += line.quantity;
    const lineTotal = type.price * line.quantity;
    original += lineTotal;
    labels.push(`${type.label}×${line.quantity}`);
    lineItems.push({ ticketTypeId: type.id, quantity: line.quantity });
  }

  return { totalQty, original, labels, lineItems, complete: lineItems.length === state.cartLines.length && totalQty > 0 };
}

function ensureCartHasLine() {
  if (state.cartLines.length === 0) {
    state.cartLines.push({ id: newCartLineId(), ticketTypeId: null, quantity: 1, dayFilter: "day1" });
  }
}

function renderTicketTypeCards(types) {
  state.allTicketTypes = types;
  $("ticket-types-loading").style.display = "none";
  $("pass-picker-wrap")?.classList.remove("hidden");

  if (state.cartLines.length === 0) {
    ensureCartHasLine();
  }

  renderCartLines();
  updateAddPassButton();
  updatePriceDisplay();
}

function renderCartLines() {
  const container = $("cart-lines");
  if (!container) return;

  container.innerHTML = state.cartLines
    .map((line, index) => {
      if (!line.dayFilter) line.dayFilter = "day1";
      const selected = state.allTicketTypes.find((t) => t.id === line.ticketTypeId);
      const filtered = getFilteredTypesForLine(line);
      const dayTabs = renderDayFilterTabsForLine(line);
      const cards = filtered
        .map((type) => {
          let availText = "";
          if (type.soldOut) availText = "Sold out";
          else if (type.remaining !== null && type.remaining <= 20) availText = `${type.remaining} left`;

          const selectedClass = line.ticketTypeId === type.id ? "selected" : "";
          const soldClass = type.soldOut ? " sold-out" : "";
          return `
          <div class="ticket-type-card ${selectedClass}${soldClass}" data-line="${line.id}" data-type-id="${type.id}" role="button" tabindex="0">
            ${type.soldOut ? '<span class="sold-out-badge">SOLD OUT</span>' : ""}
            <div class="ticket-type-card-left">
              <div class="ticket-type-radio"><div class="ticket-type-radio-dot"></div></div>
              <div class="ticket-type-info">
                <span class="ticket-type-name">${type.label}</span>
                <span class="ticket-type-desc">${type.validDayLabel || type.description || ""}</span>
              </div>
            </div>
            <div class="ticket-type-right">
              <span class="ticket-type-price">₹${type.price}</span>
              ${availText ? `<span class="ticket-type-avail">${availText}</span>` : ""}
            </div>
          </div>`;
        })
        .join("");

      const emptyFilter = filtered.length === 0
        ? `<p style="font-size:0.78rem;color:var(--text-muted);padding:0.5rem 0;">No passes for this day — try Day 2, Day 3, or Full festival.</p>`
        : `<div class="cart-pass-cards">${cards}</div>`;

      return `
      <div class="cart-pass-block" data-line-block="${line.id}">
        <div class="cart-pass-head">
          <span class="cart-pass-title">Pass ${index + 1}${selected ? ` · ${selected.label}` : ""}</span>
          ${state.cartLines.length > 1 ? `<button type="button" class="cart-pass-remove" data-remove="${line.id}">Remove</button>` : ""}
        </div>
        ${dayTabs}
        ${emptyFilter}
        <div class="cart-pass-qty">
          <span style="font-family:'Montserrat',sans-serif;font-size:0.75rem;font-weight:600;color:var(--text-muted)">Qty for this pass</span>
          <div class="qty-counter-wrap">
            <button class="qty-btn cart-qty-minus" type="button" data-line="${line.id}" aria-label="Decrease">−</button>
            <span class="qty-num">${line.quantity}</span>
            <button class="qty-btn cart-qty-plus" type="button" data-line="${line.id}" aria-label="Increase">+</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  container.querySelectorAll(".ticket-type-card:not(.sold-out)").forEach((card) => {
    const pick = () => {
      const lineId = card.dataset.line;
      const typeId = card.dataset.typeId;
      selectTypeForLine(lineId, typeId);
    };
    card.addEventListener("click", pick);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    });
  });

  container.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeCartLine(btn.dataset.remove));
  });

  container.querySelectorAll(".cart-qty-minus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const line = state.cartLines.find((l) => l.id === btn.dataset.line);
      if (line) setLineQuantity(line.id, line.quantity - 1);
    });
  });

  container.querySelectorAll(".cart-qty-plus").forEach((btn) => {
    btn.addEventListener("click", () => {
      const line = state.cartLines.find((l) => l.id === btn.dataset.line);
      if (line) setLineQuantity(line.id, line.quantity + 1);
    });
  });

  container.querySelectorAll("[data-line-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const line = state.cartLines.find((l) => l.id === btn.dataset.lineFilter);
      if (!line) return;
      line.dayFilter = btn.dataset.filter || "day1";
      renderCartLines();
    });
  });
}

function selectTypeForLine(lineId, typeId) {
  const type = state.allTicketTypes.find((t) => t.id === typeId);
  if (!type || type.soldOut) return;

  const duplicate = state.cartLines.some((l) => l.id !== lineId && l.ticketTypeId === typeId);
  if (duplicate) {
    showToast("This pass is already added — increase quantity on that line", "info");
    return;
  }

  const line = state.cartLines.find((l) => l.id === lineId);
  if (!line) return;
  line.ticketTypeId = typeId;
  if (state.coupon) removeCoupon();
  renderCartLines();
  updatePriceDisplay();
}

function setLineQuantity(lineId, qty) {
  const line = state.cartLines.find((l) => l.id === lineId);
  if (!line) return;

  const next = Math.max(1, Math.min(10, qty));
  const otherTotal = getTotalCartQty() - line.quantity;
  if (otherTotal + next > state.maxTotalTickets) {
    showToast(`Maximum ${state.maxTotalTickets} tickets per booking`, "error");
    return;
  }

  line.quantity = next;
  if (state.coupon) removeCoupon();
  renderCartLines();
  updatePriceDisplay();
}

function addCartLine() {
  if (state.cartLines.length >= state.maxCartLines) {
    showToast(`You can add up to ${state.maxCartLines} different passes`, "error");
    return;
  }
  if (getTotalCartQty() >= state.maxTotalTickets) {
    showToast(`Maximum ${state.maxTotalTickets} tickets per booking`, "error");
    return;
  }
  state.cartLines.push({ id: newCartLineId(), ticketTypeId: null, quantity: 1, dayFilter: "day1" });
  renderCartLines();
  updateAddPassButton();
}

function removeCartLine(lineId) {
  if (state.cartLines.length <= 1) return;
  state.cartLines = state.cartLines.filter((l) => l.id !== lineId);
  if (state.coupon) removeCoupon();
  renderCartLines();
  updateAddPassButton();
  updatePriceDisplay();
}

function updateAddPassButton() {
  const btn = $("add-pass-btn");
  if (!btn) return;
  const atMaxLines = state.cartLines.length >= state.maxCartLines;
  const atMaxQty = getTotalCartQty() >= state.maxTotalTickets;
  btn.disabled = atMaxLines || atMaxQty;
}

$("add-pass-btn")?.addEventListener("click", addCartLine);

/* ── Coupon Logic ─────────────────────────────────────── */
const couponInput = $("coupon-input");
const applyBtn = $("coupon-apply-btn");
const removeBtn = $("coupon-remove-btn");
const couponFeedback = $("coupon-feedback");
const couponApplied = $("coupon-applied");

couponInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") applyBtn.click();
});

applyBtn.addEventListener("click", async () => {
  const code = couponInput.value.trim().toUpperCase();
  if (!code) { showCouponFeedback("Enter a coupon code first", "error"); return; }

  const phone = $("phone").value.trim().replace(/\s/g, "");
  applyBtn.textContent = "Checking...";
  applyBtn.disabled = true;
  hideCouponFeedback();

  const cart = getCartSummary();
  if (!cart.complete) {
    showCouponFeedback("Select a pass type for each line first", "error");
    applyBtn.textContent = "Apply";
    applyBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/coupon/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        eventId: CONFIG.EVENT_ID,
        phone,
        lineItems: cart.lineItems,
      }),
    });
    const data = await res.json();

    if (!res.ok || !data.valid) {
      showCouponFeedback(data.error || "Invalid coupon code", "error");
      return;
    }

    state.coupon = data.coupon;
    state.pricing = {
      original: data.pricing.originalAmount,
      discount: data.pricing.discountAmount,
      final: data.pricing.finalAmount,
      bogo: data.pricing.bogoExtra,
    };

    couponInput.disabled = true;
    applyBtn.classList.add("hidden");
    removeBtn.classList.remove("hidden");
    showCouponApplied(data.coupon, data.pricing);
    updatePriceDisplay();
    showToast("Coupon applied! 🎉", "success");

  } catch (_) {
    showCouponFeedback("Failed to validate coupon. Check connection.", "error");
  } finally {
    applyBtn.textContent = "Apply";
    applyBtn.disabled = false;
  }
});

function removeCoupon() {
  const cart = getCartSummary();
  const totalAmount = cart.original || 0;
  state.coupon = null;
  state.pricing = { original: totalAmount, discount: 0, final: totalAmount, bogo: false };
  couponInput.value = "";
  couponInput.disabled = false;
  applyBtn.classList.remove("hidden");
  removeBtn.classList.add("hidden");
  couponApplied.classList.add("hidden");
  hideCouponFeedback();
  updatePriceDisplay();
}

removeBtn.addEventListener("click", removeCoupon);

function showCouponFeedback(msg, type) {
  couponFeedback.textContent = msg;
  couponFeedback.className = `coupon-feedback ${type}`;
  couponFeedback.classList.remove("hidden");
}
function hideCouponFeedback() {
  couponFeedback.classList.add("hidden");
}

function showCouponApplied(coupon, pricing) {
  const typeLabels = {
    percent: `${coupon.value}% OFF`,
    flat: `₹${coupon.value} OFF`,
    free: "100% FREE",
    bogo: "BUY 1 GET 1 FREE",
  };
  $("coupon-applied-title").textContent = `${coupon.code} - ${typeLabels[coupon.type] || "DISCOUNT"}`;
  $("coupon-applied-desc").textContent = coupon.description || "";
  $("coupon-applied-savings").textContent =
    pricing.bogoExtra ? "+1 Free Ticket" : `−₹${pricing.discountAmount}`;
  couponApplied.classList.remove("hidden");
}

/* ── Platform Fee Calculation ─────────────────────────── */
function calculatePlatformFee(amountAfterCoupon) {
  if (amountAfterCoupon <= 0) return { platformFee: 0, gst: 0, roundOff: 0, totalWithFee: 0 };
  const feeType = state.eventConfig.platformFeeType === "percent" ? "percent" : "flat";
  const feeValue = state.eventConfig.platformFee || 0;
  const fee = feeType === "percent"
    ? Number((amountAfterCoupon * feeValue / 100).toFixed(2))
    : feeValue;
  const gstPercent = state.eventConfig.platformFeeGstPercent || 0;
  const gst = Number((fee * gstPercent / 100).toFixed(2));
  const exactTotal = amountAfterCoupon + fee + gst;
  const roundedTotal = Math.round(exactTotal);
  const roundOff = Number((roundedTotal - exactTotal).toFixed(2));
  return {
    platformFee: Number(fee.toFixed(2)),
    gst,
    roundOff,
    totalWithFee: roundedTotal,
  };
}

/* ── Event Config ─────────────────────────────────────── */
function applyPublicEventDetails(config) {
  const isKnownDefault = CONFIG.EVENT_ID === CONFIG.DEFAULT_EVENT_ID;
  const name = (config.name || "").trim() || (isKnownDefault ? CONFIG.EVENT_NAME : CONFIG.EVENT_ID);
  const dateLabel = (config.dateLabel || "").trim() || (isKnownDefault ? CONFIG.EVENT_DATE : "");
  const venue = (config.venue || "").trim() || (isKnownDefault ? CONFIG.EVENT_VENUE : "");
  const description =
    (config.description || "").trim() ||
    (isKnownDefault ? (CONFIG.EVENT_DESCRIPTION || "") : "");

  state.eventName = name;
  state.eventDate = dateLabel;
  state.eventVenue = venue;

  const titleEl = $("event-title");
  if (titleEl && titleEl.tagName !== "IMG") titleEl.textContent = name;
  document.title = `${name} - Book tickets | Animals With Humanity`;

  const dateLine = $("event-date-line");
  if (dateLine) {
    const parts = [dateLabel, venue].filter(Boolean);
    dateLine.textContent = parts.join(" | ") || "Animals With Humanity";
  }

  const desc = $("event-desc");
  if (desc && (description || !isKnownDefault)) {
    desc.textContent = description || "Book your ticket for this Animals With Humanity event.";
  }

  const cardTitle = $("event-card-title");
  if (cardTitle) cardTitle.textContent = name;

  const cardDate = $("event-card-datetime");
  if (cardDate) cardDate.textContent = dateLabel || "See event details";

  const cardVenue = $("event-card-venue");
  if (cardVenue) {
    cardVenue.textContent = venue || "Venue to be announced";
    if (config.mapUrl) cardVenue.href = config.mapUrl;
  }

  const perks = $("event-perks");
  if (perks && !isKnownDefault) perks.style.display = "none";
}

async function loadEventConfig() {
  applyPublicEventDetails({});
  try {
    const res = await fetchWithStartupRetry(`${CONFIG.API_BASE}/api/events/${CONFIG.EVENT_ID}/config`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.config) {
      state.eventConfig = data.config;
      applyPublicEventDetails(data.config);
      if (!data.config.isActive) {
        showEventClosed();
      }
    }
  } catch (_) {
    // Non-fatal: fall back to zero fees and open booking
  }
}

function showEventClosed() {
  disablePayButton("Booking Closed");

  // Show a notice above the ticket type selector
  const noticeId = "event-closed-notice";
  if (!$(noticeId)) {
    const notice = document.createElement("div");
    notice.id = noticeId;
    notice.style.cssText = [
      "text-align:center",
      "padding:1.25rem 1rem",
      "color:#ef4444",
      "font-family:'Montserrat',sans-serif",
      "font-size:0.9rem",
      "border:1.5px solid #fca5a5",
      "border-radius:12px",
      "background:rgba(239,68,68,0.06)",
      "margin-bottom:1rem",
    ].join(";");
    notice.innerHTML = `<div style="font-size:1.5rem;margin-bottom:0.4rem">🚫</div>
      <div style="font-weight:700;font-size:1rem;margin-bottom:0.25rem">Booking Closed</div>
      <div>Ticket sales for this event are currently paused. Please check back later.</div>`;

    const ticketTypeSection = $("ticket-types-loading")?.parentElement;
    if (ticketTypeSection) ticketTypeSection.insertBefore(notice, ticketTypeSection.firstChild);
  }

  // Block the pay button permanently when closed
  $("pay-btn").addEventListener("click", (e) => e.stopImmediatePropagation(), true);
}
/* ── Price Display ────────────────────────────────────── */
function updatePriceDisplay() {
  const cart = getCartSummary();
  const qty = cart.totalQty;

  if (!cart.complete) {
    $("price-line-label").textContent = cart.totalQty > 0 ? "Finish selecting passes" : "Select your pass(es)";
    $("price-original").textContent = `₹${cart.original || 0}`;
    $("price-platform-fee").textContent = `₹0.00`;
    $("price-gst").textContent = `₹0.00`;
    $("round-off-row").classList.add("hidden");
    $("price-total").textContent = `₹0`;
    $("discount-row").classList.add("hidden");
    $("bogo-row").classList.add("hidden");
    if (state.ticketTypesLoading) {
      disablePayButton("Loading Tickets...");
    } else if (!state.ticketTypesLoaded) {
      disablePayButton("Tickets Unavailable");
    } else {
      disablePayButton("Select Pass Type");
    }
    return;
  }

  if (!state.coupon) {
    state.pricing.original = cart.original;
    state.pricing.final = cart.original;
    state.pricing.discount = 0;
  }

  const { platformFee, gst, roundOff, totalWithFee } = calculatePlatformFee(state.pricing.final);
  state.pricing.platformFee = platformFee;
  state.pricing.gst = gst;
  state.pricing.roundOff = roundOff;
  state.pricing.grandTotal = totalWithFee;

  const summaryLabel = cart.labels.length > 2
    ? `${cart.labels.slice(0, 2).join(" + ")} +${cart.labels.length - 2} more`
    : cart.labels.join(" + ");
  $("price-line-label").textContent = summaryLabel || "Your passes";
  $("price-original").textContent = `₹${state.pricing.original}`;

  $("price-platform-fee").textContent = `₹${platformFee.toFixed(2)}`;
  $("price-gst").textContent = `₹${gst.toFixed(2)}`;

  if (roundOff !== 0) {
    const sign = roundOff > 0 ? "+" : "−";
    $("price-round-off").textContent = `${sign}₹${Math.abs(roundOff).toFixed(2)}`;
    $("round-off-row").classList.remove("hidden");
  } else {
    $("round-off-row").classList.add("hidden");
  }

  $("price-total").textContent = state.pricing.final === 0 ? "FREE" : `₹${state.pricing.grandTotal}`;

  const discountRow = $("discount-row");
  if (state.pricing.discount > 0) {
    $("discount-label").textContent = state.coupon ? `Coupon (${state.coupon.code})` : "Discount";
    $("price-discount").textContent = `−₹${state.pricing.discount}`;
    discountRow.classList.remove("hidden");
  } else {
    discountRow.classList.add("hidden");
  }

  const bogoRow = $("bogo-row");
  if (state.pricing.bogo) bogoRow.classList.remove("hidden");
  else bogoRow.classList.add("hidden");

  enablePayButton();
  $("pay-btn-text").textContent = state.pricing.final === 0
    ? `Get ${qty} Free Ticket${qty > 1 ? "s" : ""} →`
    : `Pay ₹${state.pricing.grandTotal} Securely`;
}

/* ── Validation ───────────────────────────────────────── */
function validateForm() {
  let ok = true;
  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.trim().replace(/\s/g, "");
  const isWhatsapp = $("is-whatsapp").checked;
  const whatsapp = isWhatsapp ? phone : $("whatsapp").value.trim().replace(/\s/g, "");
  const needYogaMat =
    document.querySelector('input[name="needYogaMat"]:checked')?.value === "yes";
  const city = ($("city") && $("city").value.trim()) || "";
  const requireStay =
    document.querySelector('input[name="requireStay"]:checked')?.value === "yes";
  let stayDays = null;
  if (requireStay && $("stay-days")) {
    const raw = $("stay-days").value.trim();
    if (raw !== "") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 30) stayDays = n;
    }
  }
  if ($("stay-days-err")) $("stay-days-err").textContent = "";
  if ($("stay-days")) $("stay-days").classList.remove("error");

  if (name.length < 2) {
    $("name-err").textContent = "Please enter your full name";
    $("name").classList.add("error"); ok = false;
  } else {
    $("name-err").textContent = ""; $("name").classList.remove("error");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    $("email-err").textContent = "Please enter a valid email address";
    $("email").classList.add("error"); ok = false;
  } else {
    $("email-err").textContent = ""; $("email").classList.remove("error");
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    $("phone-err").textContent = "Enter a valid 10-digit Indian mobile number";
    $("phone").classList.add("error"); ok = false;
  } else {
    $("phone-err").textContent = ""; $("phone").classList.remove("error");
  }

  if ($("city-err")) $("city-err").textContent = "";
  if ($("city")) $("city").classList.remove("error");

  if (!isWhatsapp && whatsapp.length > 0 && !/^[6-9]\d{9}$/.test(whatsapp)) {
    $("whatsapp-err").textContent = "Enter a valid 10-digit WhatsApp number";
    $("whatsapp").classList.add("error"); ok = false;
  } else if (!isWhatsapp) {
    $("whatsapp-err").textContent = "";
    if ($("whatsapp")) $("whatsapp").classList.remove("error");
  }

  const cart = getCartSummary();
  if (!cart.complete) {
    showToast("Select a pass type for each line", "error");
    ok = false;
  }

  if (ok && !validateTermsAccepted()) {
    ok = false;
  }

  if (ok) {
    state.name = name;
    state.email = email;
    state.phone = phone;
    state.whatsapp = whatsapp;
    state.needYogaMat = needYogaMat;
    state.city = city;
    state.requireStay = requireStay;
    state.stayDays = stayDays;
  }
  return ok;
}

function syncStayDaysField() {
  const needsStay =
    document.querySelector('input[name="requireStay"]:checked')?.value === "yes";
  const group = $("stay-days-group");
  const input = $("stay-days");
  if (!group || !input) return;

  group.classList.toggle("hidden", !needsStay);
  if (!needsStay) {
    input.value = "";
    if ($("stay-days-err")) $("stay-days-err").textContent = "";
    input.classList.remove("error");
  }
}

/* ── WhatsApp toggle ──────────────────────────────────── */
$("is-whatsapp").addEventListener("change", (e) => {
  const group = $("whatsapp-group");
  if (group) group.classList.toggle("hidden", e.target.checked);
});

document.querySelectorAll('input[name="requireStay"]').forEach((radio) => {
  radio.addEventListener("change", syncStayDaysField);
});
syncStayDaysField();

/* ── Payment ──────────────────────────────────────────── */
$("pay-btn").addEventListener("click", initiatePayment);

async function initiatePayment() {
  const termsOk = validateTermsAccepted({
    scrollIntoView: true,
    openModalOnFail: true,
  });
  if (!termsOk) return;

  if (!validateForm()) {
    const firstError = document.querySelector(".field-input.error");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const payBtn = $("pay-btn");
  const payText = $("pay-btn-text");
  const paySpinner = $("pay-spinner");
  const payError = $("pay-error");

  payBtn.disabled = true;
  payText.textContent = "Creating order...";
  paySpinner.classList.remove("hidden");
  payError.classList.add("hidden");

  try {
    const cart = getCartSummary();
    const orderBody = {
      name: state.name,
      email: state.email,
      phone: state.phone,
      whatsapp: state.whatsapp,
      imageUrl: "",
      eventId: CONFIG.EVENT_ID,
      couponCode: state.coupon?.code || null,
      lineItems: cart.lineItems,
      needYogaMat: state.needYogaMat,
      city: state.city,
      requireStay: state.requireStay,
      stayDays: state.stayDays,
    };

    const orderRes = await fetch(`${CONFIG.API_BASE}/api/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderBody),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      // Sold-out: re-fetch types so card reflects new state
      if (orderData.soldOut) {
        showToast("Ticket type just sold out - please choose another", "error");
        loadTicketTypes();
      }
      throw new Error(orderData.error || "Failed to create order");
    }

    // FREE ticket (100% coupon)
    if (orderData.free) {
      const ticketIds = orderData.ticketIds || [orderData.ticketId];
      const bogoIds = orderData.bogoTicketIds || (orderData.bogoTicketId ? [orderData.bogoTicketId] : []);
      window.location.href = `ticket.html?ids=${[...ticketIds, ...bogoIds].join(",")}`;
      return;
    }

    payText.textContent = "Opening payment...";

    const rzp = new Razorpay({
      key: orderData.keyId,
      order_id: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: state.eventName || CONFIG.EVENT_NAME,
      description: `${cart.totalQty} ticket(s) - ${state.eventDate || CONFIG.EVENT_DATE}`,
      prefill: {
        name: state.name,
        email: state.email,
        contact: `+91${state.phone}`,
      },
      theme: { color: "#7a27a9", backdrop_color: "rgba(31,18,60,0.92)" },
      modal: {
        ondismiss: () => {
          payBtn.disabled = false;
          updatePriceDisplay();
          paySpinner.classList.add("hidden");
        },
      },
      handler: async (response) => {
        payText.textContent = "Verifying payment...";
        try {
          const verifyRes = await fetch(`${CONFIG.API_BASE}/api/payment/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

          const ticketIds = verifyData.ticketIds || [verifyData.ticketId];
          const bogoIds = verifyData.bogoTicketIds || (verifyData.bogoTicketId ? [verifyData.bogoTicketId] : []);
          window.location.href = `ticket.html?ids=${[...ticketIds, ...bogoIds].join(",")}`;
        } catch (err) {
          payError.textContent = `Verification error: ${err.message}. Contact support with order: ${orderData.orderId}`;
          payError.classList.remove("hidden");
          payBtn.disabled = false;
          updatePriceDisplay();
          paySpinner.classList.add("hidden");
        }
      },
    });
    rzp.open();
  } catch (err) {
    payBtn.disabled = false;
    updatePriceDisplay();
    paySpinner.classList.add("hidden");
    payError.textContent = err.message || "Something went wrong. Please try again.";
    payError.classList.remove("hidden");
  }
}

/* ── Event terms & conditions ─────────────────────────── */
const EVENT_TERMS = [
  {
    title: "Entry pass & festival access",
    summary:
      "Your ticket grants entry to PAWSE for the day(s) covered by your pass type only.",
    detail:
      "PAWSE is a multi-day, open-format community festival. Your purchase is valid solely for the pass category selected at checkout (for example, a single-day pass or a three-day pass). Access is subject to verification at the venue and may be refused if the pass is invalid, duplicated, or misused.",
  },
  {
    title: "Single-day vs three-day passes",
    summary:
      "A one-day pass is valid on one festival day only. A three-day pass is valid across all three days.",
    detail:
      "Unless you have explicitly purchased a three-day pass, your ticket applies to one calendar day of the event only. You cannot use a single-day pass on multiple days. If you are unsure which pass you bought, check your ticket type before arriving at the gate.",
  },
  {
    title: "One-time entry (no re-entry)",
    summary:
      "Each pass allows a single entry. Once you leave the venue, the same pass cannot be used to enter again.",
    detail:
      "For security and crowd management, entry is one-time per issued pass. Plan your visit accordingly. Re-entry may only be permitted if expressly stated on your pass type or announced officially by the organisers-otherwise, exiting the venue ends your access for that day.",
  },
  {
    title: "Gate entry & QR scan",
    summary:
      "Present your ticket (QR code) at the main gate. Our team will scan it before you enter.",
    detail:
      "Arrive with your digital or printed ticket ready. Screenshots are acceptable if clearly readable. Each QR is unique and tied to one attendee. Sharing, duplicating, or attempting multiple entries with the same code is prohibited and may result in cancellation without refund.",
  },
  {
    title: "Activities, shops & stalls",
    summary:
      "Your entry pass does not include paid workshops, stalls, or add-on experiences.",
    detail:
      "Inside the festival you may find food vendors, merchandise, charity stalls, and ticketed or paid activities. Those are billed separately by the respective vendor or activity host. Prices and availability are set by each stall or partner; Animals With Humanity is not responsible for third-party charges or service quality.",
  },
  {
    title: "Participating in activities",
    summary:
      "Follow instructions from volunteers, security, and stall teams when you join any activity.",
    detail:
      "Activities may have age limits, capacity caps, safety rules, or sign-up steps. By participating, you agree to comply with on-site directions. The organisers may pause or refuse participation if rules are not followed, for your safety and that of attendees, animals, and staff.",
  },
  {
    title: "Bringing your pet",
    summary:
      "Pets are welcome at PAWSE. Please keep them on a leash or in a comfortable carrier, stay close by, and help ensure they are calm and safe around other guests and the venue.",
    detail:
      "PAWSE is proudly pet-friendly. Your pet is your responsibility: please supervise them at all times and take gentle steps to prevent jumping, nipping, knocking over displays, or damaging anyone’s belongings. Look after their comfort, hydration, and bathroom needs throughout the day. If your pet seems excited, anxious, or overwhelmed, please guide them to a quieter spot. Thoughtful pet parenting keeps the festival enjoyable for people, pets, and stall teams alike.",
  },
  {
    title: "Interacting with other pets",
    summary:
      "Always ask the pet parent before petting, feeding, or photographing someone else’s animal.",
    detail:
      "Not every pet is comfortable with strangers. Respect boundaries, avoid sudden contact, and follow any guidance the guardian gives. Children should be supervised near animals. Feeding animals without permission is not allowed.",
  },
  {
    title: "Sustainable, eco-friendly conduct",
    summary:
      "Help us keep the venue clean: use bins, avoid single-use waste where possible, and respect the space.",
    detail:
      "PAWSE promotes sustainability and compassion. Do not litter, damage property, or disturb wildlife. Use designated disposal and recycling points. Vendors and attendees are encouraged to minimise plastic and waste throughout the festival.",
  },
  {
    title: "Photography & social media",
    summary:
      "By attending, you agree that photos and videos from the event may be used for promotion and social media.",
    detail:
      "Official organisers and authorised partners may capture stills and footage for reporting, marketing, and community outreach (including social media). If you prefer not to appear in close-up promotional material, inform a team member on site where reasonably possible. You may also take personal photos respectfully, without harassing attendees, animals, or staff.",
  },
  {
    title: "Personal belongings",
    summary:
      "You are responsible for your belongings. The organisers are not liable for loss, theft, or damage.",
    detail:
      "Please travel light and secure valuables. Lost-and-found may be operated on a best-effort basis at a designated desk; unclaimed items may be disposed of after the event. Report issues promptly to on-site volunteers.",
  },
  {
    title: "Conduct, safety & removal",
    summary:
      "Maintain decorum. Intoxication, harassment, or rule-breaking can lead to removal without refund.",
    detail:
      "We are committed to a safe, inclusive, and family- and pet-friendly environment. Alcohol or substance misuse, abusive language, violence, discrimination, or disregard for staff instructions will not be tolerated. The event team may suspend or revoke your entry immediately, without refund, to protect other guests, animals, and property. Serious incidents may be reported to the authorities.",
  },
];

function renderEventTerms() {
  const list = $("terms-points-list");
  if (!list) return;

  list.innerHTML = EVENT_TERMS.map(
    (item, index) => `
    <article class="terms-point" data-term-index="${index}">
      <h3 class="terms-point-title">${index + 1}. ${item.title}</h3>
      <p class="terms-point-summary">${item.summary}</p>
      <p class="terms-point-detail">${item.detail}</p>
      <button type="button" class="terms-read-more" aria-expanded="false">Read more</button>
    </article>`
  ).join("");

  list.querySelectorAll(".terms-read-more").forEach((btn) => {
    btn.addEventListener("click", () => {
      const point = btn.closest(".terms-point");
      const open = point.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Show less" : "Read more";
    });
  });
}

function openTermsModal() {
  const modal = $("terms-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeTermsModal() {
  const modal = $("terms-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function acceptTermsFromModal() {
  const box = $("accept-terms");
  const section = $("terms-accept-section");
  const err = $("terms-err");
  if (box) box.checked = true;
  if (section) section.classList.remove("terms-accept-section--error");
  if (err) err.textContent = "";
  closeTermsModal();
}

function validateTermsAccepted({ scrollIntoView = false, openModalOnFail = false } = {}) {
  const box = $("accept-terms");
  const section = $("terms-accept-section");
  const err = $("terms-err");
  if (!box) return true;

  if (box.checked) {
    if (section) section.classList.remove("terms-accept-section--error");
    if (err) err.textContent = "";
    return true;
  }

  if (err) {
    err.textContent = "Please read and accept the Terms & Conditions to continue.";
  }
  if (section) section.classList.add("terms-accept-section--error");
  showToast("Please review and accept the Terms & Conditions before booking.", "error");
  if (openModalOnFail) openTermsModal();
  if (scrollIntoView && section) {
    section.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return false;
}

function initTermsUI() {
  renderEventTerms();

  const inlineOpen = $("terms-open-inline");
  if (inlineOpen) {
    const openFromInline = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTermsModal();
    };
    inlineOpen.addEventListener("mousedown", (e) => e.preventDefault());
    inlineOpen.addEventListener("click", openFromInline);
    inlineOpen.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openTermsModal();
      }
    });
  }

  $("terms-modal-close")?.addEventListener("click", closeTermsModal);
  $("terms-modal-backdrop")?.addEventListener("click", closeTermsModal);
  $("terms-modal-agree")?.addEventListener("click", acceptTermsFromModal);

  $("accept-terms")?.addEventListener("change", (e) => {
    if (e.target.checked) {
      $("terms-err").textContent = "";
      $("terms-accept-section")?.classList.remove("terms-accept-section--error");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("terms-modal")?.classList.contains("hidden")) {
      closeTermsModal();
    }
  });
}

/* ── FAQ Accordion ────────────────────────────────────── */
document.querySelectorAll(".faq-q").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item.open").forEach((el) => el.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  });
});

/* ── Mobile Menu ──────────────────────────────────────── */
(function () {
  const toggle = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  const bookBtn = document.getElementById("mobile-book-btn");

  toggle.addEventListener("click", () => {
    const isOpen = menu.style.display === "flex";
    menu.style.display = isOpen ? "none" : "flex";
    toggle.classList.toggle("open", !isOpen);
  });

  bookBtn.addEventListener("click", () => {
    menu.style.display = "none";
    toggle.classList.remove("open");
  });
})();

/* ── Carousel ─────────────────────────────────────────── */
(function () {
  const trk = document.getElementById("carousel-trk");
  const dotsEl = document.getElementById("c-dots");
  const counter = document.getElementById("c-counter");
  const prevBtn = document.getElementById("c-prev");
  const nextBtn = document.getElementById("c-next");
  if (!trk || !trk.children.length) return;

  const slides = Array.from(trk.children);
  const totalSlides = slides.length;
  let pos = 0, perView = 3, autoT;

  function getPV() { return window.innerWidth <= 700 ? 1 : 3; }

  function getSlideStep() {
    const firstSlide = slides[0];
    if (!firstSlide) return 0;
    return firstSlide.offsetWidth + (parseFloat(getComputedStyle(trk).gap) || 12);
  }

  function totalSteps() { return Math.max(0, totalSlides - getPV()); }

  function buildDots() {
    dotsEl.innerHTML = "";
    for (let i = 0; i <= totalSteps(); i++) {
      const d = document.createElement("button");
      d.className = "c-dot" + (i === pos ? " active" : "");
      d.addEventListener("click", () => goTo(i));
      dotsEl.appendChild(d);
    }
  }

  function update() {
    trk.style.transform = `translateX(-${pos * getSlideStep()}px)`;
    dotsEl.querySelectorAll(".c-dot").forEach((d, i) => d.classList.toggle("active", i === pos));
    counter.textContent = `${pos + 1} / ${totalSteps() + 1}`;
    prevBtn.disabled = pos === 0;
    nextBtn.disabled = pos >= totalSteps();
  }

  function goTo(n) {
    pos = Math.max(0, Math.min(n, totalSteps()));
    update();
    clearInterval(autoT);
    autoT = setInterval(() => goTo(pos >= totalSteps() ? 0 : pos + 1), 3500);
  }

  prevBtn.addEventListener("click", () => goTo(pos - 1));
  nextBtn.addEventListener("click", () => goTo(pos + 1));

  window.addEventListener("resize", () => {
    const nv = getPV();
    if (nv !== perView) { perView = nv; pos = 0; buildDots(); }
    update();
  });

  perView = getPV();
  buildDots();
  goTo(0);
})();

/* ── Init ─────────────────────────────────────────────── */
initTermsUI();
updatePriceDisplay();
loadEventConfig().then(loadTicketTypes);