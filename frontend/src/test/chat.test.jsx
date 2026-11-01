import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatServicio from '../components/ChatServicio.jsx'

const mocks = vi.hoisted(() => ({
  messages: vi.fn(),
  get: vi.fn(),
  sendMessage: vi.fn(),
}))
vi.mock('../api/contract.js', () => ({ requestsApi: mocks }))
vi.mock('../api.js', () => ({ sesionActual: () => ({ sub: 'patient-17' }) }))

describe('ChatServicio', () => {
  beforeEach(() => {
    mocks.messages.mockReset().mockResolvedValue([])
    mocks.get.mockReset().mockResolvedValue({ estado: 'PENDIENTE' })
    mocks.sendMessage.mockReset()
  })

  it('deja leer pero no enviar cuando la solicitud est? cerrada', async () => {
    render(<ChatServicio solicitud={{ idSolicitud: 's-10', estado: 'REALIZADA' }} />)

    await waitFor(() => expect(screen.getByRole('log', { name: 'Historial de mensajes' })).toHaveAttribute('aria-busy', 'false'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enviar mensaje/ })).not.toBeInTheDocument()
    expect(mocks.messages).toHaveBeenCalledWith('s-10', expect.any(AbortSignal))
  })

  it('lee y env?a mensajes con los campos del contrato NestJS', async () => {
    const user = userEvent.setup()
    mocks.messages.mockResolvedValueOnce([
      { id: 'msg-1', autorId: 'nurse-2', autorNombre: 'Rosa', texto: 'Hola Ana', createdAt: '2026-11-01T12:00:00.000Z' },
    ])
    mocks.sendMessage.mockResolvedValueOnce({
      id: 'msg-2', autorId: 'patient-17', autorNombre: 'Ana', texto: 'Gracias', createdAt: '2026-11-01T12:01:00.000Z',
    })
    render(<ChatServicio solicitud={{ idSolicitud: 's-11', estado: 'Pendiente' }} />)

    expect(await screen.findByText('Hola Ana')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /mensaje/i }), 'Gracias')
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

    expect(mocks.sendMessage).toHaveBeenCalledWith('s-11', 'Gracias')
    expect(await screen.findByText('Gracias')).toBeInTheDocument()
  })
})
