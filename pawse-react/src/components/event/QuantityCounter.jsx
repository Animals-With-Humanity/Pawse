export default function QuantityCounter({ quantity, onChange, typeLabel, typePrice }) {
  return (
    <div className="form-section">
      <div className="form-section-title">Number of Tickets</div>
      <div className="qty-row">
        <div className="qty-label-block">
          <span className="qty-main-label">
            {typeLabel} · ₹{typePrice} each
          </span>
          <span className="qty-sub-label">Max 10 per booking</span>
        </div>
        <div className="qty-counter-wrap">
          <button type="button" className="qty-btn" aria-label="Decrease" disabled={quantity <= 1} onClick={() => onChange(quantity - 1)}>
            −
          </button>
          <span className="qty-num">{quantity}</span>
          <button type="button" className="qty-btn" aria-label="Increase" disabled={quantity >= 10} onClick={() => onChange(quantity + 1)}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
