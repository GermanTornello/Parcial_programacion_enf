import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/**
 * Loguea cada request: método, ruta, status y cuánto tardó.
 * Es un middleware (y no un interceptor) para que también queden registradas las respuestas
 * que cortan los guards antes de llegar al controlador: 401 sin token, 403 sin permiso y
 * 429 por demasiados intentos. 2xx/3xx → log · 4xx → warn · 5xx → error.
 * Los errores 500 además los loguea Nest con el stack completo.
 */
export function registrarRequests(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const inicio = Date.now();
  response.on('finish', () => {
    const linea = `${request.method} ${request.originalUrl} ${response.statusCode} - ${Date.now() - inicio}ms`;
    if (response.statusCode >= 500) {
      logger.error(linea);
    } else if (response.statusCode >= 400) {
      logger.warn(linea);
    } else {
      logger.log(linea);
    }
  });
  next();
}
