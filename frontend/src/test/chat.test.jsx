import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatServicio from '../components/ChatServicio.jsx'

const mocks = vi.hoisted(() => ({
  requestApi: vi.fn(),
}))
vi.mock('../api.js', () => ({
  requestApi: mocks.requestApi,
  sesionActual: () => ({ sub: '17' }),
}))

describe('ChatServicio', () => {
  beforeEach(() => {
    mocks.requestApi.mockReset().mockResolvedValue([])
  })

  it('deja leer pero no enviar cuando la solicitud est? cerrada', async () => {
    render(<ChatServicio solicitud={{ idSolicitud: 's-10', estado: 'REALIZADA' }} />)

    await waitFor(() => expect(screen.getByRole('log', { name: 'Historial de mensajes' })).toHaveAttribute('aria-busy', 'false'))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enviar mensaje/ })).not.toBeInTheDocument()
    expect(mocks.requestApi).toHaveBeenCalledWith('/solicitudes/s-10/mensajes', expect.objectContaining({
      signal: expect.any(AbortSignal),
    }))
  })

  it('permite leer y enviar mensajes en una solicitud pendiente', async () => {
    const user = userEvent.setup()
    mocks.requestApi.mockResolvedValueOnce([
      { idMensaje: 1, idEmisor: 2, contenido: 'Hola Ana', fechaHora: '2026-11-01T12:00:00.000Z' },
    ])
    mocks.requestApi.mockResolvedValueOnce({ idMensaje: 2, idEmisor: 17, contenido: 'Gracias', fechaHora: '2026-11-01T12:01:00.000Z' })
    render(<ChatServicio solicitud={{ idSolicitud: 's-11', estado: 'Pendiente' }} />)

    expect(await screen.findByText('Hola Ana')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /mensaje/i }), 'Gracias')
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

    expect(mocks.requestApi).toHaveBeenCalledWith('/solicitudes/s-11/mensajes', {
      method: 'POST',
      body: { contenido: 'Gracias' },
    })
    expect(await screen.findByText('Gracias')).toBeInTheDocument()
  })
})
