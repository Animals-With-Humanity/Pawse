import { useState } from "react";
import {
  createTicketType,
  updateTicketType,
  toggleTicketType,
  deleteTicketType,
} from "../../services/eventService";

const emptyForm = { id: "", label: "", price: "", capacity: "", order: "", description: "" };

export default function TicketTypesPanel({ token, eventId, ticketTypes, loading, onRefresh, showToast }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(t) {
    setEditingId(t.id);
    setForm({
      id: t.id,
      label: t.label,
      price: t.price,
      capacity: t.totalCapacity !== null ? t.totalCapacity : "",
      order: t.order || 0,
      description: t.description || "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit() {
    const label = form.label.trim();
    const price = parseFloat(form.price);
    const totalCapacity = form.capacity ? parseInt(form.capacity) : null;
    const order = parseInt(form.order) || 0;
    const description = form.description.trim();

    if (!label) return showToast("Label is required", "error");
    if (isNaN(price) || price < 0) return showToast("Enter a valid price", "error");

    setSaving(true);
    try {
      if (editingId) {
        await updateTicketType(eventId, token, editingId, { label, description, price, totalCapacity, order });
        showToast("Ticket type updated!", "success");
      } else {
        if (!form.id.trim()) {
          showToast("ID (slug) is required", "error");
          setSaving(false);
          return;
        }
        await createTicketType(eventId, token, { id: form.id.trim(), label, description, price, totalCapacity, order });
        showToast(`Ticket type "${label}" created!`, "success");
      }
      resetForm();
      onRefresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(t) {
    try {
      await toggleTicketType(eventId, token, t.id);
      showToast(`Ticket type ${t.active ? "disabled" : "enabled"}`, "success");
      onRefresh();
    } catch {
      showToast("Failed to toggle ticket type", "error");
    }
  }

  async function handleDelete(t) {
    if (!confirm(`Delete ticket type "${t.label}"? This cannot be undone.\n\nOnly delete types with 0 sold tickets.`)) return;
    try {
      await deleteTicketType(eventId, token, t.id);
      showToast(`Ticket type "${t.label}" deleted`, "success");
      onRefresh();
    } catch (err) {
      showToast(err.message || "Failed to delete", "error");
    }
  }

  return (
    <div>
      <div className="create-coupon-form">
        <h3>{editingId ? `✏️ Editing: ${form.label}` : "+ Create Ticket Type"}</h3>
        <div className="form-grid">
          <div className="field-group">
            <label className="field-label">ID (slug) *</label>
            <div className="field-wrap">
              <input
                type="text"
                className="field-input coupon-field"
                placeholder="e.g. early_bird"
                value={form.id}
                disabled={!!editingId}
                onChange={(e) => set("id", e.target.value)}
              />
              <div className="field-border" />
            </div>
            <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>Used internally. Cannot be changed after creation.</span>
          </div>

          <div className="field-group">
            <label className="field-label">Label (shown to user) *</label>
            <div className="field-wrap">
              <input type="text" className="field-input" placeholder="e.g. Early Bird" value={form.label} onChange={(e) => set("label", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Price (₹) *</label>
            <div className="field-wrap">
              <input type="number" min="0" className="field-input" placeholder="e.g. 199" value={form.price} onChange={(e) => set("price", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Total Capacity</label>
            <div className="field-wrap">
              <input type="number" min="1" className="field-input" placeholder="Leave blank for unlimited" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Sort Order</label>
            <div className="field-wrap">
              <input type="number" min="0" className="field-input" placeholder="0 = first (default)" value={form.order} onChange={(e) => set("order", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Description (optional)</label>
            <div className="field-wrap">
              <input type="text" className="field-input" placeholder="e.g. Limited early access" value={form.description} onChange={(e) => set("description", e.target.value)} />
              <div className="field-border" />
            </div>
          </div>
        </div>
        <div className="create-form-actions" style={{ gap: "0.75rem" }}>
          <button className="create-submit-btn" disabled={saving} onClick={handleSubmit}>
            {saving ? "Saving..." : editingId ? "Save Changes" : "+ Create Ticket Type"}
          </button>
          {editingId && (
            <button className="coupon-action-btn" onClick={resetForm}>
              ✕ Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="attendee-list-section">
        <div className="attendee-list-header">
          <div className="section-label">// TICKET TYPES</div>
          <button className="refresh-btn" onClick={onRefresh}>
            ↻ Refresh
          </button>
        </div>
        <div className="coupon-table-wrap">
          <table className="coupon-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Label</th>
                <th>Price</th>
                <th>Sold / Capacity</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="table-loading">
                    Loading ticket types...
                  </td>
                </tr>
              )}
              {!loading && ticketTypes.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-loading">
                    No ticket types yet. Create one above.
                  </td>
                </tr>
              )}
              {!loading &&
                ticketTypes.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem" }}>{t.id}</td>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{t.label}</td>
                    <td>₹{t.price}</td>
                    <td>
                      {t.totalCapacity !== null ? `${t.soldCount} / ${t.totalCapacity}` : `${t.soldCount} / ∞`}
                      {t.soldOut && <span style={{ color: "var(--red)", fontSize: "0.72rem", fontWeight: 700, marginLeft: 4 }}>SOLD OUT</span>}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.78rem", maxWidth: 180 }}>{t.description || "—"}</td>
                    <td>{t.active ? <span className="active-pill">● Active</span> : <span className="inactive-pill">○ Inactive</span>}</td>
                    <td>
                      <button className="coupon-action-btn" onClick={() => startEdit(t)}>
                        Edit
                      </button>
                      <button className="coupon-action-btn" onClick={() => handleToggle(t)}>
                        {t.active ? "Disable" : "Enable"}
                      </button>
                      <button className="coupon-action-btn danger" onClick={() => handleDelete(t)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
