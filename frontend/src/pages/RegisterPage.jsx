import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URLS, graphqlRequest } from "../api/index.js";
import { Alert, FormField, Spinner } from "../components/index.js";
import { authApi } from "../auth/authApi.js";

const DEPARTAMENTOS = [
  "Capital", "Godoy Cruz", "Guaymallén", "Las Heras", "Luján de Cuyo",
  "Maipú", "Lavalle", "San Martín", "Rivadavia", "Junín", "Santa Rosa",
  "La Paz", "Tupungato", "Tunuyán", "San Carlos", "San Rafael",
  "General Alvear", "Malargüe",
];

const EMPTY_FIELDS = {
  nombre: "", apellido: "", email: "", password: "", telefono: "", direccion: "",
  dni: "", fechaNacimiento: "", obraSocial: "", datosMedicos: "", matricula: "",
  especialidades: "", departamento: "", aniosExperiencia: "0", tarifaHora: "",
  lat: "", lng: "",
};

function errorMessage(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") return message;
  if (error.code === "ERR_NETWORK") {
    return "No pudimos conectar con los servicios. Revisá que estén disponibles e intentá otra vez.";
  }
  return error.message || "No se pudo crear la cuenta. Revisá los datos e intentá otra vez.";
}

function withoutEmptyValues(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== "" && value !== undefined),
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("PACIENTE");
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [retryServices, setRetryServices] = useState(0);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role !== "ENFERMERO") return undefined;
    let active = true;
    setServicesLoading(true);
    setServicesError("");

    graphqlRequest(
      API_URLS.solicitudes + "/graphql",
      "query CatalogoServicios { servicios(activo: true) { id nombre } }",
    )
      .then((data) => {
        if (active) setServices(data?.servicios || []);
      })
      .catch((requestError) => {
        if (active) setServicesError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });

    return () => { active = false; };
  }, [role, retryServices]);

  function update(event) {
    setFields((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
    setSuccess("");
  }

  function toggleService(serviceId) {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function useCurrentLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Este navegador no permite obtener la ubicación automáticamente.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFields((current) => ({
          ...current,
          lat: String(coords.latitude),
          lng: String(coords.longitude),
        }));
        setLocationMessage("Ubicación agregada. Podés ajustarla si hace falta.");
      },
      () => setLocationMessage("No pudimos obtener la ubicación. Ingresá latitud y longitud manualmente."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const common = {
      nombre: fields.nombre.trim(),
      apellido: fields.apellido.trim(),
      email: fields.email.trim().toLowerCase(),
      password: fields.password,
      telefono: fields.telefono.trim(),
      direccion: fields.direccion.trim(),
    };

    try {
      if (role === "PACIENTE") {
        await authApi.registerPatient(withoutEmptyValues({
          ...common,
          dni: fields.dni.trim(),
          fechaNacimiento: fields.fechaNacimiento,
          obraSocial: fields.obraSocial.trim(),
          datosMedicos: fields.datosMedicos.trim(),
        }));
        navigate("/login", {
          replace: true,
          state: { message: "Tu cuenta quedó creada. Iniciá sesión para continuar." },
        });
        return;
      }

      if (!fields.lat || !fields.lng) {
        setError("Ingresá la ubicación o usá el botón para compartirla desde tu dispositivo.");
        return;
      }

      const nurseData = withoutEmptyValues({
        ...common,
        matricula: fields.matricula.trim(),
        especialidades: fields.especialidades.split(",").map((item) => item.trim()).filter(Boolean),
        departamento: fields.departamento,
        aniosExperiencia: Number(fields.aniosExperiencia),
        tarifaHora: fields.tarifaHora ? Number(fields.tarifaHora) : undefined,
        serviciosOfrecidos: selectedServices,
        ubicacion: { lat: Number(fields.lat), lng: Number(fields.lng) },
      });

      await authApi.registerNurse(nurseData);
      setSuccess("Tu cuenta quedó creada y la matrícula está pendiente de validación. Cuando el administrador la apruebe, vas a aparecer en las búsquedas.");
      setFields(EMPTY_FIELDS);
      setSelectedServices([]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide" aria-labelledby="register-title">
        <p className="eyebrow">Empezá en Enfered</p>
        <h1 id="register-title">Crear una cuenta</h1>
        <p className="auth-intro">Elegí el tipo de cuenta y completá tus datos.</p>
        {error ? <Alert variant="error" title="Revisá los datos">{error}</Alert> : null}
        {success ? (
          <Alert variant="success" title="Registro recibido">
            {success} <Link to="/login">Iniciá sesión</Link>
          </Alert>
        ) : null}

        <fieldset className="role-choice">
          <legend>Quiero registrarme como</legend>
          <label className={role === "PACIENTE" ? "role-choice-option is-selected" : "role-choice-option"}>
            <input type="radio" name="role" value="PACIENTE" checked={role === "PACIENTE"} onChange={() => { setRole("PACIENTE"); setError(""); setSuccess(""); }} />
            <span>Paciente</span>
          </label>
          <label className={role === "ENFERMERO" ? "role-choice-option is-selected" : "role-choice-option"}>
            <input type="radio" name="role" value="ENFERMERO" checked={role === "ENFERMERO"} onChange={() => { setRole("ENFERMERO"); setError(""); setSuccess(""); }} />
            <span>Enfermero/a</span>
          </label>
        </fieldset>

        {role === "ENFERMERO" ? (
          <Alert variant="info" title="Validación de matrícula">
            Tu perfil queda pendiente y no aparecerá en las búsquedas hasta que el administrador valide la matrícula.
          </Alert>
        ) : null}

        <form className="auth-form register-form" onSubmit={submit}>
          <div className="form-grid">
            <FormField label="Nombre" name="nombre" autoComplete="given-name" value={fields.nombre} onChange={update} required />
            <FormField label="Apellido" name="apellido" autoComplete="family-name" value={fields.apellido} onChange={update} required />
            <FormField label="Correo electrónico" name="email" type="email" autoComplete="email" value={fields.email} onChange={update} required />
            <FormField label="Contraseña" name="password" type="password" autoComplete="new-password" value={fields.password} onChange={update} required />
            <FormField label="Teléfono" name="telefono" type="tel" autoComplete="tel" value={fields.telefono} onChange={update} required />
            <FormField label="Dirección" name="direccion" autoComplete="street-address" value={fields.direccion} onChange={update} required />

            {role === "PACIENTE" ? (
              <>
                <FormField label="DNI" name="dni" inputMode="numeric" value={fields.dni} onChange={update} required />
                <FormField label="Fecha de nacimiento" name="fechaNacimiento" type="date" value={fields.fechaNacimiento} onChange={update} />
                <FormField label="Obra social (opcional)" name="obraSocial" value={fields.obraSocial} onChange={update} />
                <FormField as="textarea" label="Datos médicos (opcional)" name="datosMedicos" hint="Compartí solo la información que consideres necesaria." value={fields.datosMedicos} onChange={update} rows={3} />
              </>
            ) : (
              <>
                <FormField label="Matrícula" name="matricula" value={fields.matricula} onChange={update} required />
                <FormField label="Especialidades" name="especialidades" hint="Separalas con comas, por ejemplo: Geriatría, Heridas." value={fields.especialidades} onChange={update} required />
                <FormField as="select" label="Departamento" name="departamento" value={fields.departamento} onChange={update} required>
                  <option value="">Elegí tu departamento</option>
                  {DEPARTAMENTOS.map((department) => <option key={department} value={department}>{department}</option>)}
                </FormField>
                <FormField label="Años de experiencia" name="aniosExperiencia" type="number" min="0" step="1" value={fields.aniosExperiencia} onChange={update} required />
                <FormField label="Tarifa por hora (opcional)" name="tarifaHora" type="number" min="0" step="0.01" value={fields.tarifaHora} onChange={update} />

                <div className="service-picker">
                  <span className="ui-field-label">Servicios que ofrecés</span>
                  {servicesLoading ? <Spinner label="Cargando catálogo…" size="small" /> : null}
                  {servicesError ? (
                    <Alert variant="error" onRetry={() => setRetryServices((value) => value + 1)}>{servicesError}</Alert>
                  ) : null}
                  {!servicesLoading && !servicesError && services.length ? (
                    <div className="service-options">
                      {services.map((service) => (
                        <label className="checkbox-option" key={service.id}>
                          <input type="checkbox" checked={selectedServices.includes(service.id)} onChange={() => toggleService(service.id)} />
                          <span>{service.nombre}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {!servicesLoading && !servicesError && !services.length ? (
                    <p className="auth-hint">El catálogo todavía no tiene servicios disponibles.</p>
                  ) : null}
                </div>

                <div className="location-fields">
                  <p className="ui-field-label">Ubicación aproximada</p>
                  <button className="ui-button ui-button-secondary" type="button" onClick={useCurrentLocation}>Usar mi ubicación</button>
                  {locationMessage ? <p className="auth-hint" role="status">{locationMessage}</p> : null}
                  <div className="form-grid">
                    <FormField label="Latitud" name="lat" type="number" min="-90" max="90" step="any" value={fields.lat} onChange={update} required />
                    <FormField label="Longitud" name="lng" type="number" min="-180" max="180" step="any" value={fields.lng} onChange={update} required />
                  </div>
                </div>
              </>
            )}
          </div>
          <button className="ui-button ui-button-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner label="Creando cuenta…" size="small" /> : "Crear cuenta"}
          </button>
        </form>
        <p className="auth-footnote">¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
      </section>
    </main>
  );
}

export default RegisterPage;
