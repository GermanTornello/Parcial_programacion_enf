import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Lo que necesitamos de una solicitud (GET /solicitudes/:id de solicitudes-service). */
export interface SolicitudResumen {
  id: string;
  pacienteId: string;
  enfermeroId: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'REALIZADA';
}

// Comunicación entre microservicios: resenas-service le pregunta a solicitudes-service por HTTP,
// reenviando el token del usuario para que solicitudes-service controle quién puede verla.
@Injectable()
export class SolicitudesClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('SOLICITUDES_URL', 'http://localhost:3002');
  }

  async obtener(solicitudId: string, authorization: string): Promise<SolicitudResumen> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.baseUrl}/solicitudes/${encodeURIComponent(solicitudId)}`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('No pudimos verificar la solicitud. Probá de nuevo en unos minutos');
    }
    if (respuesta.status === 404) {
      throw new NotFoundException('La solicitud no existe');
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new ForbiddenException('Solo el paciente de la solicitud puede calificarla');
    }
    if (!respuesta.ok) {
      throw new ServiceUnavailableException('No pudimos verificar la solicitud. Probá de nuevo en unos minutos');
    }
    return (await respuesta.json()) as SolicitudResumen;
  }
}
