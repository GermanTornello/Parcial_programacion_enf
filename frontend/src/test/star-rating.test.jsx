import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StarRating from '../components/StarRating.jsx'

describe('StarRating', () => {
  it('permite elegir una puntuación', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: '4 estrellas' }))

    expect(onChange).toHaveBeenCalledWith(4)
  })
})
