import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { Enfermero, Paciente, Usuario } from '../usuarios/usuario.schema.js';
import { AuthService } from './auth.service.js';
import { Rol } from './rol.enum.js';

// Las consultas de Mongoose terminan en .exec(): el mock devuelve un objeto con ese método
const consulta = (valor: unknown) => ({
  exec: vi.fn().mockResolvedValue(valor),
});

describe('AuthService', () => {
  let service: AuthService;
  const jwt = new JwtService({ secret: 'secreto_de_los_tests' });
  const usuarioModel = { exists: vi.fn(), findOne: vi.fn() };
  const pacienteModel = { exists: vi.fn(), create: vi.fn() };
  const enfermeroModel = { exists: vi.fn(), create: vi.fn() };

  const paciente = {
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'Ana@Correo.com',
    password: 'Secreta123',
    telefono: '2615551234',
    direccion: 'San Martín 1234',
    dni: '30111222',
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: getModelToken(Usuario.name), useValue: usuarioModel },
        { provide: getModelToken(Paciente.name), useValue: pacienteModel },
        { provide: getModelToken(Enfermero.name), useValue: enfermeroModel },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('registra al paciente con la contraseña hasheada y el email en minúsculas', async () => {
    usuarioModel.exists.mockReturnValue(consulta(null));
    pacienteModel.exists.mockReturnValue(consulta(null));
    pacienteModel.create.mockImplementation(async (datos) => ({
      toJSON: () => ({ id: '1', ...datos }),
    }));

    await service.registrarPaciente(paciente);

    const guardado = pacienteModel.create.mock.calls[0][0];
    expect(guardado.email).toBe('ana@correo.com');
    expect(guardado.password).not.toBe('Secreta123');
    expect(await bcrypt.compare('Secreta123', guardado.password)).toBe(true);
  });

  it('rechaza un email ya registrado con ConflictException y no crea nada', async () => {
    usuarioModel.exists.mockReturnValue(consulta({ _id: 'existente' }));

    await expect(service.registrarPaciente(paciente)).rejects.toThrow(
      new ConflictException('El email ya está registrado'),
    );
    expect(usuarioModel.exists).toHaveBeenCalledWith({
      email: 'ana@correo.com',
    });
    expect(pacienteModel.create).not.toHaveBeenCalled();
  });

  it('rechaza un DNI ya registrado con ConflictException', async () => {
    usuarioModel.exists.mockReturnValue(consulta(null));
    pacienteModel.exists.mockReturnValue(consulta({ _id: 'existente' }));

    await expect(service.registrarPaciente(paciente)).rejects.toThrow(
      new ConflictException('Ya hay una cuenta con ese DNI'),
    );
  });

  it('convierte el error de índice único de MongoDB (11000) en ConflictException', async () => {
    usuarioModel.exists.mockReturnValue(consulta(null));
    enfermeroModel.exists.mockReturnValue(consulta(null));
    enfermeroModel.create.mockRejectedValue(
      Object.assign(new Error('E11000 duplicate key'), {
        code: 11000,
        keyPattern: { matricula: 1 },
      }),
    );

    await expect(
      service.registrarEnfermero({
        ...paciente,
        matricula: 'MP-1',
        departamento: 'Capital',
        ubicacion: { lat: -32.88, lng: -68.84 },
      }),
    ).rejects.toThrow(
      new ConflictException('Esa matrícula ya está registrada'),
    );
  });

  it('el login devuelve un token con el payload del contrato', async () => {
    const usuario = {
      id: '650000000000000000000b01',
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@correo.com',
      rol: Rol.PACIENTE,
      password: await bcrypt.hash('Secreta123', 4),
    };
    usuarioModel.findOne.mockReturnValue({ select: () => consulta(usuario) });

    const { access_token, user } = await service.login({
      email: 'ANA@correo.com',
      password: 'Secreta123',
    });

    expect(user).toEqual({
      id: usuario.id,
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@correo.com',
      rol: 'PACIENTE',
    });
    expect(jwt.verify(access_token)).toMatchObject({
      sub: usuario.id,
      email: 'ana@correo.com',
      rol: 'PACIENTE',
      nombre: 'Ana Pérez',
    });
  });

  it('el login falla con 401 si la contraseña es incorrecta o el email no existe', async () => {
    const otraClave = await bcrypt.hash('otra-clave', 4);
    usuarioModel.findOne.mockReturnValue({
      select: () => consulta({ id: '1', password: otraClave }),
    });
    await expect(
      service.login({ email: 'ana@correo.com', password: 'Secreta123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    usuarioModel.findOne.mockReturnValue({ select: () => consulta(null) });
    await expect(
      service.login({ email: 'nadie@correo.com', password: 'Secreta123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
