import { useId } from "react";

export function StarRating({
  value = 0,
  onChange,
  max = 5,
  label = "Calificación",
  readOnly = false,
  disabled = false,
  className = "",
}) {
  const id = useId();
  const interactive = !readOnly && typeof onChange === "function";
  const safeMax = Math.max(1, Math.floor(max));
  const safeValue = Math.min(safeMax, Math.max(0, Number(value) || 0));
  const accessibleValue = safeValue + " de " + safeMax + " estrellas";

  function handleKeyDown(event, index) {
    let nextValue;

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextValue = Math.min(safeMax, index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextValue = Math.max(1, index - 1);
    } else if (event.key === "Home") {
      nextValue = 1;
    } else if (event.key === "End") {
      nextValue = safeMax;
    } else {
      return;
    }

    event.preventDefault();
    onChange(nextValue);
    document.getElementById(id + "-star-" + nextValue)?.focus();
  }

  if (!interactive) {
    return (
      <span
        className={"ui-stars ui-stars-readonly " + className}
        role="img"
        aria-label={label + ": " + accessibleValue}
      >
        {Array.from({ length: safeMax }, (_, index) => (
          <span key={index} aria-hidden="true" className={index < safeValue ? "is-filled" : ""}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className={"ui-stars " + className} role="radiogroup" aria-label={label}>
      {Array.from({ length: safeMax }, (_, index) => {
        const rating = index + 1;
        const checked = safeValue === rating;

        return (
          <button
            key={rating}
            id={id + "-star-" + rating}
            className={"ui-star-button " + (rating <= safeValue ? "is-filled" : "")}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={rating + (rating === 1 ? " estrella" : " estrellas")}
            tabIndex={checked || (!safeValue && rating === 1) ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(rating)}
            onKeyDown={(event) => handleKeyDown(event, rating)}
          >
            <span aria-hidden="true">★</span>
          </button>
        );
      })}
      <span className="ui-sr-only" aria-live="polite">
        {accessibleValue}
      </span>
    </div>
  );
}

export default StarRating;
