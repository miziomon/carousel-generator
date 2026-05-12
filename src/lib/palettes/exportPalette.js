import { saveAs } from 'file-saver'

/**
 * Esporta una palette come file JSON standalone.
 * Il nome del file è derivato dal nome della palette (slug).
 *
 * Formato di esportazione:
 * {
 *   "_type": "carosello-palette",
 *   "_version": "1.0",
 *   "palette": { id, name, description, origin, colors }
 * }
 *
 * La versione esportata mantiene l'origin del file originale,
 * ma all'importazione viene forzato origin: "user".
 */
export function exportPalette(palette) {
  const payload = {
    _type:    'carosello-palette',
    _version: '1.0',
    palette: {
      id:          palette.id,
      name:        palette.name,
      description: palette.description ?? '',
      origin:      palette.origin,
      colors:      { ...palette.colors },
    },
  }

  // Genera un slug leggibile dal nome della palette per il nome file
  const slug = palette.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  saveAs(blob, `palette-${slug}.json`)
}
