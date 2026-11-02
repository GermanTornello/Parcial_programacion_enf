// Punto único de acceso a datos para las pantallas.
// VITE_USE_MOCK=false usa el backend real; cualquier otro valor usa datos de prueba.
import * as mock from './mock.js';
import * as real from './real.js';

const origen = import.meta.env.VITE_USE_MOCK === 'false' ? real : mock;

export const {
  login, listarServicios, buscarEnfermeros, obtenerEnfermero, crearSolicitud, listarSolicitudes, obtenerSolicitud,
  aceptarSolicitud, rechazarSolicitud, cancelarSolicitud, realizarSolicitud, listarMensajes, enviarMensaje, misResenas, crearResena,
} = origen;
export const MODO_PRUEBA = origen === mock;
