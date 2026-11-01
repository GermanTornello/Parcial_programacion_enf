import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { esDuplicado } from '../common/mongo.js';
import {
  Enfermero,
  EstadoVerificacion,
  Paciente,
  Usuario,
  UsuarioEnfermero,
  UsuarioPaciente,
} from '../usuarios/usuario.schema.js';
import { LoginDto } from './dto/login.dto.js';
import {
  RegistroEnfermeroDto,
  RegistroPacienteDto,
} from './dto/registro.dto.js';
import { PayloadToken } from './rol.enum.js';

export const RONDAS_BCRYPT = 10;

// Se compara contra este hash cuando el email no existe, así el login tarda lo mismo
// y no delata qué emails están registrados.
const HASH_DE_RELLENO =
  '$2b$10$E0YF8X1j91F/Cw1mgtUTXeaAaEBpD9o6zoCiXiLyRPY0IWGOixdb6';

const MENSAJES_DUPLICADO: Record<string, string> = {
  email: 'El email ya está registrado',
  dni: 'Ya hay una cuenta con ese DNI',
  matricula: 'Esa matrícula ya está registrada',
};

export interface RespuestaLogin {
  access_token: string;
  user: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(Paciente.name)
    private readonly pacienteModel: Model<UsuarioPaciente>,
    @InjectModel(Enfermero.name)
    private readonly enfermeroModel: Model<UsuarioEnfermero>,
    private readonly jwt: JwtService,
  ) {}

  async registrarPaciente(dto: RegistroPacienteDto) {
    const email = dto.email.toLowerCase().trim();
    await this.verificarLibre(this.usuarioModel, { email }, 'email');
    await this.verificarLibre(this.pacienteModel, { dni: dto.dni }, 'dni');

    const { password: textoPlano, ...datos } = dto;
    const password = await bcrypt.hash(textoPlano, RONDAS_BCRYPT);
    return this.guardar(() =>
      this.pacienteModel.create({ ...datos, email, password }),
    );
  }

  async registrarEnfermero(dto: RegistroEnfermeroDto) {
    const email = dto.email.toLowerCase().trim();
    await this.verificarLibre(this.usuarioModel, { email }, 'email');
    await this.verificarLibre(
      this.enfermeroModel,
      { matricula: dto.matricula.trim() },
      'matricula',
    );

    const password = await bcrypt.hash(dto.password, RONDAS_BCRYPT);
    const { ubicacion, serviciosOfrecidos = [], ...resto } = dto;
    return this.guardar(() =>
      this.enfermeroModel.create({
        ...resto,
        email,
        password,
        serviciosOfrecidos: [...new Set(serviciosOfrecidos)],
        // GeoJSON guarda [lng, lat]
        ubicacion: {
          type: 'Point',
          coordinates: [ubicacion.lng, ubicacion.lat],
        },
        // Nadie aparece en la búsqueda hasta que el admin valide la matrícula
        estadoVerificacion: EstadoVerificacion.PENDIENTE,
      }),
    );
  }

  async login({ email, password }: LoginDto): Promise<RespuestaLogin> {
    const usuario = await this.usuarioModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .exec();
    const coincide = await bcrypt.compare(
      password,
      usuario?.password ?? HASH_DE_RELLENO,
    );
    if (!usuario || !coincide) {
      throw new UnauthorizedException(
        'El email o la contraseña no son correctos',
      );
    }

    const payload: PayloadToken = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: `${usuario.nombre} ${usuario.apellido}`,
    };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  private async verificarLibre<T>(
    modelo: Model<T>,
    filtro: Record<string, string>,
    campo: string,
  ) {
    if (await modelo.exists(filtro).exec()) {
      throw new ConflictException(MENSAJES_DUPLICADO[campo]);
    }
  }

  /** Si dos registros llegan a la vez, el índice único de MongoDB frena al segundo: se responde 409. */
  private async guardar(crear: () => Promise<{ toJSON(): unknown }>) {
    try {
      return (await crear()).toJSON();
    } catch (error) {
      if (esDuplicado(error)) {
        const campo =
          Object.keys((error as { keyPattern?: object }).keyPattern ?? {})[0] ??
          'email';
        throw new ConflictException(
          MENSAJES_DUPLICADO[campo] ?? 'Ese dato ya está registrado',
        );
      }
      throw error;
    }
  }
}
