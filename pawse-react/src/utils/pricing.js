/**
 * Platform fee / GST / round-off calculation.
 * Ported 1:1 from the legacy app.js `calculatePlatformFee` so booking
 * totals stay identical after the migration.
 */
export function calculatePlatformFee(amountAfterCoupon, eventConfig) {
  if (amountAfterCoupon <= 0) return { platformFee: 0, gst: 0, roundOff: 0, totalWithFee: 0 };

  const feeType = eventConfig?.platformFeeType === "percent" ? "percent" : "flat";
  const feeValue = eventConfig?.platformFee || 0;

  const fee =
    feeType === "percent" ? Number(((amountAfterCoupon * feeValue) / 100).toFixed(2)) : feeValue;

  const gstPercent = eventConfig?.platformFeeGstPercent || 0;
  const gst = Number(((fee * gstPercent) / 100).toFixed(2));

  const exactTotal = amountAfterCoupon + fee + gst;
  const roundedTotal = Math.round(exactTotal);
  const roundOff = Number((roundedTotal - exactTotal).toFixed(2));

  return {
    platformFee: Number(fee.toFixed(2)),
    gst,
    roundOff,
    totalWithFee: roundedTotal,
  };
}

export function formatINR(amount) {
  return `₹${amount}`;
}
