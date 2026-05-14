import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormatSelector } from '../components/format-selector/FormatSelector.jsx'

describe('FormatSelector', () => {
  it('mostra 3 opzioni di formato', () => {
    render(<FormatSelector currentId="square" onSelect={() => {}} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
  })

  it('portrait ha il badge "consigliato"', () => {
    render(<FormatSelector currentId="square" onSelect={() => {}} />)
    expect(screen.getByText('consigliato')).toBeTruthy()
  })

  it('landscape ha il badge warning', () => {
    render(<FormatSelector currentId="square" onSelect={() => {}} />)
    const badges = screen.getAllByText(/Sconsigliato/)
    const warningBadge = badges.find((el) => el.className.includes('badge--warning'))
    expect(warningBadge).toBeTruthy()
  })

  it('click su un formato chiama onSelect con il formatId corretto', () => {
    const onSelect = vi.fn()
    render(<FormatSelector currentId="square" onSelect={onSelect} />)
    // secondo option (Portrait, indice 1) — non cerchiamo per nome perché il testo
    // della descrizione di Portrait contiene la parola "quadrato"
    const options = screen.getAllByRole('option')
    fireEvent.click(options[1])
    expect(onSelect).toHaveBeenCalledWith('portrait')
  })

  it("l'opzione attiva ha aria-selected=true", () => {
    render(<FormatSelector currentId="portrait" onSelect={() => {}} />)
    const options = screen.getAllByRole('option')
    expect(options[1].getAttribute('aria-selected')).toBe('true')
    expect(options[0].getAttribute('aria-selected')).toBe('false')
  })

  it('click su formato già attivo chiama onSelect comunque', () => {
    const onSelect = vi.fn()
    render(<FormatSelector currentId="square" onSelect={onSelect} />)
    const options = screen.getAllByRole('option')
    fireEvent.click(options[0])
    expect(onSelect).toHaveBeenCalledWith('square')
  })
})
