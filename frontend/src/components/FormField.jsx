import { useId } from "react";

export function FormField({
  id,
  label,
  as = "input",
  hint,
  error,
  required = false,
  className = "",
  children,
  ...controlProps
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = fieldId + "-hint";
  const errorId = fieldId + "-error";
  const describedBy = [
    controlProps["aria-describedby"],
    hint ? hintId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;
  const Control = as;

  return (
    <div className={"ui-field " + className}>
      <label className="ui-field-label" htmlFor={fieldId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <Control
        {...controlProps}
        id={fieldId}
        className={"ui-control " + (controlProps.className || "")}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
      >
        {as === "select" || as === "textarea" ? children : undefined}
      </Control>
      {hint ? (
        <span className="ui-field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="ui-field-error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default FormField;
