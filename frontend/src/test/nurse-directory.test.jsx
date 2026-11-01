import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ListaEnfermeros from '../components/ListaEnfermeros.jsx'

const { requestApi, sesionActual } = vi.hoisted(() => ({ requestApi: vi.fn(), sesionActual: vi.fn() }))
vi.mock('../api.js', () => ({
  requestApi,
  sesionActual,
  DAYS: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  formatPrice: (value) => Number(value) > 0 ? `$${value}` : 'A consultar',
}))

beforeEach(() => {
  sesionActual.mockReturnValue(null)
  requestApi.mockImplementation((path) => {
    if (path === '/enfermeros') return Promise.resolve([{ especialidad: 'Geriatría' }])
    if (path === '/enfermeros/ciudades') return Promise.resolve(['Capital'])
    if (path === '/servicios') return Promise.resolve([])
    if (path.startsWith('/enfermeros/buscar?')) {
      return Promise.resolve({
        enfermeros: [{
          id: 'enf-1', nombre: 'Laura', apellido: 'Pérez', ciudad: 'Capital',
          especialidad: 'Geriatría', disponible: true, distancia_km: 4.2,
          experiencia_anios: 8, tarifa_hora: 9000,
        }],
        total_resultados: 1,
        total_paginas: 1,
      })
    }
    return Promise.resolve([])
  })
})

describe('cartilla', () => {
  it('muestra una tarjeta con la distancia recibida en los resultados', async () => {
    render(
      <MemoryRouter initialEntries={['/cartilla']}>
        <Routes><Route path="/cartilla" element={<ListaEnfermeros />} /></Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('A unos 4 km')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Laura Pérez/ })).toHaveAttribute('href', '/perfil/enf-1')
  })
})
