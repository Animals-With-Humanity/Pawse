import { useEffect, useState } from "react";
import { updateEventConfig, toggleEventActive } from "../../services/eventService";

export default function EventSettingsPanel({ token, eventId, config, onRefresh, showToast }) {
  const [feeType, setFeeType] = useState("flat");
  const [fee, setFee] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  useEffect(() => {
    if (!config) return;
    setFeeType(config.platformFeeType === "percent" ? "percent" : "flat");
    setFee(config.platformFee ?? "");
    setGstPercent(config.platformFeeGstPercent ?? "");
  }, [config]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateEventConfig(eventId, token, {
        platformFeeType: feeType,
        platformFee: parseFloat(fee) || 0,
        platformFeeGstPercent: parseFloat(gstPercent) || 0,
      });
      showToast("Event settings saved!", "success");
      onRefresh();
    } catch (err) {
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setTogglingActive(true);
    try {
      await toggleEventActive(eventId, token);
      showToast(config.isActive ? "Booking paused" : "Booking resumed", "success");
      onRefresh();
    } catch {
      showToast("Failed to toggle event status", "error");
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <div>
      <div className="create-coupon-form" id="event-active-section">
        <h3>🔒 Event Booking Status</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          When set to <strong>Inactive</strong>, all new ticket purchases for this event will be blocked immediately. Existing tickets are
          not affected.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: config?.isActive ? "var(--green)" : "var(--red)" }}>
            {config ? (config.isActive ? "● Active — booking open" : "○ Inactive — booking closed") : "Loading..."}
          </div>
          <button className="create-submit-btn" style={{ minWidth: 160 }} disabled={togglingActive || !config} onClick={handleToggleActive}>
            {togglingActive ? "..." : config?.isActive ? "Set Inactive" : "Set Active"}
          </button>
        </div>
      </div>

      <div className="create-coupon-form" style={{ marginTop: "1.5rem" }}>
        <h3>💳 Platform Fee Configuration</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          Set the flat platform fee (in ₹) charged per booking and the GST percentage applied on that fee. Set both to <strong>0</strong> to
          charge no platform fee.
        </p>
        <div className="form-grid">
        <div className="field-group" style={{ gridColumn: "1/-1" }}>
          <label className="field-label">Platform Fee Type</label>
          <div className="type-selector">
            <label className="type-label-wrap">
              <input type="radio" className="type-radio" checked={feeType === "flat"} onChange={() => setFeeType("flat")} />
              <span className="type-label">₹ Flat Fee</span>
            </label>
            <label className="type-label-wrap">
              <input type="radio" className="type-radio" checked={feeType === "percent"} onChange={() => setFeeType("percent")} />
              <span className="type-label">% Percent Fee</span>
            </label>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Platform Fee {feeType === "percent" ? "(%)" : "(₹)"}</label>
          <div className="field-wrap">
            <input type="number" min="0" className="field-input" value={fee} onChange={(e) => setFee(e.target.value)} />
            <div className="field-border" />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">GST on Platform Fee (%)</label>
          <div className="field-wrap">
            <input type="number" min="0" className="field-input" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
            <div className="field-border" />
          </div>
        </div>
        </div>

        <div className="create-form-actions">
          <button className="create-submit-btn" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
