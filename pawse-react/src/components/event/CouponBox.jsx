import { useState } from "react";

const TYPE_LABELS = {
  percent: (c) => `${c.value}% OFF`,
  flat: (c) => `₹${c.value} OFF`,
  free: () => "100% FREE",
  bogo: () => "BUY 1 GET 1 FREE",
};

export default function CouponBox({ applied, pricing, loading, feedback, onApply, onRemove }) {
  const [code, setCode] = useState("");

  const handleApply = () => {
    if (!code.trim()) return;
    onApply(code.trim().toUpperCase());
  };

  return (
    <div className="form-section">
      <div className="form-section-title">
        Coupon Code <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
      </div>

      <div className="coupon-input-row">
        <div className="field-wrap" style={{ flex: 1 }}>
          <input
            type="text"
            className="field-input coupon-field"
            placeholder="Enter code e.g. NEXUS50"
            autoComplete="off"
            spellCheck={false}
            value={code}
            disabled={!!applied}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
          <div className="field-border" />
        </div>
        {!applied ? (
          <button className="coupon-apply-btn" disabled={loading} onClick={handleApply}>
            {loading ? "Checking..." : "Apply"}
          </button>
        ) : (
          <button
            className="coupon-remove-btn"
            onClick={() => {
              setCode("");
              onRemove();
            }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {feedback && <div className={`coupon-feedback ${feedback.type}`}>{feedback.message}</div>}

      {applied && (
        <div className="coupon-applied">
          <div className="coupon-applied-inner">
            <span className="coupon-applied-icon">🎟️</span>
            <div className="coupon-applied-text">
              <strong>
                {applied.code} — {(TYPE_LABELS[applied.type] || (() => "DISCOUNT"))(applied)}
              </strong>
              <span>{applied.description || ""}</span>
            </div>
            <span className="coupon-applied-savings">
              {pricing?.bogo ? "+1 Free Ticket" : `−₹${pricing?.discount ?? 0}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
