import { BadRequestException } from '@nestjs/common';
import { EstadoSolicitud as E, validarTransicion } from './estados.js';

describe('Transiciones de estado de una solicitud', () => {
  it('no permite pasar de PENDIENTE a REALIZADA (BadRequestException)', () => {
    expect(() => validarTransicion(E.PENDIENTE, E.REALIZADA)).toThrow(BadRequestException);
    expect(() => validarTransicion(E.PENDIENTE, E.REALIZADA)).toThrow(
      'No se puede pasar una solicitud de PENDIENTE a REALIZADA',
    );
  });

  it.each([
    [E.PENDIENTE, E.ACEPTADA],
    [E.PENDIENTE, E.RECHAZADA],
    [E.PENDIENTE, E.CANCELADA],
    [E.ACEPTADA, E.CANCELADA],
    [E.ACEPTADA, E.REALIZADA],
  ])('permite pasar de %s a %s', (actual, nuevo) => {
    expect(() => validarTransicion(actual, nuevo)).not.toThrow();
  });

  it.each([E.RECHAZADA, E.CANCELADA, E.REALIZADA])('una solicitud %s ya no cambia de estado', (cerrada) => {
    for (const nuevo of Object.values(E)) {
      expect(() => validarTransicion(cerrada, nuevo)).toThrow(BadRequestException);
    }
  });
});
