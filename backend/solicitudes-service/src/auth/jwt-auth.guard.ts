import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { requestDe } from './contexto.js';

// "¿Tenés pulsera válida?": sin token o con un token inválido responde 401
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return requestDe(context);
  }

  handleRequest<T>(error: unknown, usuario: T): T {
    if (error || !usuario) {
      throw new UnauthorizedException('Tenés que iniciar sesión');
    }
    return usuario;
  }
}
