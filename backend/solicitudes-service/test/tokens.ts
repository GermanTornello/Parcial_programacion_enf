import { JwtService } from '@nestjs/jwt';
import { Rol } from '../src/auth/rol.enum.js';

// Tokens de prueba firmados igual que los emite usuarios-service (mismo JWT_SECRET y mismo payload)
export const JWT_SECRET_TEST = 'secreto_de_los_tests';
const jwt = new JwtService({ secret: JWT_SECRET_TEST, signOptions: { expiresIn: '1h' } });

export const token = (id: string, rol: Rol, nombre = 'Usuario de prueba') =>
  jwt.sign({ sub: id, email: `${id}@test.com`, rol, nombre });

export const ADMIN = token('650000000000000000000a01', Rol.ADMIN, 'Admin Prueba');
export const PACIENTE = token('650000000000000000000b01', Rol.PACIENTE, 'Ana Pérez');
export const OTRO_PACIENTE = token('650000000000000000000b02', Rol.PACIENTE, 'Beto Gómez');
export const ENFERMERA = token('650000000000000000000c01', Rol.ENFERMERO, 'Laura Gómez');
export const OTRA_ENFERMERA = token('650000000000000000000c02', Rol.ENFERMERO, 'Marta Díaz');
