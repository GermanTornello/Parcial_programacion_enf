import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { RONDAS_BCRYPT } from '../auth/auth.service.js';
import { Rol } from '../auth/rol.enum.js';
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

// Ids fijos del catálogo que carga docker/mongo-init (contrato, sección 2.8)
const CURACIONES = '650000000000000000000001';
const INYECCIONES = '650000000000000000000002';
const SIGNOS_VITALES = '650000000000000000000003';
const HIGIENE = '650000000000000000000004';
const ADULTOS_MAYORES = '650000000000000000000005';
const INTENSIVOS = '650000000000000000000006';

const LUNES_A_VIERNES = [1, 2, 3, 4, 5].map((dia) => ({
  dia,
  desde: '08:00',
  hasta: '16:00',
}));

const ENFERMEROS_DE_PRUEBA = [
  {
    email: 'enfermera@enfered.com',
    password: 'Enfermera123!',
    nombre: 'Laura',
    apellido: 'Gómez',
    matricula: 'MP-10001',
    departamento: 'Capital',
    coordenadas: [-68.8458, -32.8895],
    especialidades: ['Geriatría', 'Heridas'],
    serviciosOfrecidos: [CURACIONES, INYECCIONES, SIGNOS_VITALES],
    aniosExperiencia: 8,
    tarifaHora: 9000,
  },
  {
    email: 'enfermero1@enfered.com',
    password: 'Enfermero123!',
    nombre: 'Martín',
    apellido: 'Sosa',
    matricula: 'MP-10002',
    departamento: 'Godoy Cruz',
    coordenadas: [-68.844, -32.927],
    especialidades: ['Pediatría'],
    serviciosOfrecidos: [INYECCIONES, SIGNOS_VITALES],
    aniosExperiencia: 4,
    tarifaHora: 7500,
  },
  {
    email: 'enfermero2@enfered.com',
    password: 'Enfermero123!',
    nombre: 'Carla',
    apellido: 'Funes',
    matricula: 'MP-10003',
    departamento: 'Guaymallén',
    coordenadas: [-68.788, -32.905],
    especialidades: ['Geriatría'],
    serviciosOfrecidos: [HIGIENE, ADULTOS_MAYORES],
    aniosExperiencia: 12,
    tarifaHora: 10000,
  },
  {
    email: 'enfermero3@enfered.com',
    password: 'Enfermero123!',
    nombre: 'Diego',
    apellido: 'Ortiz',
    matricula: 'MP-10004',
    departamento: 'Las Heras',
    coordenadas: [-68.828, -32.85],
    especialidades: ['Heridas', 'Cuidados intensivos'],
    serviciosOfrecidos: [CURACIONES, INTENSIVOS],
    aniosExperiencia: 6,
    tarifaHora: 12000,
  },
  {
    email: 'enfermero4@enfered.com',
    password: 'Enfermero123!',
    nombre: 'Sofía',
    apellido: 'Quiroga',
    matricula: 'MP-10005',
    departamento: 'Luján de Cuyo',
    coordenadas: [-68.879, -33.036],
    especialidades: ['Pediatría', 'Geriatría'],
    serviciosOfrecidos: [INYECCIONES, HIGIENE, ADULTOS_MAYORES],
    aniosExperiencia: 3,
    tarifaHora: 7000,
  },
];

/**
 * Al arrancar crea el admin, el paciente y los enfermeros de prueba si todavía no existen
 * (contrato, sección 2.8). Se puede apagar con SEED_USUARIOS=false.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly config: ConfigService,
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
    @InjectModel(Paciente.name)
    private readonly pacienteModel: Model<UsuarioPaciente>,
    @InjectModel(Enfermero.name)
    private readonly enfermeroModel: Model<UsuarioEnfermero>,
    @InjectModel(Admin.name) private readonly adminModel: Model<UsuarioAdmin>,
  ) {}

  async onApplicationBootstrap() {
    // Espera a que estén los índices (únicos y 2dsphere) antes de cargar y buscar
    await Promise.all([
      this.usuarioModel.init(),
      this.pacienteModel.init(),
      this.enfermeroModel.init(),
      this.adminModel.init(),
    ]);
    if (this.config.get<string>('SEED_USUARIOS') === 'false') {
      this.logger.log('SEED_USUARIOS=false: no se crean usuarios de prueba');
      return;
    }

    const creados: string[] = [];
    const crearSiFalta = async (
      email: string,
      crear: () => Promise<unknown>,
    ) => {
      if (!(await this.usuarioModel.exists({ email }).exec())) {
        await crear();
        creados.push(email);
      }
    };
    const hash = (password: string) => bcrypt.hash(password, RONDAS_BCRYPT);

    const adminEmail = this.config
      .get<string>('ADMIN_EMAIL', 'admin@enfered.com')
      .toLowerCase();
    const cuentaDelAdmin = await this.usuarioModel
      .findOne({ email: adminEmail })
      .exec();
    if (cuentaDelAdmin && cuentaDelAdmin.rol !== Rol.ADMIN) {
      // Sin esto el servicio arrancaría sin ningún admin y nadie podría validar matrículas
      this.logger.warn(
        `ADMIN_EMAIL (${adminEmail}) ya lo usa una cuenta ${cuentaDelAdmin.rol}: no se creó el admin`,
      );
    }
    await crearSiFalta(adminEmail, async () =>
      this.adminModel.create({
        nombre: 'Admin',
        apellido: 'Enfered',
        email: adminEmail,
        password: await hash(
          this.config.get<string>('ADMIN_PASSWORD', 'Admin123!'),
        ),
        telefono: '2614000000',
        direccion: 'Peltier 351, Mendoza',
      }),
    );

    await crearSiFalta('paciente@enfered.com', async () =>
      this.pacienteModel.create({
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'paciente@enfered.com',
        password: await hash('Paciente123!'),
        telefono: '2615551234',
        direccion: 'San Martín 1234, Mendoza',
        dni: '30111222',
        obraSocial: 'OSEP',
      }),
    );

    for (const {
      coordenadas,
      password,
      ...enfermero
    } of ENFERMEROS_DE_PRUEBA) {
      await crearSiFalta(enfermero.email, async () =>
        this.enfermeroModel.create({
          ...enfermero,
          password: await hash(password),
          telefono: '2615550000',
          direccion: `${enfermero.departamento}, Mendoza`,
          ubicacion: { type: 'Point', coordinates: coordenadas },
          radioCoberturaKm: 15,
          disponible: true,
          disponibilidad: LUNES_A_VIERNES,
          descripcion: `Enfermero/a con ${enfermero.aniosExperiencia} años de experiencia en ${enfermero.departamento}.`,
          estadoVerificacion: EstadoVerificacion.APROBADO,
        }),
      );
    }

    if (creados.length) {
      this.logger.log(`Usuarios de prueba creados: ${creados.join(', ')}`);
    }
  }
}
