import { BoldCorner } from './BoldCorner.jsx'
import './bold-corner.css'

export const boldCornerManifest = {
  id: 'system-bold-corner',
  name: 'Bold Corner',
  description: 'Layout manifesto — Archivo Black uppercase, angolo decorativo, mood diretto e impattante.',
  origin: 'system',
  default_palette_id: 'system-bold-yellow',
  supportedSlideTypes: ['cover', 'standard', 'divider', 'cta', 'quote'],
  Component: BoldCorner,
}
