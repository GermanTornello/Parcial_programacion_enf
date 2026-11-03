import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SolicitarServicio from '../components/SolicitarServicio.jsx'

const mocks = vi.hoisted(() => ({
  obtenerPerfilPropio: vi.fn(),
  actualizarTelefono: vi.fn(),
  obtenerProfesional: vi.fn(),
  obtenerServicios: vi.fn(),
  crearSolicitud: vi.fn(),
  errorSolicitud: vi.fn((error) => error.message),
}))
vi.mock('../api.js', () => ({
  enlaceWhatsapp: () => 'https://wa.me/5492615551234',
}))
vi.mock('../services/solicitudes.js', () => ({
  obtenerProfesional: mocks.obtenerProfesional,
  obtenerServicios: mocks.obtenerServicios,
  crearSolicitud: mocks.crearSolicitud,
  errorSolicitud: mocks.errorSolicitud,
  obtenerPerfilPropio: mocks.obtenerPerfilPropio,
  actualizarTelefono: mocks.actualizarTelefono,
}))
beforeEach(() => {
  // Perfil del paciente logueado (GET /auth/me): precarga la dirección
  mocks.obtenerPerfilPropio.mockReset().mockResolvedValue({
    telefono: '2615551234',
    direccion: 'San Martín 123, Mendoza',
  })
  mocks.obtenerProfesional.mockReset().mockResolvedValue({
    idEnfermero: '650000000000000000000c42', nombre: 'Rosa', apellido: 'Díaz', verificado: true,
    disponible: true, servicios: [{ idServicio: '650000000000000000000001' }], horarios: [],
  })
  mocks.obtenerServicios.mockReset().mockResolvedValue([
    { idServicio: '650000000000000000000001', tipoServicio: 'Curaciones', precioEstimado: 9000, duracionMinutos: 120 },
  ])
  mocks.crearSolicitud.mockReset().mockResolvedValue({
    solicitud: { idSolicitud: 'sol-1' },
    mensaje: 'Solicitud creada.',
  })
})

describe('formulario de solicitud', () => {
  it('marca como obligatorios el servicio, fecha, hora y dirección', async () => {
    render(
      <MemoryRouter initialEntries={['/perfil/enf-42/solicitar']}>
        <Routes><Route path="/perfil/:id/solicitar" element={<SolicitarServicio />} /></Routes>
      </MemoryRouter>,
    )

    const service = await screen.findByLabelText(/Tipo de servicio/)
    await waitFor(() => expect(service).toBeEnabled())
    expect(service).toBeRequired()
    fireEvent.change(service, { target: { value: '650000000000000000000001' } })
    expect(screen.getByLabelText('Fecha')).toBeRequired()
    expect(document.querySelector('input[name=hora]')).toBeRequired()
    expect(screen.getByLabelText(/Direcci/)).toBeRequired()
    expect(await screen.findByDisplayValue('San Martín 123, Mendoza')).toBeInTheDocument()
    expect(screen.getByText('El turno dura 2 horas.')).toBeInTheDocument()
    expect(mocks.crearSolicitud).not.toHaveBeenCalled()
  })

  it('envía los ids de MongoDB tal cual (sin pasarlos a número) y solo la dirección', async () => {
    render(
      <MemoryRouter initialEntries={['/perfil/enf-42/solicitar']}>
        <Routes><Route path="/perfil/:id/solicitar" element={<SolicitarServicio />} /></Routes>
      </MemoryRouter>,
    )

    await screen.findByLabelText(/Tipo de servicio/)
    fireEvent.change(screen.getByLabelText(/Tipo de servicio/), { target: { value: '650000000000000000000001' } })
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-10' } })
    fireEvent.change(document.querySelector('input[name=hora]'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText(/Dirección de atención/), {
      target: { value: 'San Martín 456, Mendoza' },
    })
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => expect(mocks.crearSolicitud).toHaveBeenCalled())
    expect(mocks.crearSolicitud).toHaveBeenCalledWith(expect.objectContaining({
      idServicio: '650000000000000000000001',
      idEnfermero: '650000000000000000000c42',
      fecha: '2026-11-10',
      hora: '10:00',
      direccionAtencion: 'San Martín 456, Mendoza',
    }))
    const payload = mocks.crearSolicitud.mock.calls[0][0]
    expect(payload).not.toHaveProperty('latitudAtencion')
    expect(payload).not.toHaveProperty('longitudAtencion')
  })
})
