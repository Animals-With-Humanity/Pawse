import { useState } from "react";
import { createCoupon, toggleCoupon, deleteCoupon } from "../../services/couponService";

const emptyForm = { code: "", type: "percent", value: "", maxUses: "", validUntil: "", description: "", minAmount: "" };

export default function CouponsPanel({ token, eventId, coupons, ticketTypes, loading, onRefresh, showToast }) {
  const [form, setForm] = useState(emptyForm);
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTypeId(id) {
    setSelectedTypeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSubmit() {
    const code = form.code.trim().toUpperCase();
    const value = parseFloat(form.value);
    const maxUses = form.maxUses ? parseInt(form.maxUses) : null;
    const minAmount = parseFloat(form.minAmount) || 0;

    if (!code) return showToast("Coupon code is required", "error");
    if (["percent", "flat"].includes(form.type) && (!value || value <= 0)) {
      return showToast("Enter a valid discount value", "error");
    }

    setSaving(true);
    try {
      await createCoupon(token, {
        code,
        eventId,
        type: form.type,
        value: value || 0,
        maxUses,
        validUntil: form.validUntil || null,
        description: form.description.trim(),
        minAmount,
        perUserLimit: 1,
        ticketTypeIds: selectedTypeIds.length > 0 ? selectedTypeIds : null,
      });
      showToast(`Coupon ${code} created! 🎉`, "success");
      setForm(emptyForm);
      setSelectedTypeIds([]);
      onRefresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(c) {
    try {
      await toggleCoupon(token, c.code);
      showToast(`Coupon ${c.code} ${c.active ? "disabled" : "enabled"}`, "success");
      onRefresh();
    } catch {
      showToast("Failed to toggle coupon", "error");
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    try {
      await deleteCoupon(token, c.code);
      showToast(`Coupon ${c.code} deleted`, "success");
      onRefresh();
    } catch {
      showToast("Failed to delete coupon", "error");
    }
  }

  const now = new Date();
  const valueDisabled = ["free", "bogo"].includes(form.type);

  return (
    <div>
      <div className="create-coupon-form">
        <h3>+ Create New Coupon</h3>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">Coupon Code *</label>
            <div className="field-wrap">
              <input type="text" className="field-input coupon-field" placeholder="e.g. NEXUS50" value={form.code} onChange={(e) => set("code", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group" style={{ opacity: valueDisabled ? 0.4 : 1 }}>
            <label className="field-label">Discount Value</label>
            <div className="field-wrap">
              <input
                type="number"
                min="0"
                className="field-input"
                placeholder={form.type === "percent" ? "e.g. 20" : form.type === "flat" ? "e.g. 100" : "N/A"}
                disabled={valueDisabled}
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
              />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Discount Type *</label>
            <div className="type-selector">
              {[
                { value: "percent", label: "% Percent Off" },
                { value: "flat", label: "₹ Flat Discount" },
                { value: "free", label: "🆓 100% Free" },
                { value: "bogo", label: "🎉 Buy 1 Get 1" },
              ].map((opt) => (
                <label key={opt.value} className="type-label-wrap">
                  <input type="radio" name="cc-type" className="type-radio" checked={form.type === opt.value} onChange={() => set("type", opt.value)} />
                  <span className="type-label">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Max Total Uses</label>
            <div className="field-wrap">
              <input type="number" min="1" className="field-input" placeholder="Leave blank for unlimited" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Minimum Order Amount (₹)</label>
            <div className="field-wrap">
              <input type="number" min="0" className="field-input" placeholder="0 = no minimum" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Valid Until</label>
            <div className="field-wrap">
              <input type="datetime-local" className="field-input" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Description (shown to user)</label>
            <div className="field-wrap">
              <input type="text" className="field-input" placeholder="e.g. Early bird discount" value={form.description} onChange={(e) => set("description", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group" style={{ gridColumn: "1/-1" }}>
            <label className="field-label">Restrict to Ticket Types</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem", minHeight: "2rem" }}>
              {ticketTypes.length === 0 && <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>No ticket types found for this event.</span>}
              {ticketTypes.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "0.35rem 0.7rem",
                  }}
                >
                  <input type="checkbox" checked={selectedTypeIds.includes(t.id)} onChange={() => toggleTypeId(t.id)} />
                  {t.label}
                  <span style={{ color: "var(--text-muted)", marginLeft: 4, fontSize: "0.75rem" }}>₹{t.price}</span>
                </label>
              ))}
            </div>
            <span style={{ fontSize: "0.7rem", color: "#9CA3AF", marginTop: "0.25rem", display: "block" }}>
              Leave all unchecked to allow for <strong>all ticket types</strong>.
            </span>
          </div>
        </div>
        <div className="create-form-actions">
          <button className="create-submit-btn" disabled={saving} onClick={handleSubmit}>
            {saving ? "Creating..." : "+ Create Coupon"}
          </button>
        </div>
      </div>

      <div className="attendee-list-section">
        <div className="attendee-list-header">
          <div className="section-label">// ACTIVE COUPONS</div>
          <button className="refresh-btn" onClick={onRefresh}>
            ↻ Refresh
          </button>
        </div>
        <div className="coupon-table-wrap">
          <table className="coupon-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Used / Max</th>
                <th>Expires</th>
                <th>Description</th>
                <th>Ticket Types</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="table-loading">
                    Loading coupons...
                  </td>
                </tr>
              )}
              {!loading && coupons.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-loading">
                    No coupons yet. Create one above.
                  </td>
                </tr>
              )}
              {!loading &&
                coupons.map((c) => {
                  const expired = c.validUntil && new Date(c.validUntil) < now;
                  const valueDisplay = c.type === "percent" ? `${c.value}%` : c.type === "flat" ? `₹${c.value}` : c.type === "free" ? "100%" : "1+1";
                  let ticketTypeDisplay = <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>All types</span>;
                  if (Array.isArray(c.ticketTypeIds) && c.ticketTypeIds.length > 0) {
                    ticketTypeDisplay = c.ticketTypeIds.map((id) => {
                      const match = ticketTypes.find((t) => t.id === id);
                      return (
                        <span key={id} className="type-pill" style={{ fontSize: "0.7rem", marginRight: 4 }}>
                          {match ? match.label : id}
                        </span>
                      );
                    });
                  }
                  return (
                    <tr key={c.code}>
                      <td>{c.code}</td>
                      <td>
                        <span className={`type-pill ${c.type}`}>{c.type.toUpperCase()}</span>
                      </td>
                      <td>{valueDisplay}</td>
                      <td>
                        {c.usedCount}
                        {c.maxUses !== null ? ` / ${c.maxUses}` : " / ∞"}
                      </td>
                      <td>{c.validUntil ? new Date(c.validUntil).toLocaleString("en-IN") : "No expiry"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem", maxWidth: 160 }}>{c.description || "—"}</td>
                      <td style={{ maxWidth: 140 }}>{ticketTypeDisplay}</td>
                      <td>
                        {expired ? (
                          <span style={{ color: "var(--red)", fontSize: "0.72rem" }}>EXPIRED</span>
                        ) : c.active ? (
                          <span className="active-pill">● Active</span>
                        ) : (
                          <span className="inactive-pill">○ Inactive</span>
                        )}
                      </td>
                      <td>
                        <button className="coupon-action-btn" onClick={() => handleToggle(c)}>
                          {c.active ? "Disable" : "Enable"}
                        </button>
                        <button className="coupon-action-btn danger" onClick={() => handleDelete(c)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
