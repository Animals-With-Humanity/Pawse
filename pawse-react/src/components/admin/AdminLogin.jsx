import { useState } from "react";

export default function AdminLogin({ onLogin, loading, error }) {
  const [token, setToken] = useState("");
  const [eventId, setEventId] = useState("");

  return (
    <div className="admin-page">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-1" style={{ "--glow-color": "rgba(255,80,50,0.06)" }} />
      <div className="admin-login-overlay">
      <div className="admin-login-card">
        <div className="logo" style={{ justifyContent: "center", marginBottom: "2rem" }}>
          <span className="logo-mark">
            <img className="logo-mark" src="/logo.png" alt="" />
          </span>
        </div>
        <h2 className="admin-login-title">Admin Dashboard</h2>
        <p className="admin-login-sub">Gate verification + coupon management. Staff access only.</p>

        <div className="field-group" style={{ marginTop: "2rem" }}>
          <label className="field-label">Admin Token</label>
          <div className="field-wrap">
            <input
              type="password"
              className="field-input"
              placeholder="Enter admin token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <div className="field-border" />
          </div>
          <span className="field-error">{error}</span>
        </div>

        <div className="field-group">
          <label className="field-label">Event ID</label>
          <div className="field-wrap">
            <input
              type="text"
              className="field-input"
              placeholder="e.g. KTP"
              value={eventId}
              onChange={(e) => setEventId(e.target.value.toUpperCase())}
            />
            <div className="field-border" />
          </div>
        </div>

        <button
          className="pay-btn"
          style={{ width: "100%", marginTop: "1rem" }}
          disabled={loading}
          onClick={() => onLogin(token.trim(), eventId.trim().toUpperCase())}
        >
          <span>{loading ? "Verifying..." : "Access Dashboard"}</span>
        </button>
      </div>
      </div>
    </div>
  );
}
