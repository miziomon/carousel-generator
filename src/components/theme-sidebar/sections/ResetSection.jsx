import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { ThemeSection } from '../ThemeSection.jsx'
import { ConfirmDialog } from '../../ui/ConfirmDialog.jsx'
import { Button } from '../../ui/Button.jsx'
import { defaultCarousel } from '../../../lib/defaultCarousel.js'

export function ResetSection({ isOpen, onToggle, onChange }) {
  const [showConfirm, setShowConfirm] = useState(false)

  function handleReset() {
    onChange(defaultCarousel.theme)
    setShowConfirm(false)
  }

  return (
    <>
      <ThemeSection id="reset" title="Reset" icon={RotateCcw} isOpen={isOpen} onToggle={onToggle}>
        <Button variant="danger" size="sm" onClick={() => setShowConfirm(true)}>
          Reset al tema di default
        </Button>
      </ThemeSection>

      <ConfirmDialog
        open={showConfirm}
        title="Reset tema"
        message="Vuoi ripristinare tutti i valori del tema alle impostazioni di default?"
        confirmLabel="Reset"
        confirmVariant="danger"
        onConfirm={handleReset}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
