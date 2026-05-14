export const FORMAT_SQUARE = {
  id: 'square',
  name: 'Quadrato',
  description: 'Classico Instagram. Stessa altezza e larghezza, perfetto per profile grid simmetrica.',
  aspect_label: '1:1',
  width: 1080,
  height: 1080,
  recommended: false,
  warning: null,
}

export const FORMAT_PORTRAIT = {
  id: 'portrait',
  name: 'Portrait',
  description: 'Formato consigliato da Meta nel 2026. Occupa il 35% in più di spazio verticale rispetto al quadrato, migliora reach ed engagement.',
  aspect_label: '4:5',
  width: 1080,
  height: 1350,
  recommended: true,
  warning: null,
}

export const FORMAT_LANDSCAPE = {
  id: 'landscape',
  name: 'Landscape',
  description: 'Formato orizzontale. Sconsigliato per slide con molto testo, adatto a contenuti grafici/illustrazioni.',
  aspect_label: '1.91:1',
  width: 1080,
  height: 566,
  recommended: false,
  warning: 'Sconsigliato per testo',
}
