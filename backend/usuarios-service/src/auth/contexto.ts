import { ExecutionContext } from '@nestjs/common';

/**
 * Devuelve el request HTTP. usuarios-service no tiene GraphQL, así que es solo REST
 * (en solicitudes y reseñas esta función también contempla GqlExecutionContext).
 */
export function requestDe(context: ExecutionContext) {
  return context.switchToHttp().getRequest();
}
