import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatServicio from '../components/ChatServicio.jsx'

const mocks = vi.hoisted(() => ({
  messages: vi.fn(),
  sendMessage: vi.fn(),
  get: vi.fn(),
}))
vi.mock('../api.js', () => ({
  sesionActual: () => ({ sub: '650000000000000000000b17' }),
}))
// API del contrato (solicitudes-service): el chat la usa a través de services/solicitudes.js
vi.mock('../api/contract.js', () => ({
  requestsApi: { messages: mocks.messages, sendMessage: mocks.sendMessage, get: mocks.get },
  catalogApi: {},
  nursesApi: {},
  profileApi: {},
  resenasApi: {},
}))

describe('ChatServicio', () => {
  beforeEach(() => {
    mocks.messages.mockReset().mockResolvedValue([])
    mocks.sendMessage.mockReset()
  })

  it('deja leer pero no enviar cuando la solicitud está cerrada', async () => {
    render(<ChatServicio solicitud={{ idSolicitud: 's-10', estado: 'Realizada' }} />)

    await waitFor(() => expect(screen.getByRole('log', { name: 'Historial de mensajes' })).toHaveAttribute('aria-busy', 'false'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enviar mensaje/ })).not.toBeInTheDocument()
    expect(mocks.messages).toHaveBeenCalledWith('s-10', expect.any(AbortSignal))
  })

  it('permite leer y enviar mensajes en una solicitud pendiente', async () => {
    const user = userEvent.setup()
    // Formato del contrato: { id, autorId, autorNombre, texto, createdAt }
    mocks.messages.mockResolvedValueOnce([
      { id: 'm1', autorId: '650000000000000000000c02', autorNombre: 'Laura Gómez', texto: 'Hola Ana', createdAt: '2026-11-01T12:00:00.000Z' },
    ])
    mocks.sendMessage.mockResolvedValueOnce({
      id: 'm2', autorId: '650000000000000000000b17', autorNombre: 'Ana Pérez', texto: 'Gracias', createdAt: '2026-11-01T12:01:00.000Z',
    })
    render(<ChatServicio solicitud={{ idSolicitud: 's-11', estado: 'Pendiente' }} />)

    expect(await screen.findByText('Hola Ana')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /mensaje/i }), 'Gracias')
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

    expect(mocks.sendMessage).toHaveBeenCalledWith('s-11', 'Gracias')
    expect(await screen.findByText('Gracias')).toBeInTheDocument()
  })
})
