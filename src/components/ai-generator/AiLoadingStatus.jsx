import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const LOADING_MESSAGES = [
  'Analisi del testo in corso…',
  'Identificazione della struttura argomentativa…',
  'Costruzione delle slide…',
  'Applicazione degli highlight…',
  'Validazione della risposta…',
]

export function AiLoadingStatus({ isGenerating }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!isGenerating) {
      setIndex(0)
      return
    }
    const interval = setInterval(() => {
      setIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1))
    }, 3500)
    return () => clearInterval(interval)
  }, [isGenerating])

  if (!isGenerating) return null

  return (
    <div className="ai-modal__loading-status">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className="ai-modal__loading-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {LOADING_MESSAGES[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
