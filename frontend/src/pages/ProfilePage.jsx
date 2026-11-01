import { useEffect, useState } from "react";
import { API_URLS, graphqlRequest } from "../api/index.js";
import { profileApi } from "../api/profile.js";
import { Alert, Badge, FormField, Spinner } from "../components/index.js";

const DEPARTAMENTOS = [
  "Capital", "Godoy Cruz", "Guaymallén", "Las Heras", "Luján de Cuyo",
  "Maipú", "Lavalle", "San Martín", "Rivadavia", "Junín", "Santa Rosa",
  "La Paz", "Tupungato", "Tunuyán", "San Carlos", "San Rafael",
  "General Alvear", "Malargüe",
];

const DIAS = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
];

const EMPTY_FIELDS = {
  nombre: "", apellido: "", telefono: "", direccion: "", dni: "",
  fechaNacimiento: "", obraSocial: "", datosMedicos: "", matricula: "",
  especialidades: "", departamento: "", aniosExperiencia: "0",
  tarifaHora: "", radioCoberturaKm: "10", disponible: true, descripcion: "",
  lat: "", lng: "", serviciosOfrecidos: [], disponibilidad: [],
};

function errorMessage(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  if (error.code === "ERR_NETWORK") return "No pudimos conectar con el servicio. Intentá de nuevo cuando esté disponible.";
  return error.message || "No se pudo completar la operación.";
}

function toFields(user) {
  const location = user.ubicacion || {};
  const coordinates = location.coordinates || [];
  const offered = Array.isArray(user.serviciosOfrecidos) ? user.serviciosOfrecidos : [];

  return {
    nombre: user.nombre || "",
    apellido: user.apellido || "",
    telefono: user.telefono || "",
    direccion: user.direccion || "",
    dni: user.dni || "",
    fechaNacimiento: user.fechaNacimiento ? String(user.fechaNacimiento).slice(0, 10) : "",
    obraSocial: user.obraSocial || "",
    datosMedicos: user.datosMedicos || "",
    matricula: user.matricula || "",
    especialidades: Array.isArray(user.especialidades) ? user.especialidades.join(", ") : "",
    departamento: user.departamento || "",
    aniosExperiencia: String(user.aniosExperiencia ?? 0),
    tarifaHora: user.tarifaHora == null ? "" : String(user.tarifaHora),
    radioCoberturaKm: String(user.radioCoberturaKm ?? 10),
    disponible: user.disponible ?? true,
    descripcion: user.descripcion || "",
    lat: String(location.lat ?? coordinates[1] ?? ""),
    lng: String(location.lng ?? coordinates[0] ?? ""),
    serviciosOfrecidos: offered.map((service) =>
      typeof service === "string" ? service : service.id || service._id,
    ).filter(Boolean),
    disponibilidad: Array.isArray(user.disponibilidad)
      ? user.disponibilidad.map((item) => ({
          dia: String(item.dia),
          desde: item.desde || "",
          hasta: item.hasta || "",
        }))
      : [],
  };
}

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [error, setError] = useState("");
  const [servicesError, setServicesError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProfile() {
    setIsLoading(true);
    setError("");
    try {
      const user = await profileApi.getCurrent();
      setProfile(user);
      setFields(toFields(user));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadServices() {
    setServicesLoading(true);
    setServicesError("");
    try {
      const data = await graphqlRequest(
        API_URLS.solicitudes + "/graphql",
        "query ServiciosPerfil { servicios { id nombre activo } }",
      );
      setServices(data?.servicios || []);
    } catch (requestError) {
      setServicesError(errorMessage(requestError));
    } finally {
      setServicesLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    loadServices();
  }, []);

  function update(event) {
    const { name, value, type, checked } = event.target;
    setFields((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setError("");
    setSuccess("");
  }

  function updateAvailability(index, key, value) {
    setFields((current) => ({
      ...current,
      disponibilidad: current.disponibilidad.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function addAvailability() {
    setFields((current) => ({
      ...current,
      disponibilidad: [...current.disponibilidad, { dia: "1", desde: "09:00", hasta: "17:00" }],
    }));
  }

  function removeAvailability(index) {
    setFields((current) => ({
      ...current,
      disponibilidad: current.disponibilidad.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function toggleService(id) {
    setFields((current) => ({
      ...current,
      serviciosOfrecidos: current.serviciosOfrecidos.includes(id)
        ? current.serviciosOfrecidos.filter((serviceId) => serviceId !== id)
        : [...current.serviciosOfrecidos, id],
    }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Este navegador no permite obtener la ubicación automáticamente.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setFields((current) => ({
        ...current,
        lat: String(coords.latitude),
        lng: String(coords.longitude),
      })),
      () => setError("No pudimos obtener la ubicación. Ingresá latitud y longitud manualmente."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function save(event) {
    event.preventDefault();
    if (!profile) return;
    setError("");
    setSuccess("");
    setIsSaving(true);

    const payload = {
      nombre: fields.nombre.trim(),
      apellido: fields.apellido.trim(),
      telefono: fields.telefono.trim(),
      direccion: fields.direccion.trim(),
    };

    if (profile.rol === "PACIENTE") {
      Object.assign(payload, {
        dni: fields.dni.trim(),
        fechaNacimiento: fields.fechaNacimiento || null,
        obraSocial: fields.obraSocial.trim(),
        datosMedicos: fields.datosMedicos.trim(),
      });
    }

    if (profile.rol === "ENFERMERO") {
      if (!fields.lat || !fields.lng) {
        setError("Ingresá una ubicación válida antes de guardar el perfil.");
        setIsSaving(false);
        return;
      }
      Object.assign(payload, {
        matricula: fields.matricula.trim(),
        especialidades: fields.especialidades.split(",").map((item) => item.trim()).filter(Boolean),
        departamento: fields.departamento,
        aniosExperiencia: Number(fields.aniosExperiencia),
        tarifaHora: fields.tarifaHora === "" ? null : Number(fields.tarifaHora),
        serviciosOfrecidos: fields.serviciosOfrecidos,
        ubicacion: { lat: Number(fields.lat), lng: Number(fields.lng) },
        radioCoberturaKm: Number(fields.radioCoberturaKm),
        disponible: fields.disponible,
        disponibilidad: fields.disponibilidad.map((item) => ({
          dia: Number(item.dia),
          desde: item.desde,
          hasta: item.hasta,
        })),
        descripcion: fields.descripcion.trim(),
      });
    }

    try {
      const updated = await profileApi.update(payload);
      if (updated && typeof updated === "object") {
        setProfile((current) => ({ ...current, ...updated }));
      } else {
        setProfile((current) => ({ ...current, ...payload }));
      }
      setSuccess("Guardamos los cambios de tu perfil.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <main className="page"><Spinner label="Cargando tu perfil…" /></main>;
  }

  if (error && !profile) {
    return (
      <main className="page">
        <h1>Mi perfil</h1>
        <Alert variant="error" title="No pudimos cargar tu perfil" onRetry={loadProfile}>{error}</Alert>
      </main>
    );
  }

  if (!profile) return null;

  const isNurse = profile.rol === "ENFERMERO";
  const isPatient = profile.rol === "PACIENTE";

  return (
    <main className="page management-page">
      <p className="eyebrow">Tu cuenta</p>
      <h1>Mi perfil</h1>
      <p className="management-intro">Mantené tus datos actualizados.</p>
      {error ? <Alert variant="error" title="No se guardaron los cambios">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <form className="management-card" onSubmit={save}>
        <h2>Datos personales</h2>
        <div className="form-grid">
          <FormField label="Nombre" name="nombre" value={fields.nombre} onChange={update} required />
          <FormField label="Apellido" name="apellido" value={fields.apellido} onChange={update} required />
          <FormField label="Correo electrónico" value={profile.email || ""} readOnly hint="El correo no se puede cambiar desde el perfil." />
          <FormField label="Teléfono" name="telefono" type="tel" value={fields.telefono} onChange={update} required />
          <FormField label="Dirección" name="direccion" value={fields.direccion} onChange={update} required />
          <FormField label="Tipo de cuenta" value={profile.rol} readOnly />
        </div>

        {isPatient ? (
          <>
            <h2>Datos de paciente</h2>
            <div className="form-grid">
              <FormField label="DNI" name="dni" value={fields.dni} onChange={update} required />
              <FormField label="Fecha de nacimiento" name="fechaNacimiento" type="date" value={fields.fechaNacimiento} onChange={update} />
              <FormField label="Obra social" name="obraSocial" value={fields.obraSocial} onChange={update} />
              <FormField as="textarea" label="Datos médicos (opcional)" name="datosMedicos" value={fields.datosMedicos} onChange={update} rows={3} hint="Compartí solo la información que consideres necesaria." />
            </div>
          </>
        ) : null}

        {isNurse ? (
          <>
            <div className="management-section-heading">
              <div>
                <h2>Perfil profesional</h2>
                <p>La matrícula y el estado de validación son de solo lectura.</p>
              </div>
              <Badge status={profile.estadoVerificacion} />
            </div>
            {profile.motivoRechazo ? (
              <Alert variant="warning" title="Observación de matrícula">{profile.motivoRechazo}</Alert>
            ) : null}
            <div className="form-grid">
              <FormField label="Matrícula" value={fields.matricula} readOnly hint="Para corregirla, contactá al administrador." />
              <FormField label="Departamento" as="select" name="departamento" value={fields.departamento} onChange={update} required>
                <option value="">Elegí tu departamento</option>
                {DEPARTAMENTOS.map((department) => <option key={department} value={department}>{department}</option>)}
              </FormField>
              <FormField label="Especialidades" name="especialidades" value={fields.especialidades} onChange={update} hint="Separalas con comas." />
              <FormField label="Años de experiencia" name="aniosExperiencia" type="number" min="0" step="1" value={fields.aniosExperiencia} onChange={update} />
              <FormField label="Tarifa por hora" name="tarifaHora" type="number" min="0" step="0.01" value={fields.tarifaHora} onChange={update} />
              <FormField label="Radio de cobertura (km)" name="radioCoberturaKm" type="number" min="1" step="1" value={fields.radioCoberturaKm} onChange={update} />
            </div>

            <div className="management-control-group">
              <span className="ui-field-label">Servicios que ofrecés</span>
              {servicesLoading ? <Spinner label="Cargando catálogo…" size="small" /> : null}
              {servicesError ? <Alert variant="error" onRetry={loadServices}>{servicesError}</Alert> : null}
              {!servicesLoading && !servicesError && services.length ? (
                <div className="service-options">
                  {services.map((service) => (
                    <label className="checkbox-option" key={service.id}>
                      <input
                        type="checkbox"
                        checked={fields.serviciosOfrecidos.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                      />
                      <span>{service.nombre}{service.activo ? "" : " (inactivo)"}</span>
                    </label>
                  ))}
                </div>
              ) : null}
              {!servicesLoading && !servicesError && !services.length ? (
                <p className="auth-hint">El catálogo no tiene servicios disponibles.</p>
              ) : null}
            </div>

            <div className="form-grid">
              <FormField as="textarea" label="Descripción profesional" name="descripcion" value={fields.descripcion} onChange={update} rows={3} />
              <div className="availability-toggle">
                <label className="checkbox-option">
                  <input type="checkbox" name="disponible" checked={fields.disponible} onChange={update} />
                  <span>Estoy disponible para recibir solicitudes</span>
                </label>
              </div>
              <div className="location-fields">
                <span className="ui-field-label">Ubicación de atención</span>
                <button className="ui-button ui-button-secondary" type="button" onClick={useCurrentLocation}>Usar mi ubicación</button>
                <div className="form-grid">
                  <FormField label="Latitud" name="lat" type="number" min="-90" max="90" step="any" value={fields.lat} onChange={update} required />
                  <FormField label="Longitud" name="lng" type="number" min="-180" max="180" step="any" value={fields.lng} onChange={update} required />
                </div>
              </div>
            </div>

            <section className="availability-section" aria-labelledby="availability-title">
              <div className="management-section-heading">
                <div>
                  <h2 id="availability-title">Horarios de atención</h2>
                  <p>Indicá los días y franjas horarias en que podés recibir solicitudes.</p>
                </div>
                <button className="ui-button ui-button-secondary" type="button" onClick={addAvailability}>Agregar horario</button>
              </div>
              {fields.disponibilidad.length ? fields.disponibilidad.map((item, index) => (
                <div className="availability-row" key={index}>
                  <FormField as="select" label="Día" value={item.dia} onChange={(event) => updateAvailability(index, "dia", event.target.value)}>
                    {DIAS.map((day, dayIndex) => <option key={day} value={dayIndex}>{day}</option>)}
                  </FormField>
                  <FormField label="Desde" type="time" value={item.desde} onChange={(event) => updateAvailability(index, "desde", event.target.value)} required />
                  <FormField label="Hasta" type="time" value={item.hasta} onChange={(event) => updateAvailability(index, "hasta", event.target.value)} required />
                  <button className="ui-button ui-button-secondary" type="button" onClick={() => removeAvailability(index)} aria-label={"Quitar horario " + (index + 1)}>Quitar</button>
                </div>
              )) : <p className="auth-hint">Todavía no agregaste horarios.</p>}
            </section>
          </>
        ) : null}

        <button className="ui-button ui-button-primary" type="submit" disabled={isSaving}>
          {isSaving ? <Spinner label="Guardando…" size="small" /> : "Guardar cambios"}
        </button>
      </form>
    </main>
  );
}

export default ProfilePage;
