/**
 * Banner informativo sul numero di caroselli usati come few-shot.
 * count: paletteLibrary.length (placeholder — sarà sostituito con lista caroselli storici)
 */
export function AiInfoBanner({ count }) {
  return (
    <div className="ai-form__info-banner" role="note">
      <span className="ai-form__info-banner__icon" aria-hidden="true">ⓘ</span>
      <span className="ai-form__info-banner__text">
        {count > 0 ? (
          <>
            {"L'AI userà come riferimento i tuoi "}
            <strong>{count}</strong>
            {" caroselli più recenti per imparare il tuo stile."}
          </>
        ) : (
          "Non hai ancora caroselli salvati. L'AI userà solo le sue regole generali. Lo stile migliorerà dopo i primi caroselli."
        )}
      </span>
    </div>
  )
}
