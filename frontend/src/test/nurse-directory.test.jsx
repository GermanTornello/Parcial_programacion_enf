import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ListaEnfermeros from '../components/ListaEnfermeros.jsx'

const { usuariosGet, sesionActual, reputations } = vi.hoisted(() => ({
  usuariosGet: vi.fn(),
  sesionActual: vi.fn(),
  reputations: vi.fn(),
}))
vi.mock('../api.js', () => ({
  sesionActual,
  formatPrice: (value) => Number(value) > 0 ? `$${value}` : 'A consultar',
}))
vi.mock('../api/index.js', () => ({ usuariosApi: { get: usuariosGet } }))
vi.mock('../api/resources.js', () => ({
  catalogApi: {
    list: () => Promise.resolve([{ id: '650000000000000000000002', nombre: 'Inyecciones' }]),
  },
  resenasApi: { reputations },
  solicitudesApi: { list: () => Promise.resolve([]) },
}))

// Enfermero tal como lo devuelve GET /enfermeros/buscar (contrato, sección 2.7)
const laura = {
  id: 'enf-1',
  nombre: 'Laura',
  apellido: 'Pérez',
  departamento: 'Capital',
  especialidades: ['Geriatría'],
  serviciosOfrecidos: ['650000000000000000000002'],
  aniosExperiencia: 8,
  tarifaHora: 9000,
  disponible: true,
  disponibilidad: [{ dia: 1, desde: '08:00', hasta: '16:00' }],
  ubicacion: { type: 'Point', coordinates: [-68.8458, -32.8895] },
  distanciaKm: 4.2,
}

const renderCartilla = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/cartilla" element={<ListaEnfermeros />} /></Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  sesionActual.mockReturnValue(null)
  usuariosGet.mockReset()
  usuariosGet.mockResolvedValue({ data: [laura] })
  reputations.mockResolvedValue([{ enfermeroId: 'enf-1', promedio: 4.5, cantidad: 2 }])
})

describe('cartilla', () => {
  it('muestra la tarjeta con distancia, servicios y reputación a partir de la API nueva', async () => {
    renderCartilla('/cartilla?lat=-32.9&lng=-68.8')

    expect(await screen.findByText('A unos 4 km')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Laura Pérez/ })).toHaveAttribute('href', '/perfil/enf-1')
    // El servicio aparece en la tarjeta ("Ofrece: Inyecciones"), además de en el filtro
    expect(screen.getByText(/Ofrece:/).closest('p')).toHaveTextContent('Ofrece: Inyecciones')
    expect(screen.getByText(/\(2 reseñas\)/)).toBeInTheDocument()
    expect(usuariosGet).toHaveBeenCalledWith(
      '/enfermeros/buscar',
      expect.objectContaining({ params: expect.objectContaining({ lat: '-32.9', lng: '-68.8' }) }),
    )
  })

  it('sin ubicación del paciente no muestra distancia y traduce los filtros al contrato', async () => {
    renderCartilla('/cartilla?ciudad=Ciudad%20de%20Mendoza&servicio=650000000000000000000002')

    expect(await screen.findByRole('link', { name: /Laura Pérez/ })).toBeInTheDocument()
    expect(screen.queryByText(/A unos/)).not.toBeInTheDocument()
    expect(usuariosGet).toHaveBeenCalledWith(
      '/enfermeros/buscar',
      expect.objectContaining({
        params: expect.objectContaining({ departamento: 'Capital', servicioId: '650000000000000000000002' }),
      }),
    )
  })

  it('si la búsqueda falla muestra el error con Reintentar en vez de quedar en blanco', async () => {
    usuariosGet.mockRejectedValue({ response: { data: { message: ['La latitud no es válida'] } } })
    renderCartilla('/cartilla')

    expect(await screen.findByText('La latitud no es válida')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
