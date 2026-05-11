// Footer condiviso: linea separatrice, nome autore, numerazione meta
export function SlideFooter({ theme, slide, total }) {
  const { name, show_separator_line, show_meta_number } = theme.footer

  if (!show_separator_line && !name && !show_meta_number) return null

  return (
    <div className="slide__foot" style={{ borderTop: show_separator_line ? undefined : 'none' }}>
      {name && <span className="slide__foot-name">{name}</span>}
      {show_meta_number && (
        <span className="slide__foot-meta">
          {String(slide.num).padStart(2, '0')}
          {total ? ` / ${String(total).padStart(2, '0')}` : ''}
        </span>
      )}
    </div>
  )
}
