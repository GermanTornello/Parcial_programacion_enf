import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Rol, UsuarioToken } from '../auth/rol.enum.js';
import {
  Admin,
  Enfermero,
  EstadoVerificacion,
  Paciente,
  Usuario,
} from './usuario.schema.js';
import { UsuariosService } from './usuarios.service.js';

const consulta = (valor: unknown) => ({
  exec: vi.fn().mockResolvedValue(valor),
});

// Documento de Mongoose simulado: guarda lo que se le setea para poder revisarlo
const documento = (datos: Record<string, unknown>) => {
  const doc = {
    ...datos,
    set: vi.fn((cambios: Record<string, unknown>) =>
      Object.assign(doc, cambios),
    ),
    save: vi.fn().mockResolvedValue(undefined),
    toJSON: () => datos,
  };
  return doc;
};

const ENFERMERA: UsuarioToken = {
  id: '650000000000000000000c01',
  email: 'laura@x.com',
  rol: Rol.ENFERMERO,
  nombre: 'Laura Gómez',
};
const PACIENTE: UsuarioToken = {
  id: '650000000000000000000b01',
  email: 'ana@x.com',
  rol: Rol.PACIENTE,
  nombre: 'Ana Pérez',
};
const CURACIONES = '650000000000000000000001';
const INYECCIONES = '650000000000000000000002';

describe('UsuariosService', () => {
  let service: UsuariosService;
  const usuarioModel = { findById: vi.fn(), findByIdAndDelete: vi.fn() };
  const pacienteModel = { findById: vi.fn() };
  const enfermeroModel = { findById: vi.fn(), exists: vi.fn() };
  const adminModel = { findById: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getModelToken(Usuario.name), useValue: usuarioModel },
        { provide: getModelToken(Paciente.name), useValue: pacienteModel },
        { provide: getModelToken(Enfermero.name), useValue: enfermeroModel },
        { provide: getModelToken(Admin.name), useValue: adminModel },
      ],
    }).compile();
    service = moduleRef.get(UsuariosService);
  });

  describe('relación muchos-a-muchos Enfermero ↔ Servicio', () => {
    it('no guarda ids de servicio repetidos al editar el perfil', async () => {
      const enfermera = documento({
        matricula: 'MP-1',
        serviciosOfrecidos: [],
      });
      enfermeroModel.findById.mockReturnValue(consulta(enfermera));

      await service.actualizarPerfil(ENFERMERA, {
        serviciosOfrecidos: [CURACIONES, INYECCIONES, CURACIONES, INYECCIONES],
      });

      expect(enfermera.set).toHaveBeenCalledWith({
        serviciosOfrecidos: [CURACIONES, INYECCIONES],
      });
      expect(enfermera.save).toHaveBeenCalled();
    });

    it('un paciente no puede cargarse servicios ni matrícula (solo se toman los campos de su rol)', async () => {
      const paciente = documento({ nombre: 'Ana' });
      pacienteModel.findById.mockReturnValue(consulta(paciente));

      await service.actualizarPerfil(PACIENTE, {
        obraSocial: 'OSEP',
        serviciosOfrecidos: [CURACIONES],
        matricula: 'MP-9',
      });

      expect(paciente.set).toHaveBeenCalledWith({ obraSocial: 'OSEP' });
    });
  });

  it('si el enfermero cambia la matrícula, vuelve a quedar PENDIENTE de revisión', async () => {
    const enfermera = documento({
      matricula: 'MP-1',
      estadoVerificacion: EstadoVerificacion.APROBADO,
    });
    enfermeroModel.findById.mockReturnValue(consulta(enfermera));
    enfermeroModel.exists.mockReturnValue(consulta(null));

    await service.actualizarPerfil(ENFERMERA, { matricula: ' MP-2 ' });

    expect(enfermera.set).toHaveBeenCalledWith({
      matricula: 'MP-2',
      estadoVerificacion: EstadoVerificacion.PENDIENTE,
      motivoRechazo: undefined,
    });
  });

  it('convierte la ubicación { lat, lng } a GeoJSON [lng, lat]', async () => {
    const enfermera = documento({ matricula: 'MP-1' });
    enfermeroModel.findById.mockReturnValue(consulta(enfermera));

    await service.actualizarPerfil(ENFERMERA, {
      ubicacion: { lat: -32.9, lng: -68.8 },
    });

    expect(enfermera.set).toHaveBeenCalledWith({
      ubicacion: { type: 'Point', coordinates: [-68.8, -32.9] },
    });
  });

  it('rechaza un horario donde "desde" no es antes que "hasta"', async () => {
    enfermeroModel.findById.mockReturnValue(
      consulta(documento({ matricula: 'MP-1' })),
    );

    await expect(
      service.actualizarPerfil(ENFERMERA, {
        disponibilidad: [{ dia: 1, desde: '14:00', hasta: '09:00' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el admin no puede borrarse a sí mismo y un id inexistente da 404', async () => {
    await expect(service.borrarUsuario('a1', 'a1')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    usuarioModel.findByIdAndDelete.mockReturnValue(consulta(null));
    await expect(
      service.borrarUsuario('650000000000000000000099', 'a1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
