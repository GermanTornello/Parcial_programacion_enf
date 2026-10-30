import { SetMetadata } from '@nestjs/common';
import { Rol } from './rol.enum.js';

export const ROLES_KEY = 'roles';

/** Indica qué roles pueden usar una ruta. Va siempre junto con JwtAuthGuard y RolesGuard. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
