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
import { ServiciosService } from '../servicios/servicios.service.js';
import { CreateSolicitudDto } from './dto/create-solicitud.dto.js';
import { FiltroSolicitudesDto } from './dto/filtro-solicitudes.dto.js';
import { ESTADOS_ACTIVOS, EstadoSolicitud, validarTransicion } from './estados.js';
import { Solicitud, SolicitudDocument } from './solicitud.schema.js';
import { UsuariosClient } from './usuarios.client.js';

export const MAX_PENDIENTES_POR_PACIENTE = 5;
export const MESES_MAXIMOS_DE_ANTICIPACION = 6;

/** Fecha y hora del turno en hora de Argentina (UTC-3, sin horario de verano). */
const momentoDelTurno = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-03:00`);

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectModel(Solicitud.name) private readonly solicitudModel: Model<Solicitud>,
    private readonly serviciosService: ServiciosService,
    private readonly usuariosClient: UsuariosClient,
  ) {}

  async create(paciente: UsuarioToken, dto: CreateSolicitudDto) {
    // 1. Fecha: futura y a no más de 6 meses
    const turno = momentoDelTurno(dto.fecha, dto.hora);
    if (Number.isNaN(turno.getTime())) {
      throw new BadRequestException('La fecha del turno no es válida');
    }
    const ahora = new Date();
    if (turno <= ahora) {
      throw new BadRequestException('El turno tiene que ser en una fecha y hora futuras');
    }
    const limite = new Date(ahora);
    limite.setMonth(limite.getMonth() + MESES_MAXIMOS_DE_ANTICIPACION);
    if (turno > limite) {
      throw new BadRequestException(`El turno no puede ser a más de ${MESES_MAXIMOS_DE_ANTICIPACION} meses`);
    }

    // 2. Máximo de solicitudes pendientes del paciente
    const pendientes = await this.solicitudModel
      .countDocuments({ pacienteId: paciente.id, estado: EstadoSolicitud.PENDIENTE })
      .exec();
    if (pendientes >= MAX_PENDIENTES_POR_PACIENTE) {
      throw new ConflictException(
        `Ya tenés ${MAX_PENDIENTES_POR_PACIENTE} solicitudes pendientes. Esperá a que te respondan o cancelá alguna`,
      );
    }

    // 3. El servicio existe y está activo
    const servicio = await this.serviciosService.findOne(dto.servicioId);
    if (!servicio.activo) {
      throw new BadRequestException('Ese servicio no está disponible por el momento');
    }

    // 4. El enfermero está aprobado, disponible y ofrece ese servicio (pregunta a usuarios-service)
    const enfermero = await this.usuariosClient.buscarEnfermero(dto.enfermeroId);
    if (enfermero.estadoVerificacion !== 'APROBADO') {
      throw new BadRequestException('Ese enfermero todavía no tiene la matrícula aprobada');
    }
    if (!enfermero.disponible) {
      throw new BadRequestException('Ese enfermero no está tomando pedidos en este momento');
    }
    if (!enfermero.serviciosOfrecidos?.includes(dto.servicioId)) {
      throw new BadRequestException('Ese enfermero no ofrece el servicio elegido');
    }

    // 5. El enfermero no tiene otro turno activo en ese mismo horario
    const fecha = new Date(`${dto.fecha}T00:00:00.000Z`);
    const ocupado = await this.solicitudModel
      .exists({ enfermeroId: dto.enfermeroId, fecha, hora: dto.hora, estado: { $in: ESTADOS_ACTIVOS } })
      .exec();
    if (ocupado) {
      throw new ConflictException('El enfermero ya tiene un turno en ese horario. Elegí otro');
    }

    const creada = await this.solicitudModel.create({
      pacienteId: paciente.id,
      pacienteNombre: paciente.nombre,
      enfermeroId: dto.enfermeroId,
      enfermeroNombre: `${enfermero.nombre} ${enfermero.apellido}`,
      servicio: servicio._id,
      fecha,
      hora: dto.hora,
      direccionAtencion: dto.direccionAtencion,
      notas: dto.notas,
    });
    return creada.populate('servicio');
  }

  /** PACIENTE ve las suyas, ENFERMERO las que recibió y ADMIN todas. Las más nuevas primero. */
  findAll(usuario: UsuarioToken, filtros: FiltroSolicitudesDto) {
    const filtro: Record<string, unknown> = {};
    if (usuario.rol === Rol.PACIENTE) filtro.pacienteId = usuario.id;
    if (usuario.rol === Rol.ENFERMERO) filtro.enfermeroId = usuario.id;
    if (filtros.estado) filtro.estado = filtros.estado;
    if (filtros.desde || filtros.hasta) {
      filtro.fecha = {
        ...(filtros.desde && { $gte: new Date(`${filtros.desde}T00:00:00.000Z`) }),
        ...(filtros.hasta && { $lte: new Date(`${filtros.hasta}T00:00:00.000Z`) }),
      };
    }
    return this.solicitudModel.find(filtro).populate('servicio').sort({ createdAt: -1 }).exec();
  }

  /** Devuelve la solicitud si el usuario participa (o es ADMIN). */
  async findOne(usuario: UsuarioToken, id: string) {
    const solicitud = await this.buscar(id);
    const participa = solicitud.pacienteId === usuario.id || solicitud.enfermeroId === usuario.id;
    if (!participa && usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException('No podés ver una solicitud de la que no participás');
    }
    return solicitud;
  }

  async aceptar(enfermero: UsuarioToken, id: string) {
    const solicitud = await this.delEnfermero(enfermero, id);
    return this.cambiarEstado(solicitud, EstadoSolicitud.ACEPTADA);
  }

  async rechazar(enfermero: UsuarioToken, id: string, motivo?: string) {
    const solicitud = await this.delEnfermero(enfermero, id);
    solicitud.motivoRechazo = motivo?.trim() || undefined;
    return this.cambiarEstado(solicitud, EstadoSolicitud.RECHAZADA);
  }

  async realizar(enfermero: UsuarioToken, id: string) {
    const solicitud = await this.delEnfermero(enfermero, id);
    return this.cambiarEstado(solicitud, EstadoSolicitud.REALIZADA);
  }

  async cancelar(usuario: UsuarioToken, id: string, motivo?: string) {
    const solicitud = await this.buscar(id);
    const esPaciente = solicitud.pacienteId === usuario.id;
    const esEnfermero = solicitud.enfermeroId === usuario.id;
    if (!esPaciente && !esEnfermero) {
      throw new ForbiddenException('Solo el paciente o el enfermero de la solicitud pueden cancelarla');
    }
    if (esEnfermero && !motivo?.trim()) {
      throw new BadRequestException('Tenés que indicar el motivo de la cancelación');
    }
    solicitud.canceladaPor = esPaciente ? Rol.PACIENTE : Rol.ENFERMERO;
    solicitud.motivoCancelacion = motivo?.trim() || undefined;
    return this.cambiarEstado(solicitud, EstadoSolicitud.CANCELADA);
  }

  // ----- auxiliares -----

  async buscar(id: string): Promise<SolicitudDocument> {
    const solicitud = isValidObjectId(id) ? await this.solicitudModel.findById(id).populate('servicio').exec() : null;
    if (!solicitud) {
      throw new NotFoundException('La solicitud no existe');
    }
    return solicitud;
  }

  private async delEnfermero(enfermero: UsuarioToken, id: string) {
    const solicitud = await this.buscar(id);
    if (solicitud.enfermeroId !== enfermero.id) {
      throw new ForbiddenException('Solo el enfermero de la solicitud puede hacer esto');
    }
    return solicitud;
  }

  private async cambiarEstado(solicitud: SolicitudDocument, nuevo: EstadoSolicitud) {
    validarTransicion(solicitud.estado, nuevo);
    solicitud.estado = nuevo;
    return solicitud.save();
  }
}
