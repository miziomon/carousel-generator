// Header Bold Corner: triangolo decorativo, "// //", box numerazione, kicker.
// I toggle show_topline e show_dot del theme.header sono ignorati (sostituiti dall'angolo).
export function BoldHeader({ theme, slide, total }) {
  const { kicker_default, show_meta_number } = theme.header
  const kicker = slide.kicker !== undefined ? slide.kicker : kicker_default
  const showNum = show_meta_number !== false

  return (
    <>
      {/* Triangolo rettangolo decorativo in alto a destra */}
      <div className="bold__corner" aria-hidden="true" />
      {/* "// //" sovrapposto all'angolo — contrasto invertito */}
      <div className="bold__slash" aria-hidden="true">{'// //'}</div>
      {/* Box numerazione in alto a sinistra */}
      {showNum && (
        <div className="bold__num-box">
          {String(slide.num).padStart(2, '0')}
          {total ? ` / ${String(total).padStart(2, '0')}` : ''}
        </div>
      )}
      {kicker && <div className="bold__kicker">{kicker}</div>}
    </>
  )
}
