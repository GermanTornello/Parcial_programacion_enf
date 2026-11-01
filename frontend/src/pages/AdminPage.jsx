import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/admin.js";
import { Alert, Badge, ConfirmDialog, DataTable, FormField, Modal, SearchBar, Spinner } from "../components/index.js";

const TABS = [
  { id: "matriculas", label: "Matrículas pendientes" },
  { id: "usuarios", label: "Usuarios" },
  { id: "servicios", label: "Catálogo de servicios" },
];

const EMPTY_SERVICE = {
  nombre: "",
  descripcion: "",
  duracionEstimadaMin: "60",
  precioReferencia: "0",
  activo: true,
};

function errorMessage(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  if (error.code === "ERR_NETWORK") return "No pudimos conectar con el servicio. Intentá de nuevo cuando esté disponible.";
  return error.message || "No se pudo completar la operación.";
}

function getId(user) {
  return user?.id || user?._id;
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState("matriculas");
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [tabError, setTabError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchText, setSearchText] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [verificationTarget, setVerificationTarget] = useState(null);
  const [verificationReason, setVerificationReason] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [serviceDialog, setServiceDialog] = useState(null);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceDeleteTarget, setServiceDeleteTarget] = useState(null);
  const [serviceDeleteLoading, setServiceDeleteLoading] = useState(false);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setTabError("");
    try {
      const result = await adminApi.pendingNurses();
      setPending(Array.isArray(result) ? result : []);
    } catch (error) {
      setTabError(errorMessage(error));
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (search = searchText, rol = userRoleFilter) => {
    setUsersLoading(true);
    setTabError("");
    try {
      const result = await adminApi.users({ search: search.trim(), rol });
      setUsers(Array.isArray(result) ? result : []);
    } catch (error) {
      setTabError(errorMessage(error));
    } finally {
      setUsersLoading(false);
    }
  }, [searchText, userRoleFilter]);

  const loadServices = useCallback(async (search = serviceSearch) => {
    setServicesLoading(true);
    setTabError("");
    try {
      setServices(await adminApi.listServices(search.trim()));
    } catch (error) {
      setTabError(errorMessage(error));
    } finally {
      setServicesLoading(false);
    }
  }, [serviceSearch]);

  useEffect(() => {
    if (activeTab === "matriculas") loadPending();
    if (activeTab === "usuarios") loadUsers();
    if (activeTab === "servicios") loadServices();
  }, [activeTab, loadPending, loadUsers, loadServices]);

  function openVerification(nurse, estado) {
    setVerificationTarget({ nurse, estado });
    setVerificationReason("");
    setTabError("");
  }

  async function confirmVerification(event) {
    event.preventDefault();
    if (!verificationTarget) return;
    setVerificationLoading(true);
    setTabError("");
    try {
      const { nurse, estado } = verificationTarget;
      await adminApi.verifyNurse(getId(nurse), estado, verificationReason.trim() || undefined);
      setPending((current) => current.filter((item) => getId(item) !== getId(nurse)));
      setNotice(estado === "APROBADO" ? "Matrícula aprobada." : "Matrícula rechazada.");
      setVerificationTarget(null);
    } catch (error) {
      setTabError(errorMessage(error));
    } finally {
      setVerificationLoading(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setTabError("");
    try {
      await adminApi.deleteUser(getId(deleteTarget));
      setUsers((current) => current.filter((user) => getId(user) !== getId(deleteTarget)));
      setNotice("Usuario eliminado.");
      setDeleteTarget(null);
    } catch (error) {
      setTabError(errorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  }

  function openCreateService() {
    setServiceForm(EMPTY_SERVICE);
    setServiceDialog({ mode: "create", service: null });
    setTabError("");
  }

  function openEditService(service) {
    setServiceForm({
      nombre: service.nombre || "",
      descripcion: service.descripcion || "",
      duracionEstimadaMin: String(service.duracionEstimadaMin ?? 60),
      precioReferencia: String(service.precioReferencia ?? 0),
      activo: Boolean(service.activo),
    });
    setServiceDialog({ mode: "edit", service });
    setTabError("");
  }

  async function saveService(event) {
    event.preventDefault();
    if (!serviceDialog) return;
    setServiceSaving(true);
    setTabError("");
    const input = {
      nombre: serviceForm.nombre.trim(),
      descripcion: serviceForm.descripcion.trim() || null,
      duracionEstimadaMin: Number(serviceForm.duracionEstimadaMin),
      precioReferencia: Number(serviceForm.precioReferencia),
      activo: serviceForm.activo,
    };

    try {
      if (serviceDialog.mode === "create") {
        await adminApi.createService(input);
        setNotice("Servicio creado.");
      } else {
        await adminApi.updateService(getId(serviceDialog.service), input);
        setNotice("Servicio actualizado.");
      }
      setServiceDialog(null);
      await loadServices();
    } catch (error) {
      setTabError(errorMessage(error));
    } finally {
      setServiceSaving(false);
    }
  }

  async function toggleServiceActive(service) {
    setTabError("");
    try {
      const updated = await adminApi.updateService(getId(service), { activo: !service.activo });
      setServices((current) =>
        current.map((item) => getId(item) === getId(service) ? { ...item, ...(updated || {}), activo: !service.activo } : item),
      );
      setNotice(service.activo ? "Servicio desactivado." : "Servicio activado.");
    } catch (error) {
      setTabError(errorMessage(error));
    }
  }

  async function confirmDeleteService() {
    if (!serviceDeleteTarget) return;
    setServiceDeleteLoading(true);
    setTabError("");
    try {
      await adminApi.deleteService(getId(serviceDeleteTarget));
      setServices((current) => current.filter((service) => getId(service) !== getId(serviceDeleteTarget)));
      setNotice("Servicio eliminado del catálogo.");
      setServiceDeleteTarget(null);
    } catch (error) {
      setTabError(errorMessage(error));
    } finally {
      setServiceDeleteLoading(false);
    }
  }

  const nurseColumns = [
    { key: "nombre", header: "Enfermero/a", render: (_, nurse) => (nurse.nombre || "") + " " + (nurse.apellido || "") },
    { key: "email", header: "Correo" },
    { key: "matricula", header: "Matrícula" },
    { key: "departamento", header: "Departamento" },
    { key: "especialidades", header: "Especialidades", render: (value) => Array.isArray(value) ? value.join(", ") : value || "—" },
    {
      key: "acciones",
      header: "Acciones",
      render: (_, nurse) => (
        <div className="table-actions">
          <button className="ui-button ui-button-primary" type="button" onClick={() => openVerification(nurse, "APROBADO")}>Aprobar</button>
          <button className="ui-button ui-button-secondary" type="button" onClick={() => openVerification(nurse, "RECHAZADO")}>Rechazar</button>
        </div>
      ),
    },
  ];

  const userColumns = [
    { key: "nombre", header: "Nombre", render: (_, user) => [user.nombre, user.apellido].filter(Boolean).join(" ") },
    { key: "email", header: "Correo" },
    { key: "rol", header: "Rol" },
    {
      key: "acciones",
      header: "Acciones",
      render: (_, user) => (
        <button className="ui-button ui-button-secondary" type="button" onClick={() => setDeleteTarget(user)}>
          Eliminar
        </button>
      ),
    },
  ];

  const serviceColumns = [
    { key: "nombre", header: "Servicio" },
    { key: "descripcion", header: "Descripción", render: (value) => value || "—" },
    { key: "duracionEstimadaMin", header: "Duración", render: (value) => value + " min" },
    { key: "precioReferencia", header: "Precio de referencia", render: (value) => "$" + Number(value).toLocaleString("es-AR") },
    { key: "activo", header: "Estado", render: (value) => <Badge status={value ? "ACEPTADA" : "CANCELADA"} label={value ? "Activo" : "Inactivo"} /> },
    {
      key: "acciones",
      header: "Acciones",
      render: (_, service) => (
        <div className="table-actions">
          <button className="ui-button ui-button-secondary" type="button" onClick={() => openEditService(service)}>Editar</button>
          <button className="ui-button ui-button-secondary" type="button" onClick={() => toggleServiceActive(service)}>
            {service.activo ? "Desactivar" : "Activar"}
          </button>
          <button className="ui-button ui-button-danger" type="button" onClick={() => setServiceDeleteTarget(service)}>Eliminar</button>
        </div>
      ),
    },
  ];

  return (
    <main className="page management-page">
      <p className="eyebrow">Administración</p>
      <h1>Panel de administración</h1>
      <p className="management-intro">Gestioná matrículas, usuarios y servicios de Enfered.</p>
      {notice ? <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert> : null}
      {tabError ? <Alert variant="error" title="No se pudo completar la operación" onRetry={() => {
        if (activeTab === "matriculas") loadPending();
        if (activeTab === "usuarios") loadUsers();
        if (activeTab === "servicios") loadServices();
      }}>{tabError}</Alert> : null}

      <div className="admin-tabs" role="tablist" aria-label="Secciones administrativas">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "admin-tab is-active" : "admin-tab"}
            type="button"
            role="tab"
            id={"tab-" + tab.id}
            aria-selected={activeTab === tab.id}
            aria-controls={"panel-" + tab.id}
            onClick={() => { setActiveTab(tab.id); setTabError(""); setNotice(""); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        className="management-card admin-tab-panel"
        role="tabpanel"
        id={"panel-" + activeTab}
        aria-labelledby={"tab-" + activeTab}
      >
        {activeTab === "matriculas" ? (
          <>
            <div className="management-section-heading">
              <div>
                <h2>Matrículas pendientes</h2>
                <p>Los perfiles aprobados pueden aparecer en las búsquedas.</p>
              </div>
              <button className="ui-button ui-button-secondary" type="button" onClick={loadPending}>Actualizar</button>
            </div>
            {pendingLoading ? <Spinner label="Cargando matrículas…" /> : null}
            {!pendingLoading && !tabError ? (
              <DataTable columns={nurseColumns} rows={pending} caption="Enfermeros pendientes de validación" emptyMessage="No hay matrículas pendientes." />
            ) : null}
          </>
        ) : null}

        {activeTab === "usuarios" ? (
          <>
            <h2>Gestión de usuarios</h2>
            <div className="admin-search-form">
              <SearchBar value={searchText} onChange={setSearchText} onSearch={(value) => loadUsers(value, userRoleFilter)} ariaLabel="Buscar por nombre, apellido o correo" placeholder="Nombre, apellido o correo" />
              <FormField as="select" label="Filtrar por rol" value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
                <option value="">Todos los roles</option>
                <option value="PACIENTE">Paciente</option>
                <option value="ENFERMERO">Enfermero/a</option>
                <option value="ADMIN">Administrador</option>
              </FormField>
            </div>
            {usersLoading ? <Spinner label="Buscando usuarios…" /> : null}
            {!usersLoading && !tabError ? (
              <DataTable columns={userColumns} rows={users} caption="Usuarios registrados" emptyMessage="No hay usuarios que coincidan con la búsqueda." />
            ) : null}
          </>
        ) : null}

        {activeTab === "servicios" ? (
          <>
            <div className="management-section-heading">
              <div>
                <h2>Catálogo de servicios</h2>
                <p>Creá, editá, activá o quitá servicios disponibles.</p>
              </div>
              <button className="ui-button ui-button-primary" type="button" onClick={openCreateService}>Nuevo servicio</button>
            </div>
            <SearchBar value={serviceSearch} onChange={setServiceSearch} onSearch={loadServices} ariaLabel="Buscar servicios por nombre" placeholder="Buscar por nombre" />
            {servicesLoading ? <Spinner label="Cargando servicios…" /> : null}
            {!servicesLoading && !tabError ? (
              <DataTable columns={serviceColumns} rows={services} caption="Servicios" emptyMessage="No hay servicios en el catálogo." />
            ) : null}
          </>
        ) : null}
      </section>

      <Modal
        open={Boolean(verificationTarget)}
        onClose={() => !verificationLoading && setVerificationTarget(null)}
        title={verificationTarget?.estado === "APROBADO" ? "Aprobar matrícula" : "Rechazar matrícula"}
      >
        {verificationTarget ? (
          <form className="management-form" onSubmit={confirmVerification}>
            <p>
              {verificationTarget.nurse.nombre} {verificationTarget.nurse.apellido} · matrícula {verificationTarget.nurse.matricula}
            </p>
            {verificationTarget.estado === "RECHAZADO" ? (
              <FormField
                as="textarea"
                label="Motivo (opcional)"
                value={verificationReason}
                onChange={(event) => setVerificationReason(event.target.value)}
                rows={3}
              />
            ) : (
              <p>Al aprobar, la persona podrá aparecer en las búsquedas.</p>
            )}
            <div className="ui-dialog-actions">
              <button className="ui-button ui-button-secondary" type="button" onClick={() => setVerificationTarget(null)} disabled={verificationLoading}>Volver</button>
              <button className={verificationTarget.estado === "RECHAZADO" ? "ui-button ui-button-danger" : "ui-button ui-button-primary"} type="submit" disabled={verificationLoading}>
                {verificationLoading ? <Spinner label="Guardando…" size="small" /> : verificationTarget.estado === "APROBADO" ? "Aprobar" : "Rechazar"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        message={deleteTarget ? "¿Querés eliminar la cuenta de " + [deleteTarget.nombre, deleteTarget.apellido].filter(Boolean).join(" ") + "? Esta acción no se puede deshacer." : ""}
        confirmLabel="Eliminar usuario"
        isDanger
        isLoading={deleteLoading}
        onCancel={() => !deleteLoading && setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      />

      <Modal
        open={Boolean(serviceDialog)}
        onClose={() => !serviceSaving && setServiceDialog(null)}
        title={serviceDialog?.mode === "create" ? "Agregar servicio" : "Editar servicio"}
      >
        {serviceDialog ? (
          <form className="management-form" onSubmit={saveService}>
            <FormField label="Nombre" value={serviceForm.nombre} onChange={(event) => setServiceForm((current) => ({ ...current, nombre: event.target.value }))} required maxLength={80} />
            <FormField as="textarea" label="Descripción" value={serviceForm.descripcion} onChange={(event) => setServiceForm((current) => ({ ...current, descripcion: event.target.value }))} rows={3} maxLength={300} />
            <div className="form-grid">
              <FormField label="Duración estimada (minutos)" type="number" min="5" step="1" value={serviceForm.duracionEstimadaMin} onChange={(event) => setServiceForm((current) => ({ ...current, duracionEstimadaMin: event.target.value }))} required />
              <FormField label="Precio de referencia" type="number" min="0" step="0.01" value={serviceForm.precioReferencia} onChange={(event) => setServiceForm((current) => ({ ...current, precioReferencia: event.target.value }))} required />
            </div>
            {serviceDialog.mode === "edit" ? (
              <label className="checkbox-option">
                <input type="checkbox" checked={serviceForm.activo} onChange={(event) => setServiceForm((current) => ({ ...current, activo: event.target.checked }))} />
                <span>Servicio activo</span>
              </label>
            ) : null}
            <div className="ui-dialog-actions">
              <button className="ui-button ui-button-secondary" type="button" onClick={() => setServiceDialog(null)} disabled={serviceSaving}>Cancelar</button>
              <button className="ui-button ui-button-primary" type="submit" disabled={serviceSaving}>
                {serviceSaving ? <Spinner label="Guardando…" size="small" /> : "Guardar servicio"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(serviceDeleteTarget)}
        title="Eliminar servicio"
        message={serviceDeleteTarget ? "¿Eliminar " + serviceDeleteTarget.nombre + " del catálogo?" : ""}
        confirmLabel="Eliminar"
        isDanger
        isLoading={serviceDeleteLoading}
        onCancel={() => !serviceDeleteLoading && setServiceDeleteTarget(null)}
        onConfirm={confirmDeleteService}
      />
    </main>
  );
}

export default AdminPage;

