import { isValidEmail, isValidIndianMobile, normalizePhone } from "./validators";

/**
 * Validates a values map against a registrationFields config array.
 * Ported rules (name length, email regex, Indian mobile regex) match
 * the legacy app.js validateForm() exactly, but any field without a
 * recognized `validate` type falls back to a plain required-only check
 * so new event-specific fields (college, resume upload, ...) work
 * without code changes.
 */
export function validateFields(fields, values) {
  const errors = {};
  let valid = true;

  const fail = (name, message) => {
    errors[name] = message;
    valid = false;
  };

  for (const field of fields) {
    // Fields hidden by a toggle aren't required, whatever their static config says
    const hiddenByToggle = field.hideWhenToggleChecked && values[field.hideWhenToggleChecked];
    if (hiddenByToggle) continue;

    const raw = values[field.name];
    const value = typeof raw === "string" ? raw.trim() : raw;
    const isEmpty = value === undefined || value === null || value === "";

    switch (field.validate) {
      case "name":
        if (isEmpty || value.length < 2) fail(field.name, "Please enter your full name");
        break;
      case "email":
        if (isEmpty || !isValidEmail(value)) fail(field.name, "Please enter a valid email address");
        break;
      case "indianMobile":
        if (isEmpty || !isValidIndianMobile(normalizePhone(value))) {
          fail(field.name, "Enter a valid 10-digit Indian mobile number");
        }
        break;
      case "indianMobileOptional":
        if (!isEmpty && !isValidIndianMobile(normalizePhone(value))) {
          fail(field.name, "Enter a valid 10-digit WhatsApp number");
        }
        break;
      default:
        if (field.required && isEmpty) fail(field.name, `${field.label} is required`);
    }
  }

  return { valid, errors };
}

/**
 * Resolves the final submittable values, applying toggle-driven
 * mirroring (e.g. whatsapp = phone when "on WhatsApp" is checked) —
 * same behavior as the legacy app.js isWhatsapp handling.
 */
export function resolveSubmitValues(fields, values) {
  const resolved = { ...values };
  for (const field of fields) {
    if (field.hideWhenToggleChecked && values[field.hideWhenToggleChecked]) {
      const mirrorSource = fields.find((f) => f.name === "phone");
      if (mirrorSource) resolved[field.name] = normalizePhone(values.phone || "");
    } else if (typeof resolved[field.name] === "string") {
      resolved[field.name] = field.type === "tel" ? normalizePhone(resolved[field.name]) : resolved[field.name].trim();
    }
  }
  return resolved;
}

export function defaultValuesFor(fields) {
  const values = {};
  for (const field of fields) {
    if (field.default !== undefined) values[field.name] = field.default;
    else if (field.type === "checkbox") values[field.name] = false;
    else values[field.name] = "";
  }
  return values;
}
