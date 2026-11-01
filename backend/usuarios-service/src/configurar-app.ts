import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { registrarRequests } from './common/logging.middleware.js';

/** Configuración compartida entre la app real (main.ts) y los tests e2e. */
export function configurarApp(app: INestApplication) {
  // Log de cada request (método, ruta, status y tiempo)
  app.use(registrarRequests);

  // Cabeceras de seguridad HTTP (evita clickjacking, sniffing de tipos, etc.)
  app.use(helmet());

  // Permite que el frontend (otro puerto) consuma la API
  app.enableCors();

  // Valida los DTOs: descarta campos que no estén declarados y convierte tipos.
  // stopAtFirstError: un solo mensaje por campo, que es el que muestra el front.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
}
