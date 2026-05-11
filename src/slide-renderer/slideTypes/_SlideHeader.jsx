// Header condiviso: topline, dot, numero slide, kicker
export function SlideHeader({ theme, slide, total }) {
  const { show_topline, show_dot, kicker_default } = theme.header
  const kicker = slide.kicker !== undefined ? slide.kicker : kicker_default

  return (
    <>
      {show_topline && <div className="slide__topline" />}
      {show_dot && <div className="slide__dot" />}
      <div className="slide__num">
        {String(slide.num).padStart(2, '0')}
        {total ? ` / ${String(total).padStart(2, '0')}` : ''}
      </div>
      {kicker && <div className="slide__kicker">{kicker}</div>}
    </>
  )
}
