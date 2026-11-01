const STATUS_LABELS = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  REALIZADA: "Realizada",
  PENDIENTE_VALIDACION: "Pendiente de validación",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};

export function Badge({ status, label, variant, className = "" }) {
  const rawStatus = String(status || "").toUpperCase();
  const normalizedStatus = rawStatus === "PENDIENTE DE VALIDACIÓN" ? "PENDIENTE_VALIDACION" : rawStatus;
  const tone = variant || normalizedStatus.toLowerCase() || "neutral";
  const visibleLabel = label || STATUS_LABELS[normalizedStatus] || status || "Estado";

  return (
    <span className={"ui-badge ui-badge-" + tone + " " + className}>
      {visibleLabel}
    </span>
  );
}

export default Badge;

