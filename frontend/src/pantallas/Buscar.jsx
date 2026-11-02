import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { buscarEnfermeros, listarServicios } from '../datos';
import { Estado, Estrellas, Pagina, useCarga } from '../componentes/ui';

const CENTRO_MENDOZA = [-32.8895, -68.8458];
const DEPARTAMENTOS = ['Capital', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'Luján de Cuyo', 'Maipú', 'Lavalle', 'San Martín', 'Rivadavia', 'Junín', 'Santa Rosa', 'La Paz', 'Tupungato', 'Tunuyán', 'San Carlos', 'San Rafael', 'General Alvear', 'Malargüe'];
const ESPECIALIDADES = ['Geriatría', 'Pediatría', 'Heridas', 'Cuidados paliativos', 'Cuidados intensivos'];

function Filtros({ f, setF, servicios }) {
  const cambiar = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <form className="filtros" onSubmit={(e) => e.preventDefault()} aria-label="Filtros de búsqueda">
      <label>Servicio
        <select value={f.servicioId} onChange={cambiar('servicioId')}>
          <option value="">Todos</option>
          {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </label>
      <label>Especialidad
        <select value={f.especialidad} onChange={cambiar('especialidad')}>
          <option value="">Todas</option>{ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
        </select>
      </label>
      <label>Departamento
        <select value={f.departamento} onChange={cambiar('departamento')}>
          <option value="">Todos</option>{DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </label>
      <label>Distancia
        <select value={f.radioKm} onChange={cambiar('radioKm')}>
          {[5, 10, 20, 50].map((r) => <option key={r} value={r}>Hasta {r} km</option>)}
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={f.disponible} onChange={cambiar('disponible')} /> Solo disponibles</label>
    </form>
  );
}

function ListaEnfermeros({ lista, nombresServicio }) {
  return (
    <ul className="lista">
      {lista.map((e) => (
        <li key={e.id} className="tarjeta">
          <div>
            <h2><Link to={`/enfermeros/${e.id}`}>{e.nombre} {e.apellido}</Link></h2>
            <p className="sub">{e.departamento} · a {e.distanciaKm} km · {e.aniosExperiencia} años de experiencia</p>
            <p><Estrellas valor={e.reputacion.promedio} cantidad={e.reputacion.cantidad} /></p>
            <p className="tags">{e.serviciosOfrecidos.map((id) => nombresServicio[id]).filter(Boolean).map((n) => <span key={n}>{n}</span>)}</p>
          </div>
          <span className={e.disponible ? 'disp si' : 'disp no'}>{e.disponible ? 'Disponible' : 'No disponible'}</span>
        </li>
      ))}
    </ul>
  );
}

function MapaEnfermeros({ lista }) {
  return (
    <MapContainer center={CENTRO_MENDOZA} zoom={11} className="mapa" aria-label="Mapa de enfermeros">
      <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {lista.map((e) => (
        <CircleMarker key={e.id} center={[e.ubicacion.coordinates[1], e.ubicacion.coordinates[0]]} radius={11}
          pathOptions={{ color: '#11658f', fillColor: e.disponible ? '#167bb5' : '#9aa9b0', fillOpacity: 0.85 }}>
          <Popup>
            <strong>{e.nombre} {e.apellido}</strong><br />{e.departamento} · a {e.distanciaKm} km<br />
            {e.reputacion.cantidad ? `★ ${e.reputacion.promedio.toFixed(1)} (${e.reputacion.cantidad})` : 'Sin reseñas'}<br />
            <Link to={`/enfermeros/${e.id}`}>Ver perfil</Link>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export default function Buscar() {
  const [f, setF] = useState({ servicioId: '', especialidad: '', departamento: '', radioKm: 10, disponible: false });
  const [vista, setVista] = useState('lista');
  const servicios = useCarga(listarServicios, []);
  const res = useCarga(() => buscarEnfermeros(f), [f.servicioId, f.especialidad, f.departamento, f.radioKm, f.disponible]);
  const nombresServicio = Object.fromEntries((servicios.datos ?? []).map((s) => [s.id, s.nombre]));

  return (
    <Pagina etiqueta="Enfermería a domicilio" titulo="Buscá un enfermero cerca tuyo">
      <Filtros f={f} setF={setF} servicios={servicios.datos ?? []} />
      <div className="barra-vista">
        <p className="sub" aria-live="polite">{res.datos ? `Encontramos ${res.datos.length} ${res.datos.length === 1 ? 'enfermero' : 'enfermeros'}, del más cercano al más lejano.` : ''}</p>
        <div className="seg" role="tablist" aria-label="Tipo de vista">
          <button role="tab" aria-selected={vista === 'lista'} onClick={() => setVista('lista')}>Lista</button>
          <button role="tab" aria-selected={vista === 'mapa'} onClick={() => setVista('mapa')}>Mapa</button>
        </div>
      </div>
      <Estado cargando={res.cargando} error={res.error} onReintentar={res.recargar}
        vacio={res.datos?.length === 0 && 'No hay enfermeros con esos filtros. Probá ampliar la distancia o sacar algún filtro.'} />
      {res.datos?.length > 0 && (vista === 'lista' ? <ListaEnfermeros lista={res.datos} nombresServicio={nombresServicio} /> : <MapaEnfermeros lista={res.datos} />)}
    </Pagina>
  );
}
