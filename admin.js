/* ═══════════════════════════════════════════════════════
   admin.js — Gate Dashboard + Coupon Manager
   ═══════════════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);
let adminToken = sessionStorage.getItem("adminToken") || "";
let eventId = sessionStorage.getItem("eventId") || "";
let html5QrCode = null;
let scannerActive = false;

function showToast(msg, type = "info") {
  const toast = $("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// ─── Login ────────────────────────────────────────────────────────
if (adminToken && eventId) showDashboard();

$("admin-login-btn").addEventListener("click", async () => {
  const token = $("admin-token-input").value.trim();
  const event = $("admin-event-input").value.trim().toUpperCase();
  if (!token || !event) { $("admin-login-err").textContent = "Both fields are required"; return; }

  const btn = $("admin-login-btn");
  btn.querySelector("span").textContent = "Verifying...";
  btn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/ticket/event/${event}/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) { $("admin-login-err").textContent = "Invalid admin token"; return; }

    adminToken = token; eventId = event;
    sessionStorage.setItem("adminToken", token);
    sessionStorage.setItem("eventId", event);
    showDashboard();
    const data = await res.json();
    updateStats(data.stats);
    renderAttendeeTable(data.tickets);
  } catch (err) {
    $("admin-login-err").textContent = "Connection failed. Check backend URL in config.js";
  } finally {
    btn.querySelector("span").textContent = "Access Dashboard";
    btn.disabled = false;
  }
});

function showDashboard() {
  $("admin-login").style.display = "none";
  $("admin-dashboard").classList.remove("hidden");
  loadAttendees();
  loadCoupons();
  loadTicketTypes();
}

$("logout-btn").addEventListener("click", () => {
  sessionStorage.clear(); adminToken = ""; eventId = "";
  stopScanner();
  $("admin-dashboard").classList.add("hidden");
  $("admin-login").style.display = "flex";
  $("admin-token-input").value = "";
  $("admin-event-input").value = "";
});

// ─── Tabs ─────────────────────────────────────────────────────────
document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".admin-tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $(tab.dataset.panel).classList.add("active");
  });
});

// ─── Stats ────────────────────────────────────────────────────────
function updateStats(stats) {
  if (!stats) return;
  $("stat-total").textContent = stats.total ?? "—";
  $("stat-unused").textContent = stats.unused ?? "—";
  $("stat-used").textContent = stats.used ?? "—";
}

// ─── Load Attendees ───────────────────────────────────────────────
async function loadAttendees() {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/ticket/event/${eventId}/list`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.ok) { updateStats(data.stats); renderAttendeeTable(data.tickets); }
  } catch (err) { console.error("Failed to load attendees", err); }
}

$("refresh-list-btn").addEventListener("click", loadAttendees);

function renderAttendeeTable(tickets) {
  const tbody = $("attendee-tbody");
  if (!tickets || tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">No tickets found.</td></tr>`; return;
  }
  tbody.innerHTML = tickets.map((t) => `
    <tr>
      <td>${t.ticketId}</td>
      <td style="color:var(--text)">${t.name}</td>
      <td>${t.phone}</td>
      <td>${t.ticketTypeLabel ? `<span class="type-pill">${t.ticketTypeLabel}</span>` : "—"}</td>
      <td>₹${t.amount}${t.discountAmount > 0 ? `<br/><small style="color:var(--green)">−₹${t.discountAmount}</small>` : ""}</td>
      <td>${t.coupon ? `<span class="type-pill ${t.coupon.type}">${t.coupon.code}</span>` : "—"}</td>
      <td>${formatDate(t.createdAt)}</td>
      <td><span class="status-pill ${t.isUsed ? "used" : "unused"}">${t.isUsed ? "CHECKED IN" : "PENDING"}</span></td>
    </tr>`).join("");
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

// ─── QR Scanner ───────────────────────────────────────────────────
$("toggle-scanner").addEventListener("click", () => { scannerActive ? stopScanner() : startScanner(); });

function startScanner() {
  if (html5QrCode) html5QrCode.clear();
  html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    (decodedText) => {
      let tId = decodedText;
      try { const dec = JSON.parse(atob(decodedText)); if (dec.t) tId = dec.t; } catch (_) {}
      verifyTicket(tId);
    },
    () => {}
  ).then(() => {
    scannerActive = true;
    $("toggle-scanner").textContent = "Stop Camera";
    $("toggle-scanner").style.background = "var(--red)";
  }).catch(() => showToast("Camera denied. Use manual entry.", "error"));
}

function stopScanner() {
  if (html5QrCode && scannerActive) {
    html5QrCode.stop().catch(() => {});
    scannerActive = false;
    $("toggle-scanner").textContent = "Start Camera";
    $("toggle-scanner").style.background = "";
  }
}

$("verify-manual-btn").addEventListener("click", () => {
  const id = $("manual-ticket-id").value.trim().toUpperCase();
  if (!id) { showToast("Enter a ticket ID", "error"); return; }
  verifyTicket(id);
  $("manual-ticket-id").value = "";
});

$("manual-ticket-id").addEventListener("keydown", (e) => { if (e.key === "Enter") $("verify-manual-btn").click(); });

async function verifyTicket(ticketId) {
  showResultState("loading");
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/ticket/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ ticketId, eventId }),
    });
    const data = await res.json();
    if (data.valid) { showValidResult(data); loadAttendees(); }
    else showInvalidResult(data);
  } catch (err) { showResultState("idle"); showToast("Verification failed.", "error"); }
}

function showResultState(state) {
  ["result-idle","result-loading","result-valid","result-invalid"].forEach((id) => {
    $(id).classList.add("hidden");
  });
  if (state !== "none") $(`result-${state}`).classList.remove("hidden");
}

function showValidResult(data) {
  const t = data.ticket;
  $("result-photo").src = t.imageUrl || "";
  $("result-name").textContent = t.name;
  $("result-phone").textContent = t.phone;
  $("result-ticket-id").textContent = t.ticketId;
  $("result-ticket-type").textContent = t.ticketTypeLabel || "General Admission";
  $("result-amount").textContent = `Paid: ₹${t.amount}`;
  showResultState("valid");
  playBeep(880, 150, "success");
}

function showInvalidResult(data) {
  const reasons = {
    TICKET_NOT_FOUND: "Ticket does not exist",
    WRONG_EVENT: "Ticket is for a different event",
    ALREADY_USED: "Ticket already used — DENY ENTRY",
  };
  $("invalid-reason").textContent = reasons[data.reason] || data.message || "Invalid ticket";
  $("invalid-detail").textContent = data.ticket?.usedAt ? `Used at: ${formatDate(data.ticket.usedAt)}` : "";
  showResultState("invalid");
  playBeep(220, 300, "error");
}

$("scan-next-valid").addEventListener("click", () => showResultState("idle"));
$("scan-next-invalid").addEventListener("click", () => showResultState("idle"));

function playBeep(freq, duration, type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type === "success" ? "sine" : "square";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration / 1000);
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════
// TICKET TYPE MANAGER
// ═══════════════════════════════════════════════════════════════════

let editingTicketTypeId = null; // null = create mode; string = edit mode

async function loadTicketTypes() {
  try {
    const res = await fetch(
      `${CONFIG.API_BASE}/api/events/${eventId}/ticket-types/admin`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const data = await res.json();
    if (res.ok) {
      renderTicketTypeTable(data.ticketTypes);
    } else {
      // Backend may not have this route yet (e.g. production not deployed) — show empty state gracefully
      renderTicketTypeTable([]);
    }
  } catch (err) {
    console.error("Failed to load ticket types", err);
    renderTicketTypeTable([]);
  }
}

$("refresh-tt-btn").addEventListener("click", loadTicketTypes);

function renderTicketTypeTable(types) {
  const tbody = $("tt-tbody");
  if (!types || types.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-loading">No ticket types yet. Create one above.</td></tr>`;
    return;
  }

  tbody.innerHTML = types.map((t) => {
    const capacityDisplay = t.totalCapacity !== null
      ? `${t.soldCount} / ${t.totalCapacity}`
      : `${t.soldCount} / ∞`;
    const soldOutBadge = t.soldOut
      ? `<span style="color:var(--red);font-size:0.72rem;font-weight:700;margin-left:4px">SOLD OUT</span>`
      : "";

    return `<tr>
      <td style="font-family:'JetBrains Mono',monospace;font-size:0.78rem">${t.id}</td>
      <td style="font-weight:600;color:var(--text)">${t.label}</td>
      <td>₹${t.price}</td>
      <td>${capacityDisplay}${soldOutBadge}</td>
      <td style="color:var(--text-muted);font-size:0.78rem;max-width:180px">${t.description || "—"}</td>
      <td>
        ${t.active
          ? `<span class="active-pill">● Active</span>`
          : `<span class="inactive-pill">○ Inactive</span>`}
      </td>
      <td>
        <button class="coupon-action-btn" onclick="editTicketType('${t.id}')">Edit</button>
        <button class="coupon-action-btn" onclick="toggleTicketType('${t.id}', ${t.active})">
          ${t.active ? "Disable" : "Enable"}
        </button>
        <button class="coupon-action-btn danger" onclick="deleteTicketType('${t.id}', '${t.label}')">Delete</button>
      </td>
    </tr>`;
  }).join("");
}

$("create-tt-btn").addEventListener("click", async () => {
  const id = $("tt-id").value.trim();
  const label = $("tt-label").value.trim();
  const price = parseFloat($("tt-price").value);
  const capacityVal = $("tt-capacity").value.trim();
  const totalCapacity = capacityVal ? parseInt(capacityVal) : null;
  const order = parseInt($("tt-order").value) || 0;
  const description = $("tt-description").value.trim();

  if (!label) { showToast("Label is required", "error"); return; }
  if (isNaN(price) || price < 0) { showToast("Enter a valid price", "error"); return; }

  const btn = $("create-tt-btn");
  const isEdit = editingTicketTypeId !== null;

  btn.textContent = isEdit ? "Saving..." : "Creating...";
  btn.disabled = true;

  try {
    let res;
    if (isEdit) {
      // Edit mode — PATCH (id and soldCount cannot be changed)
      res = await fetch(
        `${CONFIG.API_BASE}/api/events/${eventId}/ticket-types/${editingTicketTypeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ label, description, price, totalCapacity, order }),
        }
      );
    } else {
      // Create mode — POST
      if (!id) { showToast("ID (slug) is required", "error"); btn.textContent = "+ Create Ticket Type"; btn.disabled = false; return; }
      res = await fetch(
        `${CONFIG.API_BASE}/api/events/${eventId}/ticket-types`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ id, label, description, price, totalCapacity, order }),
        }
      );
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    showToast(isEdit ? `Ticket type updated!` : `Ticket type "${label}" created!`, "success");
    resetTicketTypeForm();
    loadTicketTypes();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = isEdit ? "Save Changes" : "+ Create Ticket Type";
    btn.disabled = false;
  }
});

function editTicketType(typeId) {
  // Find the row data from the table to pre-fill the form
  // Re-fetch so we have fresh data
  fetch(
    `${CONFIG.API_BASE}/api/events/${eventId}/ticket-types/admin`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  )
    .then((r) => r.json())
    .then((data) => {
      const t = data.ticketTypes.find((x) => x.id === typeId);
      if (!t) { showToast("Ticket type not found", "error"); return; }

      editingTicketTypeId = typeId;
      $("tt-form-title").textContent = `✏️ Editing: ${t.label}`;
      $("tt-id").value = t.id;
      $("tt-id").disabled = true;
      $("tt-label").value = t.label;
      $("tt-price").value = t.price;
      $("tt-capacity").value = t.totalCapacity !== null ? t.totalCapacity : "";
      $("tt-order").value = t.order || 0;
      $("tt-description").value = t.description || "";
      $("create-tt-btn").textContent = "Save Changes";
      $("cancel-tt-edit-btn").style.display = "inline-flex";

      // Scroll to form
      $("ticket-type-form-section").scrollIntoView({ behavior: "smooth", block: "start" });
    })
    .catch(() => showToast("Failed to load ticket type data", "error"));
}

function resetTicketTypeForm() {
  editingTicketTypeId = null;
  $("tt-form-title").textContent = "+ Create Ticket Type";
  $("tt-id").value = "";
  $("tt-id").disabled = false;
  $("tt-label").value = "";
  $("tt-price").value = "";
  $("tt-capacity").value = "";
  $("tt-order").value = "";
  $("tt-description").value = "";
  $("create-tt-btn").textContent = "+ Create Ticket Type";
  $("cancel-tt-edit-btn").style.display = "none";
}

$("cancel-tt-edit-btn").addEventListener("click", resetTicketTypeForm);

async function toggleTicketType(typeId, currentlyActive) {
  try {
    const res = await fetch(
      `${CONFIG.API_BASE}/api/events/${eventId}/ticket-types/${typeId}/toggle`,
      { method: "PATCH", headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (res.ok) {
      showToast(`Ticket type ${currentlyActive ? "disabled" : "enabled"}`, "success");
      loadTicketTypes();
    }
  } catch (_) {
    showToast("Failed to toggle ticket type", "error");
  }
}

async function deleteTicketType(typeId, label) {
  if (!confirm(`Delete ticket type "${label}"? This cannot be undone.\n\nOnly delete types with 0 sold tickets.`)) return;
  try {
    const res = await fetch(
      `${CONFIG.API_BASE}/api/events/${eventId}/ticket-types/${typeId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (res.ok) {
      showToast(`Ticket type "${label}" deleted`, "success");
      loadTicketTypes();
    } else {
      const d = await res.json();
      showToast(d.error || "Failed to delete", "error");
    }
  } catch (_) {
    showToast("Failed to delete ticket type", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════
// COUPON MANAGER
// ═══════════════════════════════════════════════════════════════════

async function loadCoupons() {
  try {
    const res = await fetch(
      `${CONFIG.API_BASE}/api/coupon/admin/list?eventId=${eventId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const data = await res.json();
    if (res.ok) renderCouponTable(data.coupons);
  } catch (err) { console.error("Failed to load coupons", err); }
}

$("refresh-coupons-btn").addEventListener("click", loadCoupons);

function renderCouponTable(coupons) {
  const tbody = $("coupon-tbody");
  if (!coupons || coupons.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">No coupons yet. Create one above.</td></tr>`; return;
  }

  const now = new Date();
  tbody.innerHTML = coupons.map((c) => {
    const expired = c.validUntil && new Date(c.validUntil) < now;
    const valueDisplay = c.type === "percent" ? `${c.value}%`
      : c.type === "flat" ? `₹${c.value}`
      : c.type === "free" ? "100%"
      : "1+1";

    return `<tr>
      <td>${c.code}</td>
      <td><span class="type-pill ${c.type}">${c.type.toUpperCase()}</span></td>
      <td>${valueDisplay}</td>
      <td>${c.usedCount}${c.maxUses !== null ? ` / ${c.maxUses}` : " / ∞"}</td>
      <td>${c.validUntil ? formatDate(c.validUntil) : "No expiry"}</td>
      <td style="color:var(--text-muted);font-size:0.78rem;max-width:160px">${c.description || "—"}</td>
      <td>
        ${expired ? `<span style="color:var(--red);font-size:0.72rem">EXPIRED</span>`
          : c.active
            ? `<span class="active-pill">● Active</span>`
            : `<span class="inactive-pill">○ Inactive</span>`}
      </td>
      <td>
        <button class="coupon-action-btn" onclick="toggleCoupon('${c.code}', ${c.active})">
          ${c.active ? "Disable" : "Enable"}
        </button>
        <button class="coupon-action-btn danger" onclick="deleteCoupon('${c.code}')">Delete</button>
      </td>
    </tr>`;
  }).join("");
}

async function toggleCoupon(code, currentlyActive) {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/coupon/admin/${code}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) { showToast(`Coupon ${code} ${currentlyActive ? "disabled" : "enabled"}`, "success"); loadCoupons(); }
  } catch (err) { showToast("Failed to toggle coupon", "error"); }
}

async function deleteCoupon(code) {
  if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/coupon/admin/${code}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) { showToast(`Coupon ${code} deleted`, "success"); loadCoupons(); }
  } catch (err) { showToast("Failed to delete coupon", "error"); }
}

// ─── Create Coupon Form ───────────────────────────────────────────
$("create-coupon-btn").addEventListener("click", async () => {
  const code = $("cc-code").value.trim().toUpperCase();
  const type = document.querySelector("input[name='cc-type']:checked")?.value;
  const value = parseFloat($("cc-value").value);
  const maxUses = $("cc-max-uses").value ? parseInt($("cc-max-uses").value) : null;
  const validUntil = $("cc-valid-until").value || null;
  const description = $("cc-description").value.trim();
  const minAmount = parseFloat($("cc-min-amount").value) || 0;

  if (!code) { showToast("Coupon code is required", "error"); return; }
  if (!type) { showToast("Select a discount type", "error"); return; }
  if (["percent", "flat"].includes(type) && (!value || value <= 0)) {
    showToast("Enter a valid discount value", "error"); return;
  }

  const btn = $("create-coupon-btn");
  btn.textContent = "Creating..."; btn.disabled = true;

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/coupon/admin/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code, eventId, type,
        value: value || 0,
        maxUses, validUntil, description, minAmount,
        perUserLimit: 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");

    showToast(`Coupon ${code} created! 🎉`, "success");
    // Reset form
    $("cc-code").value = ""; $("cc-value").value = ""; $("cc-max-uses").value = "";
    $("cc-valid-until").value = ""; $("cc-description").value = ""; $("cc-min-amount").value = "";
    loadCoupons();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.textContent = "+ Create Coupon"; btn.disabled = false;
  }
});

// Show/hide value field based on type
document.querySelectorAll("input[name='cc-type']").forEach((radio) => {
  radio.addEventListener("change", () => {
    const type = radio.value;
    const valueGroup = $("cc-value-group");
    valueGroup.style.opacity = ["free", "bogo"].includes(type) ? "0.4" : "1";
    $("cc-value").disabled = ["free", "bogo"].includes(type);
    if (type === "percent") $("cc-value").placeholder = "e.g. 20 (for 20% off)";
    if (type === "flat") $("cc-value").placeholder = "e.g. 100 (₹100 off)";
    if (type === "free") $("cc-value").placeholder = "N/A";
    if (type === "bogo") $("cc-value").placeholder = "N/A";
  });
});
