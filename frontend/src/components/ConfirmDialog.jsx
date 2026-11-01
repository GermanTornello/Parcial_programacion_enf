import Modal from "./Modal.jsx";

export function ConfirmDialog({
  open,
  title = "¿Confirmás esta acción?",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  isLoading = false,
  isDanger = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      className="ui-confirm-dialog"
    >
      {message ? <div className="ui-confirm-message">{message}</div> : null}
      <div className="ui-dialog-actions">
        <button
          className="ui-button ui-button-secondary"
          type="button"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
        <button
          className={"ui-button " + (isDanger ? "ui-button-danger" : "ui-button-primary")}
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? "Procesando…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
