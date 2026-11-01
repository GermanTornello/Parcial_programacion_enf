import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Rol, UsuarioToken } from '../auth/rol.enum.js';
import { EstadoSolicitud } from '../solicitudes/estados.js';
import { SolicitudesService } from '../solicitudes/solicitudes.service.js';
import { Mensaje } from './mensaje.schema.js';
import { MensajesService } from './mensajes.service.js';

const PACIENTE: UsuarioToken = { id: 'p1', email: 'p1@test.com', rol: Rol.PACIENTE, nombre: 'Ana Pérez' };
const ADMIN: UsuarioToken = { id: 'a1', email: 'a1@test.com', rol: Rol.ADMIN, nombre: 'Admin' };

describe('MensajesService (chat)', () => {
  let service: MensajesService;
  const modelo = { create: vi.fn(), find: vi.fn() };
  const solicitudes = { buscar: vi.fn() };
  const solicitud = (estado: EstadoSolicitud) => ({ _id: 's1', pacienteId: 'p1', enfermeroId: 'e1', estado });

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MensajesService,
        { provide: getModelToken(Mensaje.name), useValue: modelo },
        { provide: SolicitudesService, useValue: solicitudes },
      ],
    }).compile();
    service = moduleRef.get(MensajesService);
  });

  it.each([EstadoSolicitud.PENDIENTE, EstadoSolicitud.ACEPTADA])('se puede escribir con la solicitud %s', async (estado) => {
    solicitudes.buscar.mockResolvedValue(solicitud(estado));
    modelo.create.mockImplementation(async (datos) => datos);

    const mensaje = await service.enviar(PACIENTE, 's1', { texto: 'Hola' });

    expect(mensaje).toMatchObject({ autorId: 'p1', autorNombre: 'Ana Pérez', texto: 'Hola' });
  });

  it.each([EstadoSolicitud.REALIZADA, EstadoSolicitud.CANCELADA, EstadoSolicitud.RECHAZADA])(
    'con la solicitud %s el chat queda solo para leer (BadRequestException)',
    async (estado) => {
      solicitudes.buscar.mockResolvedValue(solicitud(estado));

      await expect(service.enviar(PACIENTE, 's1', { texto: 'Hola' })).rejects.toBeInstanceOf(BadRequestException);
      expect(modelo.create).not.toHaveBeenCalled();
    },
  );

  it('alguien que no participa (aunque sea ADMIN) no puede leer el chat', async () => {
    solicitudes.buscar.mockResolvedValue(solicitud(EstadoSolicitud.ACEPTADA));

    await expect(service.listar(ADMIN, 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
