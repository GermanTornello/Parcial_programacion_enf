import { useId } from "react";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  ariaLabel,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = "",
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const focusable = dialog.querySelector(FOCUSABLE_SELECTOR);
    (focusable || dialog).focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      const items = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open, onClose, closeOnEscape]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ui-modal-backdrop"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        ref={dialogRef}
        className={"ui-modal " + className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={!title ? ariaLabel || "Diálogo" : undefined}
        tabIndex={-1}
      >
        <header className="ui-modal-header">
          {title ? <h2 id={titleId}>{title}</h2> : null}
          <button
            className="ui-icon-button"
            type="button"
            aria-label="Cerrar diálogo"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {description ? (
          <p className="ui-modal-description" id={descriptionId}>
            {description}
          </p>
        ) : null}
        <div className="ui-modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

export default Modal;
