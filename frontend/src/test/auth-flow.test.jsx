import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext.jsx'
import { RutaProtegida } from '../App.jsx'
import Login from '../components/Login.jsx'

const { login } = vi.hoisted(() => ({ login: vi.fn() }))
vi.mock('../auth/authApi.js', () => ({ authApi: { login } }))

function withAuth(children, initialEntry = '/') {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    </AuthProvider>
  )
}

describe('autenticación y rutas protegidas', () => {
  beforeEach(() => {
    login.mockReset()
  })

  it('muestra el error del servidor cuando el login responde 401', async () => {
    login.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Correo o contraseña incorrectos' } },
    })
    render(withAuth(<Login />, '/login'))

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'ana@example.com' },
    })
    fireEvent.change(document.querySelector('input[type="password"]'), {
      target: { value: 'incorrecta' },
    })
    fireEvent.submit(document.querySelector('form'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
  })

  it('redirige al login si se intenta entrar sin token', () => {
    render(withAuth(
      <Routes>
        <Route path="/perfil-paciente" element={<RutaProtegida rol="paciente"><p>Perfil privado</p></RutaProtegida>} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>,
      '/perfil-paciente',
    ))

    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
    expect(screen.queryByText('Perfil privado')).not.toBeInTheDocument()
  })
})
