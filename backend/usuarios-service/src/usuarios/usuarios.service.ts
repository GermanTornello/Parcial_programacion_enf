import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Rol, UsuarioToken } from '../auth/rol.enum.js';
import { escaparRegex, esDuplicado, esIdValido } from '../common/mongo.js';
import { MENDOZA_CAPITAL } from './departamentos.js';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';
import {
  BuscarEnfermerosDto,
  FiltroUsuariosAdminDto,
  VerificacionDto,
} from './dto/consultas.dto.js';
import {
  Admin,
  Enfermero,
  EstadoVerificacion,
  Paciente,
  Usuario,
  UsuarioAdmin,
  UsuarioEnfermero,
  UsuarioPaciente,
} from './usuario.schema.js';

const COMUNES = ['nombre', 'apellido', 'telefono', 'direccion'] as const;

/** Tope de resultados de la búsqueda pública (los más cercanos). */
const MAX_RESULTADOS = 100;

/** Qué campos del perfil puede editar cada rol. */
const EDITABLES: Record<Rol, readonly (keyof ActualizarPerfilDto)[]> = {
  [Rol.PACIENTE]: [...COMUNES, 'fechaNacimiento', 'obraSocial', 'datosMedicos'],
  [Rol.ENFERMERO]: [
    ...COMUNES,
    'matricula',
    'especialidades',
    'departamento',
    'aniosExperiencia',
    'tarifaHora',
    'serviciosOfrecidos',
    'ubicacion',
    'radioCoberturaKm',
    'disponible',
    'disponibilidad',
    'descripcion',
  ],
  [Rol.ADMIN]: [...COMUNES],
};

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(Paciente.name)
    private readonly pacienteModel: Model<UsuarioPaciente>,
    @InjectModel(Enfermero.name)
    private readonly enfermeroModel: Model<UsuarioEnfermero>,
    @InjectModel(Admin.name) private readonly adminModel: Model<UsuarioAdmin>,
  ) {}

  async perfil(id: string) {
    const usuario = esIdValido(id)
      ? await this.usuarioModel.findById(id).exec()
      : null;
    if (!usuario) {
      throw new NotFoundException('Tu cuenta ya no existe');
    }
    return usuario.toJSON();
  }

  async actualizarPerfil(usuario: UsuarioToken, dto: ActualizarPerfilDto) {
    const documento = await this.modeloDe(usuario.rol)
      .findById(usuario.id)
      .exec();
    if (!documento) {
      throw new NotFoundException('Tu cuenta ya no existe');
    }

    const cambios: Record<string, unknown> = {};
    for (const campo of EDITABLES[usuario.rol]) {
      if (dto[campo] === null) {
        // Solo llega null en los campos @Borrable: se quita el dato
        cambios[campo] = undefined;
      } else if (dto[campo] !== undefined) {
        cambios[campo] = dto[campo];
      }
    }

    if (dto.serviciosOfrecidos && 'serviciosOfrecidos' in cambios) {
      // Relación muchos-a-muchos: cada servicio queda una sola vez aunque lo manden repetido
      cambios.serviciosOfrecidos = [...new Set(dto.serviciosOfrecidos)];
    }
    if (dto.especialidades && 'especialidades' in cambios) {
      cambios.especialidades = [
        ...new Set(dto.especialidades.map((e) => e.trim()).filter(Boolean)),
      ];
    }
    if (dto.ubicacion && 'ubicacion' in cambios) {
      cambios.ubicacion = {
        type: 'Point',
        coordinates: [dto.ubicacion.lng, dto.ubicacion.lat],
      };
    }
    if (dto.disponibilidad && 'disponibilidad' in cambios) {
      if (dto.disponibilidad.some((franja) => franja.desde >= franja.hasta)) {
        throw new BadRequestException(
          'En cada horario, "desde" tiene que ser antes que "hasta"',
        );
      }
    }
    if (typeof cambios.matricula === 'string') {
      const matricula = cambios.matricula.trim();
      const actual = (documento as unknown as UsuarioEnfermero).matricula;
      if (matricula !== actual) {
        if (
          await this.enfermeroModel
            .exists({ matricula, _id: { $ne: usuario.id } })
            .exec()
        ) {
          throw new ConflictException('Esa matrícula ya está registrada');
        }
        // Una matrícula nueva la tiene que volver a revisar el admin
        cambios.estadoVerificacion = EstadoVerificacion.PENDIENTE;
        cambios.motivoRechazo = undefined;
      }
      cambios.matricula = matricula;
    }

    documento.set(cambios);
    try {
      await documento.save();
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException('Esa matrícula ya está registrada');
      }
      throw error;
    }
    return documento.toJSON();
  }

  /** Perfil público: lo usan el front y solicitudes-service (GET /enfermeros/:id). */
  async enfermeroPublico(id: string) {
    const enfermero = esIdValido(id)
      ? await this.enfermeroModel.findById(id).exec()
      : null;
    if (!enfermero) {
      throw new NotFoundException('El enfermero no existe');
    }
    const {
      email: _email,
      direccion: _direccion,
      motivoRechazo: _motivo,
      ...publico
    } = enfermero.toJSON() as unknown as Record<string, unknown>;
    return publico;
  }

  /** Enfermeros APROBADOS cerca de un punto, ordenados por distancia ($geoNear). */
  async buscarEnfermeros(consulta: BuscarEnfermerosDto) {
    const lat = consulta.lat ?? MENDOZA_CAPITAL.lat;
    const lng = consulta.lng ?? MENDOZA_CAPITAL.lng;
    const radioKm = consulta.radioKm ?? 10;

    const filtro: Record<string, unknown> = {
      rol: Rol.ENFERMERO,
      estadoVerificacion: EstadoVerificacion.APROBADO,
    };
    if (consulta.especialidad?.trim()) {
      filtro.especialidades = {
        $regex: `^${escaparRegex(consulta.especialidad.trim())}$`,
        $options: 'i',
      };
    }
    if (consulta.servicioId) filtro.serviciosOfrecidos = consulta.servicioId;
    if (consulta.departamento) filtro.departamento = consulta.departamento;
    if (consulta.disponible !== undefined)
      filtro.disponible = consulta.disponible;

    const pipeline: PipelineStage[] = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distancia',
          maxDistance: radioKm * 1000,
          spherical: true,
          query: filtro,
        },
      },
      { $limit: MAX_RESULTADOS },
      // Datos privados que no van en una búsqueda pública (el domicilio del enfermero tampoco)
      {
        $project: {
          password: 0,
          email: 0,
          direccion: 0,
          motivoRechazo: 0,
          __v: 0,
        },
      },
    ];
    const resultados = await this.usuarioModel
      .aggregate<Record<string, unknown>>(pipeline)
      .exec();

    return resultados.map(({ _id, distancia, ...enfermero }) => ({
      id: String(_id),
      ...enfermero,
      distanciaKm: Math.round(Number(distancia) / 100) / 10,
    }));
  }

  async enfermerosPorEstado(estado?: EstadoVerificacion) {
    const enfermeros = await this.enfermeroModel
      .find(estado ? { estadoVerificacion: estado } : {})
      .sort({ createdAt: 1 })
      .exec();
    return enfermeros.map((enfermero) => enfermero.toJSON());
  }

  async verificarMatricula(id: string, { estado, motivo }: VerificacionDto) {
    const enfermero = esIdValido(id)
      ? await this.enfermeroModel.findById(id).exec()
      : null;
    if (!enfermero) {
      throw new NotFoundException('El enfermero no existe');
    }
    enfermero.estadoVerificacion = estado;
    enfermero.motivoRechazo =
      estado === EstadoVerificacion.RECHAZADO ? motivo?.trim() : undefined;
    await enfermero.save();
    return enfermero.toJSON();
  }

  async listarUsuarios({ rol, search }: FiltroUsuariosAdminDto) {
    const filtro: Record<string, unknown> = {};
    if (rol) filtro.rol = rol;
    // "ana pérez" encuentra a Ana Pérez: cada palabra tiene que aparecer en nombre, apellido o email
    const palabras = search?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (palabras.length) {
      filtro.$and = palabras.map((palabra) => {
        const regex = { $regex: escaparRegex(palabra), $options: 'i' };
        return {
          $or: [{ nombre: regex }, { apellido: regex }, { email: regex }],
        };
      });
    }
    const usuarios = await this.usuarioModel
      .find(filtro)
      .sort({ apellido: 1, nombre: 1 })
      .limit(200)
      .exec();
    return usuarios.map((usuario) => usuario.toJSON());
  }

  async borrarUsuario(id: string, adminId: string) {
    if (id === adminId) {
      throw new BadRequestException('No podés borrar tu propia cuenta');
    }
    const borrado = esIdValido(id)
      ? await this.usuarioModel.findByIdAndDelete(id).exec()
      : null;
    if (!borrado) {
      throw new NotFoundException('El usuario no existe');
    }
  }

  private modeloDe(rol: Rol): Model<Usuario> {
    const modelos: Record<Rol, Model<Usuario>> = {
      [Rol.PACIENTE]: this.pacienteModel as unknown as Model<Usuario>,
      [Rol.ENFERMERO]: this.enfermeroModel as unknown as Model<Usuario>,
      [Rol.ADMIN]: this.adminModel as unknown as Model<Usuario>,
    };
    return modelos[rol];
  }
}
