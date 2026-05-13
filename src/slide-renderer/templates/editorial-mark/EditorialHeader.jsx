// Header Editorial Mark: topline, dot accent, numero slide, kicker
export function EditorialHeader({ theme, slide, total }) {
  const { show_topline, show_dot, kicker_default, show_meta_number } = theme.header
  const kicker = slide.kicker !== undefined ? slide.kicker : kicker_default
  const showNum = show_meta_number !== false

  return (
    <>
      {show_topline && <div className="editorial__topline" />}
      {show_dot && <div className="editorial__dot" />}
      {showNum && (
        <div className="editorial__num">
          {String(slide.num).padStart(2, '0')}
          {total ? ` / ${String(total).padStart(2, '0')}` : ''}
        </div>
      )}
      {kicker && <div className="editorial__kicker">{kicker}</div>}
    </>
  )
}
