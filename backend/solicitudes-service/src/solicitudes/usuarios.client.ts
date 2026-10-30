import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Lo que necesitamos del perfil público del enfermero (GET /enfermeros/:id de usuarios-service). */
export interface EnfermeroPublico {
  id: string;
  nombre: string;
  apellido: string;
  estadoVerificacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  disponible: boolean;
  serviciosOfrecidos: string[];
}

// Comunicación entre microservicios: solicitudes-service le pregunta a usuarios-service por HTTP
@Injectable()
export class UsuariosClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('USUARIOS_URL', 'http://localhost:3001');
  }

  async buscarEnfermero(id: string): Promise<EnfermeroPublico> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.baseUrl}/enfermeros/${id}`, { signal: AbortSignal.timeout(5000) });
    } catch {
      throw new ServiceUnavailableException('No pudimos verificar al enfermero. Probá de nuevo en unos minutos');
    }
    if (respuesta.status === 404) {
      throw new NotFoundException('El enfermero no existe');
    }
    if (!respuesta.ok) {
      throw new ServiceUnavailableException('No pudimos verificar al enfermero. Probá de nuevo en unos minutos');
    }
    return (await respuesta.json()) as EnfermeroPublico;
  }
}
