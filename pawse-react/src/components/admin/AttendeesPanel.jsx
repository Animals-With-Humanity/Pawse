function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AttendeesPanel({ tickets, loading, onRefresh }) {
  return (
    <div className="attendee-list-section">
      <div className="attendee-list-header">
        <div className="section-label">// ATTENDEE LIST</div>
        <button className="refresh-btn" onClick={onRefresh}>
          ↻ Refresh
        </button>
      </div>
      <div className="attendee-table-wrap">
        <table className="attendee-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Amount Paid</th>
              <th>Coupon</th>
              <th>Registered</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="table-loading">
                  Loading attendees...
                </td>
              </tr>
            )}
            {!loading && (!tickets || tickets.length === 0) && (
              <tr>
                <td colSpan={8} className="table-loading">
                  No tickets found.
                </td>
              </tr>
            )}
            {!loading &&
              tickets?.map((t) => (
                <tr key={t.ticketId}>
                  <td>{t.ticketId}</td>
                  <td style={{ color: "var(--text)" }}>{t.name}</td>
                  <td>{t.phone}</td>
                  <td>{t.ticketTypeLabel ? <span className="type-pill">{t.ticketTypeLabel}</span> : "—"}</td>
                  <td>
                    ₹{t.amount}
                    {t.discountAmount > 0 && (
                      <>
                        <br />
                        <small style={{ color: "var(--green)" }}>−₹{t.discountAmount}</small>
                      </>
                    )}
                  </td>
                  <td>{t.coupon ? <span className={`type-pill ${t.coupon.type}`}>{t.coupon.code}</span> : "—"}</td>
                  <td>{formatDate(t.createdAt)}</td>
                  <td>
                    <span className={`status-pill ${t.isUsed ? "used" : "unused"}`}>{t.isUsed ? "CHECKED IN" : "PENDING"}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
