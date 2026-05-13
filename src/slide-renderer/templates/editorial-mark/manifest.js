import { EditorialMark } from './EditorialMark.jsx'
import './editorial-mark.css'

export const editorialMarkManifest = {
  id: 'system-editorial-mark',
  name: 'Editorial Mark',
  description: 'Linea editoriale con dot accent e numerazione monospace. Tono autorevole, riflessivo.',
  origin: 'system',
  default_palette_id: 'system-tech-dark',
  supportedSlideTypes: ['cover', 'standard', 'divider', 'cta', 'quote'],
  Component: EditorialMark,
}
