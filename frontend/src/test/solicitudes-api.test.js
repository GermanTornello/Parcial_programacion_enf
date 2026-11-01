import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearSolicitud, obtenerProfesional, obtenerServicios } from '../services/solicitudes.js'

const mocks = vi.hoisted(() => ({
  getPublicProfile: vi.fn(),
  listServices: vi.fn(),
  createRequest: vi.fn(),
}))

vi.mock('../api/contract.js', () => ({
  catalogApi: { list: mocks.listServices },
  nursesApi: { getPublicProfile: mocks.getPublicProfile },
  requestsApi: { create: mocks.createRequest },
}))

describe('adaptadores de solicitudes al contrato NestJS', () => {
  beforeEach(() => {
    mocks.getPublicProfile.mockReset()
    mocks.listServices.mockReset()
    mocks.createRequest.mockReset()
  })

  it('adapta ids, servicios y disponibilidad del perfil de enfermería', async () => {
    mocks.getPublicProfile.mockResolvedValue({
      id: '650000000000000000000101',
      estadoVerificacion: 'APROBADO',
      disponible: true,
      serviciosOfrecidos: ['650000000000000000000001'],
      disponibilidad: [{ dia: 1, desde: '09:00', hasta: '13:00' }],
    })
    mocks.listServices.mockResolvedValue([{
      id: '650000000000000000000001',
      nombre: 'Curaciones',
      duracionEstimadaMin: 120,
      precioReferencia: 9000,
    }])

    const nurse = await obtenerProfesional('650000000000000000000101')
    const services = await obtenerServicios()

    expect(nurse.idEnfermero).toBe('650000000000000000000101')
    expect(nurse.verificado).toBe(true)
    expect(nurse.servicios).toEqual([{ idServicio: '650000000000000000000001' }])
    expect(nurse.horarios).toEqual([{
      dia_semana: 'Lunes',
      hora_inicio: '09:00',
      hora_fin: '13:00',
      estado: 'Disponible',
    }])
    expect(services[0]).toMatchObject({
      idServicio: '650000000000000000000001',
      tipoServicio: 'Curaciones',
      duracionMinutos: 120,
      precioEstimado: 9000,
    })
  })

  it('manda los ids Mongo como texto y solo los campos admitidos por POST /solicitudes', async () => {
    mocks.createRequest.mockResolvedValue({ id: '650000000000000000000201' })

    await crearSolicitud({
      enfermeroId: '650000000000000000000101',
      idServicio: '650000000000000000000001',
      fecha: '2026-11-10',
      hora: '10:00',
      direccionAtencion: 'San Martín 456, Mendoza',
      notas: 'Tocar timbre',
      latitudAtencion: -32.89,
      longitudAtencion: -68.84,
    })

    expect(mocks.createRequest).toHaveBeenCalledWith({
      enfermeroId: '650000000000000000000101',
      servicioId: '650000000000000000000001',
      fecha: '2026-11-10',
      hora: '10:00',
      direccionAtencion: 'San Martín 456, Mendoza',
      notas: 'Tocar timbre',
    })
  })
})
