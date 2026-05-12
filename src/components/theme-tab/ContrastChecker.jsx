import { useContrastCheck } from '../../hooks/useContrastCheck.js'

/**
 * Mostra i rapporti di contrasto WCAG 2.1 per le coppie di colori chiave.
 * Si aggiorna live mentre l'utente modifica la palette tramite i ColorPicker.
 *
 * @param {object} palette — oggetto palette con i 6 colori
 */
export function ContrastChecker({ palette }) {
  const checks = useContrastCheck(palette)

  return (
    <div className="contrast-checker">
      <h4 className="contrast-checker__title">Verifica contrasto WCAG</h4>

      {checks.map(({ label, ratio, level, pass }) => (
        <div
          key={label}
          className={`contrast-checker__row contrast-checker__row--${pass ? 'pass' : 'warn'}`}
        >
          <span className="contrast-checker__label">{label}</span>
          <span className="contrast-checker__ratio">{ratio}&nbsp;:&nbsp;1</span>
          {/* Converte 'AA-large' → 'aalarge' per usarlo come modificatore BEM */}
          <span
            className={`contrast-checker__level contrast-checker__level--${level
              .toLowerCase()
              .replace('-', '')}`}
          >
            {level}
          </span>
        </div>
      ))}
    </div>
  )
}
