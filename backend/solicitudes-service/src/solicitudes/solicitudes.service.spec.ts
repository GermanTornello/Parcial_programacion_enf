import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Rol, UsuarioToken } from '../auth/rol.enum.js';
import { ServiciosService } from '../servicios/servicios.service.js';
import { EstadoSolicitud } from './estados.js';
import { Solicitud } from './solicitud.schema.js';
import { SolicitudesService } from './solicitudes.service.js';
import { UsuariosClient } from './usuarios.client.js';

const consulta = (valor: unknown) => ({ exec: vi.fn().mockResolvedValue(valor) });

/** Fecha AAAA-MM-DD dentro de `dias` días. */
const enDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

const PACIENTE: UsuarioToken = { id: 'p1', email: 'p1@test.com', rol: Rol.PACIENTE, nombre: 'Ana Pérez' };
const ENFERMERA: UsuarioToken = { id: 'e1', email: 'e1@test.com', rol: Rol.ENFERMERO, nombre: 'Laura Gómez' };
const SERVICIO_ID = '650000000000000000000002';

const pedido = (cambios: Record<string, unknown> = {}) => ({
  enfermeroId: '650000000000000000000c01',
  servicioId: SERVICIO_ID,
  fecha: enDias(7),
  hora: '10:00',
  direccionAtencion: 'San Martín 1234',
  ...cambios,
});

const enfermeroAprobado = {
  id: '650000000000000000000c01',
  nombre: 'Laura',
  apellido: 'Gómez',
  estadoVerificacion: 'APROBADO',
  disponible: true,
  serviciosOfrecidos: [SERVICIO_ID],
};

describe('SolicitudesService', () => {
  let service: SolicitudesService;
  const modelo = { countDocuments: vi.fn(), exists: vi.fn(), create: vi.fn(), findById: vi.fn() };
  const servicios = { findOne: vi.fn() };
  const usuarios = { buscarEnfermero: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    // Por defecto: sin pendientes, servicio activo, enfermero habilitado y horario libre
    modelo.countDocuments.mockReturnValue(consulta(0));
    modelo.exists.mockReturnValue(consulta(null));
    servicios.findOne.mockResolvedValue({ _id: SERVICIO_ID, activo: true });
    usuarios.buscarEnfermero.mockResolvedValue(enfermeroAprobado);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SolicitudesService,
        { provide: getModelToken(Solicitud.name), useValue: modelo },
        { provide: ServiciosService, useValue: servicios },
        { provide: UsuariosClient, useValue: usuarios },
      ],
    }).compile();
    service = moduleRef.get(SolicitudesService);
  });

  it('crea la solicitud en PENDIENTE con los nombres del paciente y del enfermero', async () => {
    modelo.create.mockImplementation(async (datos) => ({ ...datos, populate: vi.fn().mockResolvedValue(datos) }));

    const creada = await service.create(PACIENTE, pedido());

    expect(creada).toMatchObject({ pacienteId: 'p1', pacienteNombre: 'Ana Pérez', enfermeroNombre: 'Laura Gómez' });
  });

  it('rechaza un turno a más de 6 meses (BadRequestException)', async () => {
    await expect(service.create(PACIENTE, pedido({ fecha: enDias(200) }))).rejects.toThrow(
      'El turno no puede ser a más de 6 meses',
    );
    expect(modelo.create).not.toHaveBeenCalled();
  });

  it('rechaza un turno en el pasado', async () => {
    await expect(service.create(PACIENTE, pedido({ fecha: enDias(-1) }))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no deja tener más de 5 solicitudes pendientes (ConflictException)', async () => {
    modelo.countDocuments.mockReturnValue(consulta(5));

    await expect(service.create(PACIENTE, pedido())).rejects.toBeInstanceOf(ConflictException);
    expect(usuarios.buscarEnfermero).not.toHaveBeenCalled();
  });

  it('no permite pedirle a un enfermero sin matrícula aprobada', async () => {
    usuarios.buscarEnfermero.mockResolvedValue({ ...enfermeroAprobado, estadoVerificacion: 'PENDIENTE' });

    await expect(service.create(PACIENTE, pedido())).rejects.toThrow('todavía no tiene la matrícula aprobada');
  });

  it('no permite pedir un servicio que el enfermero no ofrece', async () => {
    usuarios.buscarEnfermero.mockResolvedValue({ ...enfermeroAprobado, serviciosOfrecidos: [] });

    await expect(service.create(PACIENTE, pedido())).rejects.toThrow('no ofrece el servicio elegido');
  });

  it('no permite dos turnos activos del enfermero en el mismo horario (ConflictException)', async () => {
    modelo.exists.mockReturnValue(consulta({ _id: 'otra' }));

    await expect(service.create(PACIENTE, pedido())).rejects.toBeInstanceOf(ConflictException);
  });

  describe('sobre una solicitud existente', () => {
    const solicitud = (cambios: Record<string, unknown> = {}) => ({
      pacienteId: 'p1',
      enfermeroId: 'e1',
      estado: EstadoSolicitud.ACEPTADA,
      save: vi.fn().mockImplementation(function (this: unknown) {
        return Promise.resolve(this);
      }),
      ...cambios,
    });
    const encontrar = (doc: unknown) =>
      modelo.findById.mockReturnValue({ populate: () => consulta(doc) });
    const ID = '650000000000000000000d01';

    it('el enfermero no puede cancelar sin indicar el motivo', async () => {
      encontrar(solicitud());

      await expect(service.cancelar(ENFERMERA, ID)).rejects.toThrow('Tenés que indicar el motivo de la cancelación');
    });

    it('el enfermero cancela con motivo y queda registrado quién canceló', async () => {
      encontrar(solicitud());

      const cancelada = await service.cancelar(ENFERMERA, ID, 'Ese día no estoy');

      expect(cancelada).toMatchObject({
        estado: EstadoSolicitud.CANCELADA,
        canceladaPor: Rol.ENFERMERO,
        motivoCancelacion: 'Ese día no estoy',
      });
    });

    it('otro paciente no puede ver la solicitud (ForbiddenException)', async () => {
      encontrar(solicitud());
      const otro: UsuarioToken = { ...PACIENTE, id: 'p2' };

      await expect(service.findOne(otro, ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no se puede marcar como realizada una solicitud PENDIENTE', async () => {
      encontrar(solicitud({ estado: EstadoSolicitud.PENDIENTE }));

      await expect(service.realizar(ENFERMERA, ID)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
