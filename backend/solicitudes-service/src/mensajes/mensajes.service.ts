import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsuarioToken } from '../auth/rol.enum.js';
import { ESTADOS_CON_CHAT } from '../solicitudes/estados.js';
import { SolicitudesService } from '../solicitudes/solicitudes.service.js';
import { CrearMensajeDto } from './dto/crear-mensaje.dto.js';
import { Mensaje } from './mensaje.schema.js';

@Injectable()
export class MensajesService {
  constructor(
    @InjectModel(Mensaje.name) private readonly mensajeModel: Model<Mensaje>,
    private readonly solicitudesService: SolicitudesService,
  ) {}

  /** Los mensajes de la solicitud, del más viejo al más nuevo. Leer se puede siempre. */
  async listar(usuario: UsuarioToken, solicitudId: string) {
    const solicitud = await this.deParticipante(usuario, solicitudId);
    return this.mensajeModel.find({ solicitud: solicitud._id }).sort({ createdAt: 1 }).exec();
  }

  /** Escribir solo se puede mientras la solicitud está PENDIENTE o ACEPTADA. */
  async enviar(usuario: UsuarioToken, solicitudId: string, dto: CrearMensajeDto) {
    const solicitud = await this.deParticipante(usuario, solicitudId);
    if (!ESTADOS_CON_CHAT.includes(solicitud.estado)) {
      throw new BadRequestException(
        `El chat está cerrado porque la solicitud está ${solicitud.estado}. Podés leer los mensajes, pero no enviar nuevos`,
      );
    }
    return this.mensajeModel.create({
      solicitud: solicitud._id,
      autorId: usuario.id,
      autorNombre: usuario.nombre,
      texto: dto.texto,
    });
  }

  /** Solo el paciente y el enfermero de la solicitud acceden al chat (ni siquiera el ADMIN). */
  private async deParticipante(usuario: UsuarioToken, solicitudId: string) {
    const solicitud = await this.solicitudesService.buscar(solicitudId);
    if (solicitud.pacienteId !== usuario.id && solicitud.enfermeroId !== usuario.id) {
      throw new ForbiddenException('Solo el paciente y el enfermero de la solicitud pueden usar este chat');
    }
    return solicitud;
  }
}
