import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { registrarRequests } from './common/logging.middleware.js';

/** Configuración compartida entre la app real (main.ts) y los tests e2e. */
export function configurarApp(app: INestApplication) {
  // Log de cada request (método, ruta, status y tiempo)
  app.use(registrarRequests);

  // Cabeceras de seguridad HTTP (evita clickjacking, sniffing de tipos, etc.).
  // La política de contenido (CSP) queda apagada porque bloquearía GraphiQL (/graphql) y Swagger (/docs),
  // que cargan sus scripts desde internet.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  // Permite que el frontend (otro puerto) consuma la API
  app.enableCors();

  // Valida los DTOs: descarta campos que no estén declarados y convierte tipos.
  // stopAtFirstError: un solo mensaje por campo, que es el que muestra el front.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
}
