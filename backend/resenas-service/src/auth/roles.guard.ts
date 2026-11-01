import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { requestDe } from './contexto.js';
import { Rol, UsuarioToken } from './rol.enum.js';
import { ROLES_KEY } from './roles.decorator.js';

// "¿Tu pulsera es del color correcto?": si el rol no está permitido responde 403
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permitidos || permitidos.length === 0) {
      return true;
    }
    const usuario = requestDe(context).user as UsuarioToken | undefined;
    if (!usuario || !permitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tenés permiso para hacer esto');
    }
    return true;
  }
}
