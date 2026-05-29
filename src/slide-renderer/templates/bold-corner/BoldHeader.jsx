// Header Bold Corner: triangolo decorativo, numerazione slide nell'angolo, kicker.
// I toggle show_topline e show_dot del theme.header sono ignorati (sostituiti dall'angolo).
export function BoldHeader({ theme, slide, total }) {
  const { kicker_default, show_meta_number } = theme.header
  const kicker = slide.kicker !== undefined ? slide.kicker : kicker_default
  const showNum = show_meta_number !== false

  return (
    <>
      {/* Triangolo rettangolo decorativo in alto a destra */}
      <div className="bold__corner" aria-hidden="true" />
      {/* Numero slide sovrapposto all'angolo — contrasto invertito, nessuno sfondo */}
      {showNum && (
        <div className="bold__corner-num">
          {slide.num}{total ? `/${total}` : ''}
        </div>
      )}
      {kicker && <div className="bold__kicker">{kicker}</div>}
    </>
  )
}
