export default function PriceSummary({ lineLabel, pricing, coupon }) {
  const { original, discount, bogo, platformFee, gst, roundOff, grandTotal, final } = pricing;

  return (
    <div className="price-block">
      <div className="price-row">
        <span>{lineLabel}</span>
        <span>₹{original}</span>
      </div>

      {discount > 0 && (
        <div className="price-row discount-row">
          <span>{coupon ? `Coupon (${coupon.code})` : "Discount"}</span>
          <span className="discount-val">−₹{discount}</span>
        </div>
      )}

      {bogo && (
        <div className="bogo-row">
          <span className="bogo-badge">🎉 BOGO — 2 tickets for the price of 1!</span>
        </div>
      )}

      <div className="price-row muted">
        <span>Platform fee</span>
        <span>₹{platformFee.toFixed(2)}</span>
      </div>
      <div className="price-row muted">
        <span>GST</span>
        <span>₹{gst.toFixed(2)}</span>
      </div>
      {roundOff !== 0 && (
        <div className="price-row muted">
          <span>Round Off</span>
          <span>
            {roundOff > 0 ? "+" : "−"}₹{Math.abs(roundOff).toFixed(2)}
          </span>
        </div>
      )}

      <div className="price-divider" />
      <div className="price-row total">
        <span>Total</span>
        <span>{final === 0 ? "FREE" : `₹${grandTotal}`}</span>
      </div>
    </div>
  );
}
