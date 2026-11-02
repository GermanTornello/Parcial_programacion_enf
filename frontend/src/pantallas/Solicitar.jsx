import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { crearSolicitud, listarServicios, obtenerEnfermero } from '../datos';
import { Aviso, Estado, EstadoBadge, Pagina, fechaLarga, useCarga } from '../componentes/ui';

const hoy = () => new Date().toISOString().slice(0, 10);
const en6Meses = () => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().slice(0, 10); };

export default function Solicitar() {
  const { id } = useParams();
  const perfil = useCarga(() => obtenerEnfermero(id), [id]);
  const servicios = useCarga(listarServicios, []);
  const [f, setF] = useState({ servicioId: '', fecha: '', hora: '', direccionAtencion: '', notas: '' });
  const [errores, setErrores] = useState({});
  const [fallo, setFallo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [comprobante, setComprobante] = useState(null);

  if (!perfil.datos) return <Pagina titulo="Solicitar servicio"><Estado cargando={perfil.cargando} error={perfil.error} onReintentar={perfil.recargar} /></Pagina>;
  const e = perfil.datos.enfermero;
  const opciones = (servicios.datos ?? []).filter((s) => e.serviciosOfrecidos.includes(s.id));
  const cambiar = (k) => (ev) => setF({ ...f, [k]: ev.target.value });

  const validar = () => {
    const x = {};
    if (!f.servicioId) x.servicioId = 'Elegí un servicio.';
    if (!f.fecha) x.fecha = 'Elegí una fecha.';
    else if (f.fecha < hoy() || f.fecha > en6Meses()) x.fecha = 'La fecha tiene que ser futura y dentro de los próximos 6 meses.';
    if (!f.hora) x.hora = 'Elegí una hora.';
    if (!f.direccionAtencion.trim()) x.direccionAtencion = 'Indicá la dirección donde te van a atender.';
    return x;
  };
  const enviar = async (ev) => {
    ev.preventDefault();
    const x = validar();
    setErrores(x); setFallo('');
    if (Object.keys(x).length) return;
    setEnviando(true);
    try { setComprobante(await crearSolicitud({ enfermeroId: id, ...f })); } catch (err) { setFallo(err.message); } finally { setEnviando(false); }
  };

  if (comprobante) return (
    <Pagina etiqueta="Solicitud enviada" titulo="¡Listo! Ya le avisamos a tu enfermero">
      <Aviso tipo="exito">Te va a responder pronto. Cuando acepte, vas a poder chatear con él o ella.</Aviso>
      <div className="tarjeta comprobante"><div>
        <p><EstadoBadge estado={comprobante.estado} /></p>
        <h2>{comprobante.servicio.nombre} con {comprobante.enfermeroNombre}</h2>
        <p>{fechaLarga(comprobante.fecha, comprobante.hora)}</p>
        <p className="sub">{comprobante.direccionAtencion}</p>
        {comprobante.notas && <p>Notas: {comprobante.notas}</p>}
      </div></div>
      <div className="fila-botones"><Link className="btn primario" to="/solicitudes">Ver mis solicitudes</Link><Link className="btn" to="/buscar">Seguir buscando</Link></div>
    </Pagina>
  );

  return (
    <Pagina etiqueta="Solicitar servicio" titulo={`Pedile una visita a ${e.nombre} ${e.apellido}`}>
      <Link to={`/enfermeros/${id}`} className="volver">‹ Volver al perfil</Link>
      <form className="form" onSubmit={enviar} noValidate>
        <label>Servicio
          <select value={f.servicioId} onChange={cambiar('servicioId')} aria-invalid={!!errores.servicioId}>
            <option value="">Elegí un servicio</option>{opciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          {errores.servicioId && <span className="campo-error">{errores.servicioId}</span>}
        </label>
        <div className="dos">
          <label>Fecha<input type="date" min={hoy()} max={en6Meses()} value={f.fecha} onChange={cambiar('fecha')} aria-invalid={!!errores.fecha} />{errores.fecha && <span className="campo-error">{errores.fecha}</span>}</label>
          <label>Hora<input type="time" value={f.hora} onChange={cambiar('hora')} aria-invalid={!!errores.hora} />{errores.hora && <span className="campo-error">{errores.hora}</span>}</label>
        </div>
        <label>Dirección de atención<input value={f.direccionAtencion} onChange={cambiar('direccionAtencion')} placeholder="Calle, número y departamento" aria-invalid={!!errores.direccionAtencion} />{errores.direccionAtencion && <span className="campo-error">{errores.direccionAtencion}</span>}</label>
        <label>Notas (opcional)<textarea rows={3} value={f.notas} onChange={cambiar('notas')} placeholder="Algo que el enfermero tenga que saber" /></label>
        <Aviso tipo="error">{fallo}</Aviso>
        <button className="btn primario" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
      </form>
    </Pagina>
  );
}
