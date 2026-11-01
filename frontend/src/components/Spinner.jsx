import { useId } from "react";

export function Spinner({ label = "Cargando", size = "medium", className = "" }) {
  const id = useId();

  return (
    <span
      className={"ui-spinner-wrap " + className}
      role="status"
      aria-live="polite"
      aria-labelledby={id}
    >
      <svg
        className={"ui-spinner ui-spinner-" + size}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="ui-spinner-track" cx="12" cy="12" r="9" />
        <circle className="ui-spinner-indicator" cx="12" cy="12" r="9" />
      </svg>
      <span id={id}>{label}</span>
    </span>
  );
}

export default Spinner;
