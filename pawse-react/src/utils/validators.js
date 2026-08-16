export const isValidIndianMobile = (value) => /^[6-9]\d{9}$/.test(value);
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function normalizePhone(value) {
  return (value || "").trim().replace(/\s/g, "");
}
