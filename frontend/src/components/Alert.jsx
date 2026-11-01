export function Alert({
  variant = "info",
  title,
  children,
  message,
  onRetry,
  retryLabel = "Reintentar",
  onClose,
  className = "",
}) {
  const isError = variant === "error";

  return (
    <div
      className={"ui-alert ui-alert-" + variant + " " + className}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <div className="ui-alert-content">
        {title ? <strong className="ui-alert-title">{title}</strong> : null}
        <div>{children ?? message}</div>
        {onRetry ? (
          <button className="ui-alert-retry" type="button" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
      </div>
      {onClose ? (
        <button
          className="ui-icon-button"
          type="button"
          aria-label="Cerrar aviso"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}

export default Alert;
