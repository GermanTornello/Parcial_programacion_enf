import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Rol, UsuarioToken } from '../auth/rol.enum.js';
import { CreateResenaInput } from './dto/create-resena.input.js';
import { UpdateResenaInput } from './dto/update-resena.input.js';
import { Reputacion } from './reputacion.type.js';
import { Resena } from './resena.schema.js';
import { SolicitudesClient } from './solicitudes.client.js';

const unDecimal = (n: number) => Math.round(n * 10) / 10;

@Injectable()
export class ResenasService {
  constructor(
    @InjectModel(Resena.name) private readonly resenaModel: Model<Resena>,
    private readonly solicitudesClient: SolicitudesClient,
  ) {}

  async create(paciente: UsuarioToken, input: CreateResenaInput, authorization: string) {
    // solicitudes-service confirma que la solicitud existe y que el paciente participa
    const solicitud = await this.solicitudesClient.obtener(input.solicitudId, authorization);
    if (solicitud.pacienteId !== paciente.id) {
      throw new ForbiddenException('Solo el paciente de la solicitud puede calificarla');
    }
    if (solicitud.estado !== 'REALIZADA') {
      throw new BadRequestException('Solo podés calificar un servicio que ya se realizó');
    }
    if (await this.resenaModel.exists({ solicitudId: input.solicitudId }).exec()) {
      throw new ConflictException('Ya calificaste este servicio');
    }
    try {
      return await this.resenaModel.create({
        solicitudId: input.solicitudId,
        pacienteId: paciente.id,
        pacienteNombre: paciente.nombre,
        enfermeroId: solicitud.enfermeroId,
        puntuacion: input.puntuacion,
        comentario: input.comentario?.trim() || undefined,
      });
    } catch (error) {
      // Por si llegan dos calificaciones a la vez: el índice único de solicitudId frena la segunda
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('Ya calificaste este servicio');
      }
      throw error;
    }
  }

  /** Reseñas de un enfermero, las más nuevas primero (público). */
  delEnfermero(enfermeroId: string) {
    return this.resenaModel.find({ enfermeroId }).sort({ createdAt: -1 }).exec();
  }

  delPaciente(paciente: UsuarioToken) {
    return this.resenaModel.find({ pacienteId: paciente.id }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const resena = isValidObjectId(id) ? await this.resenaModel.findById(id).exec() : null;
    if (!resena) {
      throw new NotFoundException('La reseña no existe');
    }
    return resena;
  }

  async update(usuario: UsuarioToken, id: string, input: UpdateResenaInput) {
    const resena = await this.findOne(id);
    if (resena.pacienteId !== usuario.id) {
      throw new ForbiddenException('Solo quien escribió la reseña puede editarla');
    }
    if (input.puntuacion !== undefined) resena.puntuacion = input.puntuacion;
    if (input.comentario !== undefined) resena.comentario = input.comentario.trim() || undefined;
    return resena.save();
  }

  async remove(usuario: UsuarioToken, id: string) {
    const resena = await this.findOne(id);
    if (resena.pacienteId !== usuario.id && usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo quien escribió la reseña o un administrador pueden borrarla');
    }
    await resena.deleteOne();
    return true;
  }

  async reputacion(enfermeroId: string): Promise<Reputacion> {
    const [resultado] = await this.reputaciones([enfermeroId]);
    return resultado;
  }

  /** Promedio y cantidad de varios enfermeros a la vez (para la lista de búsqueda), en el mismo orden. */
  async reputaciones(enfermeroIds: string[]): Promise<Reputacion[]> {
    const grupos = await this.resenaModel
      .aggregate<{ _id: string; promedio: number; cantidad: number }>([
        { $match: { enfermeroId: { $in: enfermeroIds } } },
        { $group: { _id: '$enfermeroId', promedio: { $avg: '$puntuacion' }, cantidad: { $sum: 1 } } },
      ])
      .exec();
    const porId = new Map(grupos.map((g) => [g._id, g]));
    return enfermeroIds.map((enfermeroId) => {
      const g = porId.get(enfermeroId);
      return { enfermeroId, promedio: g ? unDecimal(g.promedio) : 0, cantidad: g?.cantidad ?? 0 };
    });
  }
}
