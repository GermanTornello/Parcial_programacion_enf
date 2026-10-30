import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Servicio } from './servicio.schema.js';
import { ServiciosService } from './servicios.service.js';

// Las consultas de Mongoose terminan en .exec(): el mock devuelve un objeto con ese método
const consulta = (valor: unknown) => ({ exec: vi.fn().mockResolvedValue(valor) });

describe('ServiciosService', () => {
  let service: ServiciosService;
  const modelo = {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };

  const nuevo = {
    nombre: 'Curación de heridas',
    duracionEstimadaMin: 30,
    precioReferencia: 9000,
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [ServiciosService, { provide: getModelToken(Servicio.name), useValue: modelo }],
    }).compile();
    service = moduleRef.get(ServiciosService);
  });

  it('crea el servicio cuando el nombre está libre', async () => {
    modelo.findOne.mockReturnValue(consulta(null));
    modelo.create.mockResolvedValue({ id: '1', ...nuevo, activo: true });

    const creado = await service.create(nuevo);

    expect(modelo.create).toHaveBeenCalledWith(nuevo);
    expect(creado.nombre).toBe('Curación de heridas');
  });

  it('rechaza un nombre repetido con ConflictException (sin importar mayúsculas)', async () => {
    modelo.findOne.mockReturnValue(consulta({ id: '1', nombre: 'Curación de heridas' }));

    await expect(service.create({ ...nuevo, nombre: 'CURACIÓN DE HERIDAS' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(modelo.create).not.toHaveBeenCalled();
  });

  it('convierte el error de índice único de MongoDB (11000) en ConflictException', async () => {
    modelo.findOne.mockReturnValue(consulta(null));
    modelo.create.mockRejectedValue(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

    await expect(service.create(nuevo)).rejects.toBeInstanceOf(ConflictException);
  });

  it('devuelve NotFoundException si el id no es válido o no existe', async () => {
    await expect(service.findOne('no-es-un-id')).rejects.toBeInstanceOf(NotFoundException);

    modelo.findById.mockReturnValue(consulta(null));
    await expect(service.findOne('650000000000000000000099')).rejects.toBeInstanceOf(NotFoundException);
  });
});
