import { BadRequestException } from '@nestjs/common';

export enum EstadoSolicitud {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
  CANCELADA = 'CANCELADA',
  REALIZADA = 'REALIZADA',
}

/** Desde cada estado, a cuáles se puede pasar (contrato, sección 2.6). */
const TRANSICIONES: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  [EstadoSolicitud.PENDIENTE]: [EstadoSolicitud.ACEPTADA, EstadoSolicitud.RECHAZADA, EstadoSolicitud.CANCELADA],
  [EstadoSolicitud.ACEPTADA]: [EstadoSolicitud.CANCELADA, EstadoSolicitud.REALIZADA],
  [EstadoSolicitud.RECHAZADA]: [],
  [EstadoSolicitud.CANCELADA]: [],
  [EstadoSolicitud.REALIZADA]: [],
};

export function validarTransicion(actual: EstadoSolicitud, nuevo: EstadoSolicitud) {
  if (!TRANSICIONES[actual].includes(nuevo)) {
    throw new BadRequestException(`No se puede pasar una solicitud de ${actual} a ${nuevo}`);
  }
}

/** Estados en los que el chat acepta mensajes nuevos. */
export const ESTADOS_CON_CHAT = [EstadoSolicitud.PENDIENTE, EstadoSolicitud.ACEPTADA];

/** Estados que ocupan el horario del enfermero. */
export const ESTADOS_ACTIVOS = [EstadoSolicitud.PENDIENTE, EstadoSolicitud.ACEPTADA];
