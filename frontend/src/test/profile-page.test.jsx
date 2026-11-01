import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from '../pages/ProfilePage.jsx'

const mocks = vi.hoisted(() => ({
  getCurrent: vi.fn(),
  update: vi.fn(),
  graphqlRequest: vi.fn(),
}))

vi.mock('../api/profile.js', () => ({
  profileApi: { getCurrent: mocks.getCurrent, update: mocks.update },
}))
vi.mock('../api/index.js', () => ({
  API_URLS: { solicitudes: 'http://solicitudes.test' },
  graphqlRequest: mocks.graphqlRequest,
}))

describe('perfil conectado a usuarios-service', () => {
  beforeEach(() => {
    mocks.getCurrent.mockReset().mockResolvedValue({
      id: 'patient-1',
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.test',
      telefono: '2615551234',
      direccion: 'San Martín 123, Mendoza',
      dni: '30111222',
      rol: 'PACIENTE',
    })
    mocks.update.mockReset().mockImplementation(async (payload) => payload)
    mocks.graphqlRequest.mockReset().mockResolvedValue({ servicios: [] })
  })

  it('carga el perfil y guarda los cambios mediante PATCH /perfil', async () => {
    render(<ProfilePage />)

    const phone = await screen.findByRole('textbox', { name: /Teléfono/ })
    expect(phone).toHaveValue('2615551234')
    fireEvent.change(phone, { target: { value: '2615559999' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalled())
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Ana',
      apellido: 'Pérez',
      telefono: '2615559999',
      direccion: 'San Martín 123, Mendoza',
      dni: '30111222',
    }))
    expect(await screen.findByText('Guardamos los cambios de tu perfil.')).toBeInTheDocument()
  })
})
