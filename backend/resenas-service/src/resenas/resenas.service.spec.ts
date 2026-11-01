import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Rol, UsuarioToken } from '../auth/rol.enum.js';
import { Resena } from './resena.schema.js';
import { ResenasService } from './resenas.service.js';
import { SolicitudesClient } from './solicitudes.client.js';

const consulta = (valor: unknown) => ({ exec: vi.fn().mockResolvedValue(valor) });

const ANA: UsuarioToken = { id: 'p1', email: 'p1@test.com', rol: Rol.PACIENTE, nombre: 'Ana Pérez' };
const BETO: UsuarioToken = { id: 'p2', email: 'p2@test.com', rol: Rol.PACIENTE, nombre: 'Beto Gómez' };
const SOLICITUD_ID = '650000000000000000000d01';
const input = { solicitudId: SOLICITUD_ID, puntuacion: 5, comentario: '  Muy amable y puntual  ' };
const solicitud = (estado: string) => ({ id: SOLICITUD_ID, pacienteId: 'p1', enfermeroId: 'e1', estado });

describe('ResenasService', () => {
  let service: ResenasService;
  const modelo = { exists: vi.fn(), create: vi.fn(), findById: vi.fn(), aggregate: vi.fn() };
  // Simula la respuesta HTTP de solicitudes-service
  const solicitudes = { obtener: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    modelo.exists.mockReturnValue(consulta(null));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ResenasService,
        { provide: getModelToken(Resena.name), useValue: modelo },
        { provide: SolicitudesClient, useValue: solicitudes },
      ],
    }).compile();
    service = moduleRef.get(ResenasService);
  });

  it('crea la reseña de un servicio REALIZADO, con el enfermero de la solicitud', async () => {
    solicitudes.obtener.mockResolvedValue(solicitud('REALIZADA'));
    modelo.create.mockImplementation(async (datos) => datos);

    const resena = await service.create(ANA, input, 'Bearer token');

    expect(solicitudes.obtener).toHaveBeenCalledWith(SOLICITUD_ID, 'Bearer token');
    expect(resena).toMatchObject({ enfermeroId: 'e1', pacienteNombre: 'Ana Pérez', puntuacion: 5, comentario: 'Muy amable y puntual' });
  });

  it('no deja calificar una solicitud que no está REALIZADA (BadRequestException)', async () => {
    solicitudes.obtener.mockResolvedValue(solicitud('ACEPTADA'));

    await expect(service.create(ANA, input, 'Bearer token')).rejects.toBeInstanceOf(BadRequestException);
    expect(modelo.create).not.toHaveBeenCalled();
  });

  it('otro paciente no puede calificar la solicitud (ForbiddenException)', async () => {
    solicitudes.obtener.mockResolvedValue(solicitud('REALIZADA'));

    await expect(service.create(BETO, input, 'Bearer token')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no deja calificar dos veces el mismo servicio (ConflictException)', async () => {
    solicitudes.obtener.mockResolvedValue(solicitud('REALIZADA'));
    modelo.exists.mockReturnValue(consulta({ _id: 'r1' }));

    await expect(service.create(ANA, input, 'Bearer token')).rejects.toBeInstanceOf(ConflictException);
  });

  it('solo quien escribió la reseña puede editarla', async () => {
    modelo.findById.mockReturnValue(consulta({ pacienteId: 'p1', save: vi.fn() }));

    await expect(service.update(BETO, '650000000000000000000e01', { puntuacion: 1 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('calcula la reputación con un decimal y devuelve 0 para quien no tiene reseñas, en el mismo orden', async () => {
    modelo.aggregate.mockReturnValue(consulta([{ _id: 'e2', promedio: 4.666666, cantidad: 3 }]));

    const resultado = await service.reputaciones(['e1', 'e2']);

    expect(resultado).toEqual([
      { enfermeroId: 'e1', promedio: 0, cantidad: 0 },
      { enfermeroId: 'e2', promedio: 4.7, cantidad: 3 },
    ]);
  });
});
