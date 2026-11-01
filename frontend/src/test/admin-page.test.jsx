import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminPage } from '../pages/AdminPage.jsx'

const mocks = vi.hoisted(() => ({
  pendingNurses: vi.fn(),
  verifyNurse: vi.fn(),
  users: vi.fn(),
  deleteUser: vi.fn(),
  listServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
}))

vi.mock('../api/admin.js', () => ({
  adminApi: {
    pendingNurses: mocks.pendingNurses,
    verifyNurse: mocks.verifyNurse,
    users: mocks.users,
    deleteUser: mocks.deleteUser,
    listServices: mocks.listServices,
    createService: mocks.createService,
    updateService: mocks.updateService,
    deleteService: mocks.deleteService,
  },
}))

describe('panel de administración', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pendingNurses.mockResolvedValue([{
      id: 'nurse-1',
      nombre: 'Lucía',
      apellido: 'Gómez',
      email: 'lucia@example.test',
      matricula: 'MN-123',
      departamento: 'Capital',
      especialidades: ['Pediatría'],
    }])
    mocks.verifyNurse.mockResolvedValue({})
    mocks.users.mockResolvedValue([])
    mocks.listServices.mockResolvedValue([])
    mocks.createService.mockResolvedValue({})
    mocks.updateService.mockResolvedValue({})
    mocks.deleteUser.mockResolvedValue({})
    mocks.deleteService.mockResolvedValue({})
  })

  it('aprueba una matrícula pendiente mediante el endpoint administrativo', async () => {
    render(<AdminPage />)

    expect(await screen.findByText('Lucía Gómez')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    const dialog = screen.getByRole('dialog', { name: 'Aprobar matrícula' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aprobar' }))

    await waitFor(() => {
      expect(mocks.verifyNurse).toHaveBeenCalledWith('nurse-1', 'APROBADO', undefined)
    })
    expect(await screen.findByText('Matrícula aprobada.')).toBeInTheDocument()
    expect(screen.queryByText('Lucía Gómez')).not.toBeInTheDocument()
  })
})
