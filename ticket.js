/* ═══════════════════════════════════════════════════════
   ticket.js — Multi-Ticket Display Page
   Shows all tickets with individual QR codes, download all
   ═══════════════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);

// Support both single ticket (legacy) and multiple tickets
const singleId = params.get("id");
const multiIds = params.get("ids");
const bogoId = params.get("bogo");

let ticketIds = [];
if (multiIds) {
  ticketIds = multiIds.split(",").filter(Boolean);
} else if (singleId) {
  ticketIds = [singleId];
  if (bogoId) ticketIds.push(bogoId);
}

function showToast(msg, type = "info") {
  const toast = $("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

async function loadTickets() {
  if (!ticketIds.length) { showError(); return; }

  try {
    const tickets = [];
    for (const id of ticketIds) {
      const res = await fetch(`${CONFIG.API_BASE}/api/ticket/${id}`);
      const data = await res.json();
      if (res.ok && data.ticket) tickets.push(data.ticket);
    }

    if (tickets.length === 0) { showError(); return; }
    renderAllTickets(tickets);
  } catch (err) { showError(); }
}

function renderAllTickets(tickets) {
  $("page-loader").style.display = "none";
  $("ticket-main").style.display = "block";

  // Update success banner for multiple tickets
  if (tickets.length > 1) {
    const bannerText = $("success-banner").querySelector(".success-text");
    if (bannerText) {
      bannerText.innerHTML = `
        <strong>Payment Confirmed!</strong>
        <span>${tickets.length} tickets have been generated and are ready for use.</span>
      `;
    }
  }

  const container = $("tickets-container");
  container.innerHTML = "";

  // Ticket navigation for multiple tickets
  if (tickets.length > 1) {
    const nav = document.createElement("div");
    nav.className = "ticket-nav-bar";
    nav.innerHTML = `
      <div class="ticket-nav-count">
        <span class="ticket-nav-icon">🎟️</span>
        <span>${tickets.length} Tickets</span>
      </div>
      <div class="ticket-nav-hint">Scroll to view all tickets ↓</div>
    `;
    container.appendChild(nav);
  }

  tickets.forEach((ticket, index) => {
    const ticketEl = createTicketCard(ticket, index, tickets.length);
    container.appendChild(ticketEl);
  });

  // Confetti
  const fromPayment = document.referrer.includes("index.html") || params.get("new") === "1" || multiIds;
  if (fromPayment) {
    setTimeout(launchConfetti, 400);
  }
}

function createTicketCard(ticket, index, total) {
  const wrapper = document.createElement("div");
  wrapper.className = "ticket-card-wrapper";

  // Ticket label for multi-ticket
  if (total > 1) {
    const label = document.createElement("div");
    label.className = "ticket-index-label";
    label.innerHTML = `<span class="til-num">Ticket ${index + 1}</span><span class="til-total">of ${total}</span>`;
    wrapper.appendChild(label);
  }

  const ticketDiv = document.createElement("div");
  ticketDiv.className = "ticket";
  ticketDiv.id = `ticket-card-${index}`;

  // ── Coupon badge ──
  let couponBadgeHTML = "";
  if (ticket.coupon) {
    const typeLabel = { percent: `${ticket.coupon.value}% OFF`, flat: `₹${ticket.coupon.value} OFF`, free: "FREE", bogo: "BOGO" };
    couponBadgeHTML = `<div class="ticket-coupon-badge">🏷️ ${ticket.coupon.code} — ${typeLabel[ticket.coupon.type] || "DISCOUNT"}</div>`;
    if (ticket.discountAmount > 0 && index === 0) {
      couponBadgeHTML += `<div class="ticket-savings-line">You saved ₹${ticket.discountAmount}</div>`;
    }
  }

  // ── BOGO badge ──
  let bogoBadgeHTML = "";
  if (ticket.isBogoPair) {
    bogoBadgeHTML = `<div class="ticket-bogo-badge">🎉 BOGO BONUS</div>`;
  }

  // ── Price line ──
  let priceHTML = "";
  if (ticket.originalAmount && ticket.originalAmount !== ticket.amount) {
    priceHTML = `<div class="ticket-price-line"><s>₹${ticket.originalAmount}</s> <span class="ticket-price-final">${ticket.amount === 0 ? "FREE" : `₹${ticket.amount}`}</span></div>`;
  } else {
    priceHTML = `<div class="ticket-price-line">${ticket.amount === 0 ? "FREE" : `₹${ticket.amount}`}</div>`;
  }

  ticketDiv.innerHTML = `
    <div class="ticket-left">
      <div class="ticket-event-name">PAWSE</div>
      <div class="ticket-event-year">2026</div>
      <div class="ticket-date">2026</div>
      <div class="ticket-venue"></div>

      <div class="ticket-divider">
        <div class="ticket-notch left-notch"></div>
        <div class="ticket-dashes"></div>
        <div class="ticket-notch right-notch"></div>
      </div>

      <div class="ticket-holder">
        <div class="ticket-holder-info">
          <div class="ticket-holder-name">${ticket.name}</div>
          <div class="ticket-holder-phone">${ticket.phone}</div>
        </div>
      </div>

      <div class="ticket-type-badge">${ticket.isBogoPair ? "BOGO BONUS" : (ticket.ticketTypeLabel || "GENERAL ADMISSION")}</div>
      ${couponBadgeHTML}
      ${bogoBadgeHTML}
    </div>

    <div class="ticket-right">
      <div class="ticket-stub-label">SCAN AT ENTRY</div>
      <div class="qr-box">
        <canvas class="qr-canvas" id="qr-canvas-${index}"></canvas>
      </div>
      <div class="ticket-id">${ticket.ticketId}</div>
      <div class="ticket-valid-text">Valid for 1 time entry only</div>
      ${priceHTML}
    </div>
  `;

  wrapper.appendChild(ticketDiv);

  // Individual download button
  const actions = document.createElement("div");
  actions.className = "ticket-card-actions";
  actions.innerHTML = `
    <button class="ticket-action-btn primary-action download-single-btn" data-index="${index}">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v10M5 9l5 5 5-5M3 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Download Ticket ${total > 1 ? (index + 1) : ""}
    </button>
  `;
  wrapper.appendChild(actions);

  // Render QR after DOM insert
  setTimeout(() => {
    const canvas = document.getElementById(`qr-canvas-${index}`);
    if (canvas && window.QRCode) {
      QRCode.toCanvas(canvas, ticket.qrData || ticket.ticketId, {
        width: 140,
        color: { dark: "#000000", light: "#ffffff" },
        margin: 1,
        errorCorrectionLevel: "H",
      });
    }
  }, 100);

  return wrapper;
}

function showError() {
  $("page-loader").style.display = "none";
  $("ticket-error").classList.remove("hidden");
}

// ─── Confetti ─────────────────────────────────────────────────────
function launchConfetti() {
  const canvas = $("confetti-canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");
  const colors = ["#e8ff47", "#ffffff", "#4dff9e", "#ff9d3d", "#a78bfa"];
  const particles = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width, y: -20,
    r: Math.random() * 5 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 10,
    tiltAngle: 0, tiltAngleInc: Math.random() * 0.07 + 0.05,
    vx: Math.random() * 3 - 1.5, vy: Math.random() * 3 + 2, opacity: 1,
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.tiltAngle += p.tiltAngleInc;
      p.x += p.vx; p.y += p.vy;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      p.opacity -= 0.005;
      ctx.beginPath();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.4, p.tilt, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (++frame < 200) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

// ─── Download Individual Ticket ───────────────────────────────────
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".download-single-btn");
  if (!btn) return;

  const index = btn.dataset.index;
  const ticketEl = document.getElementById(`ticket-card-${index}`);
  if (!ticketEl) return;

  btn.textContent = "Preparing...";
  btn.disabled = true;

  try {
    if (window.html2canvas) {
      const canvas = await html2canvas(ticketEl, { backgroundColor: "#0f1217", scale: 2 });
      const link = document.createElement("a");
      link.download = `PAWSE-ticket-${ticketIds[index] || index + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else { window.print(); }
  } catch (e) { window.print(); } finally {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M5 9l5 5 5-5M3 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Download Ticket ${ticketIds.length > 1 ? (parseInt(index) + 1) : ""}`;
    btn.disabled = false;
  }
});

// ─── Download All Tickets ─────────────────────────────────────────
$("download-btn").addEventListener("click", async () => {
  const btn = $("download-btn");
  btn.textContent = "Preparing...";
  btn.disabled = true;

  try {
    const ticketEls = document.querySelectorAll(".ticket");
    for (let i = 0; i < ticketEls.length; i++) {
      if (window.html2canvas) {
        const canvas = await html2canvas(ticketEls[i], { backgroundColor: "#0f1217", scale: 2 });
        const link = document.createElement("a");
        link.download = `piy-ticket-${ticketIds[i] || i + 1}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        // Small delay between downloads
        if (i < ticketEls.length - 1) await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (e) { window.print(); } finally {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M5 9l5 5 5-5M3 17h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Download All Tickets`;
    btn.disabled = false;
  }
});

// ─── Mobile Menu Toggle ───────────────────────────────────────────
(function () {
  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const bookBtn = document.getElementById('mobile-book-btn');

  toggle.addEventListener('click', function () {
    const isOpen = menu.style.display === 'flex';
    menu.style.display = isOpen ? 'none' : 'flex';
    toggle.classList.toggle('open', !isOpen);
  });

  // Close menu when Book Tickets is tapped
  bookBtn.addEventListener('click', function () {
    menu.style.display = 'none';
    toggle.classList.remove('open');
  });
})();

// ─── Share ────────────────────────────────────────────────────────
$("share-btn").addEventListener("click", async () => {
  const url = window.location.href;
  if (navigator.share) {
    await navigator.share({ title: "My PIY 2026 Tickets", text: `I'm going to PIY 2026 with ${ticketIds.length} ticket(s)! 🎉`, url });
  } else {
    await navigator.clipboard.writeText(url);
    showToast("Ticket link copied to clipboard!", "success");
  }
});

loadTickets();
