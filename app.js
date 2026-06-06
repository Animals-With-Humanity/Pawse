/* ═══════════════════════════════════════════════════════
   app.js — Booking Page Logic (Single-Step)
   ═══════════════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);

const state = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  quantity: 1,
  coupon: null,
  // Selected ticket type (required — no fallback)
  selectedTicketType: null,
  ticketTypesLoaded: false,
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
};

/* ── Toast ────────────────────────────────────────────── */
function showToast(msg, type = "info") {
  const toast = $("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

/* ── Ticket Types ─────────────────────────────────────── */
async function loadTicketTypes() {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/events/${CONFIG.EVENT_ID}/ticket-types`);
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();

    $("ticket-types-loading").style.display = "none";

    if (!data.ticketTypes || data.ticketTypes.length === 0) {
      showTicketTypeError("No ticket types available for this event.");
      return;
    }

    state.ticketTypesLoaded = true;
    renderTicketTypeCards(data.ticketTypes);
  } catch (_) {
    $("ticket-types-loading").style.display = "none";
    showTicketTypeError("Failed to load ticket options. Please refresh the page.");
  }
}

function showTicketTypeError(message) {
  state.ticketTypesLoaded = false;
  $("ticket-type-fallback").style.display = "none";
  $("ticket-types-loading").style.display = "none";

  // Show error message in the ticket type area
  const container = $("ticket-type-cards");
  container.style.display = "flex";
  container.innerHTML = `
    <div style="text-align:center;padding:1.5rem 1rem;color:#ef4444;font-family:'Montserrat',sans-serif;font-size:0.85rem;border:1.5px dashed #fca5a5;border-radius:12px;background:rgba(239,68,68,0.04);">
      <div style="font-size:1.5rem;margin-bottom:0.5rem;">⚠️</div>
      <div style="font-weight:600;">${message}</div>
    </div>
  `;

  // Disable the pay button
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

function renderTicketTypeCards(types) {
  const container = $("ticket-type-cards");
  container.innerHTML = "";
  container.style.display = "flex";

  types.forEach((type) => {
    const card = document.createElement("div");
    card.className = "ticket-type-card" + (type.soldOut ? " sold-out" : "");
    card.dataset.typeId = type.id;

    let availText = "";
    if (type.soldOut) {
      availText = "Sold out";
    } else if (type.remaining !== null && type.remaining <= 20) {
      availText = `${type.remaining} left`;
    } else if (type.remaining !== null) {
      availText = `${type.remaining} available`;
    }

    card.innerHTML = `
      ${type.soldOut ? '<span class="sold-out-badge">SOLD OUT</span>' : ""}
      <div class="ticket-type-card-left">
        <div class="ticket-type-radio">
          <div class="ticket-type-radio-dot"></div>
        </div>
        <div class="ticket-type-info">
          <span class="ticket-type-name">${type.label}</span>
          ${type.description ? `<span class="ticket-type-desc">${type.description}</span>` : ""}
        </div>
      </div>
      <div class="ticket-type-right">
        <span class="ticket-type-price">₹${type.price}</span>
        ${availText ? `<span class="ticket-type-avail${type.remaining !== null && type.remaining <= 10 && !type.soldOut ? " low" : ""}">limited available</span>` : ""}
      </div>
    `;

    if (!type.soldOut) {
      card.addEventListener("click", () => selectTicketType(type));
    }

    container.appendChild(card);
  });

  // Auto-select the first non-sold-out type
  const first = types.find((t) => !t.soldOut);
  if (first) selectTicketType(first);

  // Show qty section
  $("qty-section").style.display = "block";
}

function selectTicketType(type) {
  state.selectedTicketType = type;

  // Update card highlight
  document.querySelectorAll(".ticket-type-card").forEach((c) => {
    c.classList.toggle("selected", c.dataset.typeId === type.id);
  });

  // Update qty label
  $("qty-type-label").textContent = `${type.label} · ₹${type.price} each`;

  // Reset coupon when type changes
  if (state.coupon) removeCoupon();

  updatePriceDisplay();
}

/* ── Quantity Counter ─────────────────────────────────── */
function setQuantity(qty) {
  state.quantity = Math.max(1, Math.min(10, qty));
  const qtyEl = $("qty-value");
  if (qtyEl) qtyEl.textContent = state.quantity;
  updatePriceDisplay();
  if (state.coupon) removeCoupon();
}

// Wire up qty buttons for the types-based section
$("qty-minus").addEventListener("click", () => setQuantity(state.quantity - 1));
$("qty-plus").addEventListener("click", () => setQuantity(state.quantity + 1));

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

  if (!state.selectedTicketType) {
    showCouponFeedback("Please select a ticket type first", "error");
    applyBtn.textContent = "Apply";
    applyBtn.disabled = false;
    return;
  }
  const unitPrice = state.selectedTicketType.price;
  const totalAmount = unitPrice * state.quantity;

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/coupon/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        eventId: CONFIG.EVENT_ID,
        phone,
        quantity: state.quantity,
        ticketTypeId: state.selectedTicketType.id,
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
  if (!state.selectedTicketType) return;
  const unitPrice = state.selectedTicketType.price;
  const totalAmount = unitPrice * state.quantity;
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
  $("coupon-applied-title").textContent = `${coupon.code} — ${typeLabels[coupon.type] || "DISCOUNT"}`;
  $("coupon-applied-desc").textContent = coupon.description || "";
  $("coupon-applied-savings").textContent =
    pricing.bogoExtra ? "+1 Free Ticket" : `−₹${pricing.discountAmount}`;
  couponApplied.classList.remove("hidden");
}

/* ── Platform Fee Calculation ─────────────────────────── */
function calculatePlatformFee(amountAfterCoupon) {
  // if (amountAfterCoupon <= 0) return { platformFee: 0, gst: 0, roundOff: 0, totalWithFee: 0 };
  // const platformFee = amountAfterCoupon * 0.02;
  // const gst = platformFee * 0.18;
  // const exactTotal = amountAfterCoupon + platformFee + gst;
  // const roundedTotal = Math.round(exactTotal);
  // const roundOff = roundedTotal - exactTotal;
  // return {
  //   platformFee: Number(platformFee.toFixed(2)),
  //   gst: Number(gst.toFixed(2)),
  //   roundOff: Number(roundOff.toFixed(2)),
  //   totalWithFee: roundedTotal,
  // };
  if (amountAfterCoupon <= 0) return { platformFee: 0, gst: 0, roundOff: 0, totalWithFee: 0 };
  // const platformFee = amountAfterCoupon * 0.02;
  const platformFee = 3;
  const gst = 0;
  const exactTotal = amountAfterCoupon + platformFee + gst;
  const roundedTotal = 0;
  const roundOff = 0;
  return {
    platformFee: Number(platformFee.toFixed(2)),
    gst: 0,
    roundOff: 0,
    totalWithFee: exactTotal,
  };
}

/* ── Price Display ────────────────────────────────────── */
function updatePriceDisplay() {
  const qty = state.quantity;

  // If no ticket type selected, show zeroed-out state and keep button disabled
  if (!state.selectedTicketType) {
    $("price-line-label").textContent = `Select a ticket type`;
    $("price-original").textContent = `₹0`;
    $("price-platform-fee").textContent = `₹0.00`;
    $("price-gst").textContent = `₹0.00`;
    $("round-off-row").classList.add("hidden");
    $("price-total").textContent = `₹0`;
    $("discount-row").classList.add("hidden");
    $("bogo-row").classList.add("hidden");
    if (!state.ticketTypesLoaded) {
      disablePayButton("Tickets Unavailable");
    } else {
      disablePayButton("Select a Ticket Type");
    }
    return;
  }

  const unitPrice = state.selectedTicketType.price;
  const totalOriginal = unitPrice * qty;

  // Recalculate base if no coupon
  if (!state.coupon) {
    state.pricing.original = totalOriginal;
    state.pricing.final = totalOriginal;
    state.pricing.discount = 0;
  }

  const { platformFee, gst, roundOff, totalWithFee } = calculatePlatformFee(state.pricing.final);
  state.pricing.platformFee = platformFee;
  state.pricing.gst = gst;
  state.pricing.roundOff = roundOff;
  state.pricing.grandTotal = totalWithFee;

  const typeName = state.selectedTicketType.label;
  $("price-line-label").textContent = `${typeName} ×${qty}`;
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

  // Enable pay button since we have a valid ticket type
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

  if (!isWhatsapp && whatsapp.length > 0 && !/^[6-9]\d{9}$/.test(whatsapp)) {
    $("whatsapp-err").textContent = "Enter a valid 10-digit WhatsApp number";
    $("whatsapp").classList.add("error"); ok = false;
  } else if (!isWhatsapp) {
    $("whatsapp-err").textContent = "";
    if ($("whatsapp")) $("whatsapp").classList.remove("error");
  }

  // Require a ticket type selection — no fallback
  if (!state.selectedTicketType) {
    showToast("Please select a ticket type", "error");
    ok = false;
  }

  if (ok) {
    state.name = name;
    state.email = email;
    state.phone = phone;
    state.whatsapp = whatsapp;
  }
  return ok;
}

/* ── WhatsApp toggle ──────────────────────────────────── */
$("is-whatsapp").addEventListener("change", (e) => {
  const group = $("whatsapp-group");
  if (group) group.classList.toggle("hidden", e.target.checked);
});

/* ── Payment ──────────────────────────────────────────── */
$("pay-btn").addEventListener("click", initiatePayment);

async function initiatePayment() {
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
    const orderBody = {
      name: state.name,
      email: state.email,
      phone: state.phone,
      whatsapp: state.whatsapp,
      imageUrl: "",
      eventId: CONFIG.EVENT_ID,
      couponCode: state.coupon?.code || null,
      quantity: state.quantity,
    };

    // Ticket type is required
    orderBody.ticketTypeId = state.selectedTicketType.id;

    const orderRes = await fetch(`${CONFIG.API_BASE}/api/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderBody),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      // Sold-out: re-fetch types so card reflects new state
      if (orderData.soldOut) {
        showToast("Ticket type just sold out — please choose another", "error");
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
      name: CONFIG.EVENT_NAME,
      description: `${state.quantity} ${state.selectedTicketType.label}${state.quantity > 1 ? "s" : ""} — ${CONFIG.EVENT_DATE}`,
      prefill: {
        name: state.name,
        email: state.email,
        contact: `+91${state.phone}`,
      },
      theme: { color: "#e8ff47", backdrop_color: "rgba(8,10,14,0.95)" },
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
updatePriceDisplay();
loadTicketTypes();
