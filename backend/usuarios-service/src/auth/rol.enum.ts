export enum Rol {
  PACIENTE = 'PACIENTE',
  ENFERMERO = 'ENFERMERO',
  ADMIN = 'ADMIN',
}

/** Lo que viaja dentro del token que emite usuarios-service (contrato, sección 2.3). */
export interface PayloadToken {
  sub: string;
  email: string;
  rol: Rol;
  nombre: string;
}

/** El usuario logueado, tal como lo ven los controladores. */
export interface UsuarioToken {
  id: string;
  email: string;
  rol: Rol;
  nombre: string;
}
