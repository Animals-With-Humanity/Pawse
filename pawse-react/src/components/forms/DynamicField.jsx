/**
 * Renders one field from an event's registrationFields config.
 * Supported types mirror what the legacy backend can actually accept
 * today (text/email/tel) plus the types called out in the migration
 * brief as likely needed by future events. Unsupported types are not
 * silently dropped — they render nothing and log a warning so a
 * misconfigured event is obvious in dev, not silently broken in prod.
 */
export default function DynamicField({ field, value, error, onChange }) {
  const { name, label, type, required, placeholder, autoComplete, options } = field;

  const commonProps = {
    id: name,
    name,
    className: "field-input" + (error ? " error" : ""),
    placeholder,
    autoComplete,
    value: value ?? "",
    onChange: (e) => onChange(name, e.target.value),
  };

  let control;
  switch (type) {
    case "text":
    case "email":
    case "number":
      control = <input type={type} {...commonProps} />;
      break;
    case "tel":
      control = (
        <div className="field-wrap phone-wrap">
          <span className="phone-prefix">+91</span>
          <input type="tel" maxLength={10} className={"field-input phone-input" + (error ? " error" : "")} {...{
            ...commonProps,
            className: undefined,
          }} />
        </div>
      );
      break;
    case "textarea":
      control = <textarea rows={4} {...commonProps} />;
      break;
    case "select":
      control = (
        <select {...commonProps}>
          <option value="" disabled>
            {placeholder || "Select..."}
          </option>
          {(options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
      break;
    case "checkbox":
      control = (
        <input
          type="checkbox"
          id={name}
          checked={!!value}
          onChange={(e) => onChange(name, e.target.checked)}
          style={{ width: "1.2rem", height: "1.2rem", accentColor: "var(--primary)", cursor: "pointer" }}
        />
      );
      break;
    case "radio":
      control = (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {(options || []).map((opt) => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", color: "var(--text)" }}>
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={(e) => onChange(name, e.target.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
      break;
    case "file":
      control = (
        <input
          type="file"
          id={name}
          accept={field.accept}
          onChange={(e) => onChange(name, e.target.files?.[0] || null)}
        />
      );
      break;
    default:
      console.warn(`DynamicField: unsupported field type "${type}" for field "${name}"`);
      return null;
  }

  if (type === "checkbox") {
    return (
      <div className="field-group alternate" style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {control}
        <label htmlFor={name} style={{ cursor: "pointer", color: "var(--text)" }}>
          {label}
          {required ? " *" : ""}
        </label>
      </div>
    );
  }

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      <div className="field-wrap">
        {control}
        <div className="field-border" />
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
