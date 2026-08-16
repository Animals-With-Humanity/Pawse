import DynamicField from "./DynamicField";

/**
 * Renders every field from event.registrationFields in order. Fully
 * controlled by the parent (BookingPage) — this component owns no
 * state of its own, so it stays a pure "config in, inputs out" renderer
 * that any event's field list can drive.
 */
export default function DynamicRegistrationForm({ fields, values, errors, onFieldChange }) {
  return (
    <div className="form-section">
      <div className="form-section-title">Your Details</div>
      {fields.map((field) => {
        const hidden = field.hideWhenToggleChecked && values[field.hideWhenToggleChecked];
        if (hidden) return null;
        return (
          <DynamicField
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            onChange={onFieldChange}
          />
        );
      })}
    </div>
  );
}
