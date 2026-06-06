const $ = (id) => document.getElementById(id);

$("search-btn").addEventListener("click", async () => {
  const phone = $("phone-search").value.trim().replace(/\s/g, "");
  const errEl = $("search-err");
  const resultsEl = $("results");
  const btn = $("search-btn");

  if (!/^[6-9]\d{9}$/.test(phone)) {
    errEl.textContent = "Enter a valid 10-digit Indian mobile number";
    $("phone-search").classList.add("error");
    return;
  }
  $("phone-search").classList.remove("error");
  errEl.textContent = "";

  btn.textContent = "Searching...";
  btn.disabled = true;
  resultsEl.innerHTML = "";

  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/ticket/phone/${phone}?eventId=${CONFIG.EVENT_ID}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to fetch tickets");

    if (data.tickets && data.tickets.length > 0) {
      // Summary banner
      const summary = document.createElement("div");
      summary.className = "ticket-summary-banner";
      summary.innerHTML = `
        <span class="tsb-icon">🎟️</span>
        <span class="tsb-text">${data.tickets.length} ticket${data.tickets.length > 1 ? "s" : ""} found</span>
      `;
      resultsEl.appendChild(summary);

      data.tickets.forEach(ticket => {
        const item = document.createElement("div");
        item.className = "ticket-item";
        
        const date = new Date(ticket.createdAt).toLocaleDateString("en-IN", {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute:'2-digit'
        });

        item.innerHTML = `
          <div class="ticket-info">
            <h4>${ticket.name}</h4>
            <p>ID: ${ticket.ticketId}</p>
            <p>Booked on: ${date} ${ticket.isUsed ? '<span style="color:var(--red)">(Used)</span>' : '<span style="color:var(--green)">(Active)</span>'}</p>
          </div>
          <a href="ticket.html?id=${ticket.ticketId}" class="view-btn">View Ticket</a>
        `;
        resultsEl.appendChild(item);
      });

      // View All Tickets link
      if (data.tickets.length > 1) {
        const allIds = data.tickets.map(t => t.ticketId).join(",");
        const viewAll = document.createElement("div");
        viewAll.style.cssText = "text-align: center; margin-top: 1rem;";
        viewAll.innerHTML = `<a href="ticket.html?ids=${allIds}" class="view-btn" style="display: inline-flex; gap: 0.5rem; padding: 0.75rem 1.5rem;">🎟️ View All ${data.tickets.length} Tickets Together</a>`;
        resultsEl.appendChild(viewAll);
      }
    } else {
      resultsEl.innerHTML = `<p style="text-align:center; color:var(--text-dim);">No tickets found for this number.</p>`;
    }
  } catch (err) {
    resultsEl.innerHTML = `<p style="text-align:center; color:var(--red);">${err.message}</p>`;
  } finally {
    btn.textContent = "Search Tickets";
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
