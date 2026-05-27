/**
 * Freccia scorri condivisa tra i template.
 * Decide la visibilità in base a theme.footer.swipe e alla posizione della slide.
 *
 * @param {{ slide, total, theme, label, className }} props
 *   label    — testo specifico del template (es. "SCORRI →", "→ SWIPE")
 *   className — classe BEM del template (es. "editorial__swipe-mini")
 */
export function SwipeArrow({ slide, total, theme, label, className }) {
  const swipe = theme?.footer?.swipe
  if (!swipe?.enabled) return null

  const { scope, position_y, font_size } = swipe

  if (scope === 'cover' && slide.type !== 'cover') return null
  if (scope === 'all-but-last' && slide.num === total) return null

  return (
    <div
      className={className}
      style={{
        bottom:   `${position_y}px`,
        fontSize: `${font_size}px`,
      }}
    >
      {label}
    </div>
  )
}
