// Header condiviso: topline, dot, numero slide, kicker
export function SlideHeader({ theme, slide, total }) {
  const { show_topline, show_dot, kicker_default, show_meta_number } = theme.header
  const kicker = slide.kicker !== undefined ? slide.kicker : kicker_default

  // Retrocompatibilita': se il campo non e' presente (vecchi caroselli),
  // mantieni il comportamento attuale (numerazione visibile).
  const showNum = show_meta_number !== false

  return (
    <>
      {show_topline && <div className="slide__topline" />}
      {show_dot && <div className="slide__dot" />}
      {showNum && (
        <div className="slide__num">
          {String(slide.num).padStart(2, '0')}
          {total ? ` / ${String(total).padStart(2, '0')}` : ''}
        </div>
      )}
      {kicker && <div className="slide__kicker">{kicker}</div>}
    </>
  )
}
