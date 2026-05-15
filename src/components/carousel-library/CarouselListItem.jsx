import { Button } from '../ui/Button.jsx'
import { timeAgo } from '../../lib/utils/timeAgo.js'

/**
 * Singola card nella lista della libreria.
 */
export function CarouselListItem({ item, isCurrent, onOpen, onRename, onDelete }) {
  const isWide = item.format && item.format !== 'square'

  return (
    <div className={`carousel-list-item${isCurrent ? ' carousel-list-item--current' : ''}`}>
      {/* Thumbnail */}
      <div className={`carousel-list-item__thumb${isWide ? ' carousel-list-item__thumb--wide' : ''}`}>
        {item.thumbnail
          ? <img src={item.thumbnail} alt={item.title} loading="lazy" />
          : null}
      </div>

      {/* Info */}
      <div className="carousel-list-item__body">
        <div className="carousel-list-item__title">
          <span title={item.title}>{item.title}</span>
          {item.ai_generated && (
            <span className="carousel-list-item__badge">AI</span>
          )}
          {isCurrent && (
            <span className="carousel-list-item__badge carousel-list-item__badge--current">aperto</span>
          )}
        </div>
        <div className="carousel-list-item__meta">
          {item.slide_count} slide · Salvato {timeAgo(item.updated_at)}
        </div>
        <div className="carousel-list-item__actions">
          <Button variant="primary" size="sm" onClick={() => onOpen(item)}>Apri</Button>
          <Button variant="ghost" size="sm" onClick={() => onRename(item)}>Rinomina</Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(item)}>Elimina</Button>
        </div>
      </div>
    </div>
  )
}
