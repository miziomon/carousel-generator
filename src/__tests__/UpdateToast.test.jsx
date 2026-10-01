import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpdateToast } from '../components/update-toast/UpdateToast.jsx'

describe('UpdateToast', () => {
  it('non renderizza nulla quando non c è una nuova versione', () => {
    const { container } = render(<UpdateToast visible={false} onReload={vi.fn()} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra l avviso come status accessibile quando visible', () => {
    render(<UpdateToast visible onReload={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Nuova versione disponibile')
    expect(screen.getByRole('button', { name: 'Aggiorna ora' })).toBeInTheDocument()
  })

  it('"Aggiorna ora" chiama onReload', () => {
    const onReload = vi.fn()
    render(<UpdateToast visible onReload={onReload} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Aggiorna ora' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('la chiusura chiama onDismiss e non aggiorna', () => {
    const onReload = vi.fn()
    const onDismiss = vi.fn()
    render(<UpdateToast visible onReload={onReload} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi avviso' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onReload).not.toHaveBeenCalled()
  })
})
