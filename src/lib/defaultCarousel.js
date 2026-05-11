// Scheletro istruttivo di 3 slide: mostra cover, standard con tag inline, e cta.
// Usato per "Nuovo progetto" e come stato iniziale se localStorage è vuoto.
export const defaultCarousel = {
  _schema: {
    version: '1.0',
    description: 'Pensieri in pillole — carosello editoriale',
  },
  title: 'Pensieri in pillole',
  theme: {
    palette: {
      background: '#0a0e1a',
      foreground: '#e8e8e8',
      accent: '#00ffaa',
      muted: 'rgba(232,232,232,0.45)',
      line: 'rgba(232,232,232,0.18)',
    },
    header: {
      kicker_default: 'Pensieri in pillole',
      show_topline: true,
      show_dot: true,
    },
    footer: {
      name: 'Maurizio Pelizzone',
      show_separator_line: true,
      show_meta_number: true,
    },
    fonts: {
      primary: 'Archivo Black',
      secondary: 'Fraunces',
      mono: 'JetBrains Mono',
    },
  },
  slides: [
    {
      num: 1,
      type: 'cover',
      kicker: null,
      font: 'archivo',
      size: 'cover',
      lines: ['Il titolo della puntata'],
      show_swipe_arrow: true,
      _note_autore: 'Slide di copertina — modifica il testo sopra',
    },
    {
      num: 2,
      type: 'standard',
      kicker: null,
      font: 'archivo',
      size: 'lg',
      lines: [
        'I tag inline colora[n]o il testo:',
        '',
        '[hl]blocco verde[/hl]',
        '[soft]blocco crema[/soft]',
        '[c]solo colore[/c]',
        '[u]sottolineato[/u]',
        '[em]corsivo[/em]',
      ],
      _note_autore: 'Slide esempio con tutti i tag inline — sostituisci con il contenuto reale',
    },
    {
      num: 3,
      type: 'cta',
      kicker: 'Seguimi',
      font: 'archivo',
      size: null,
      cta_items: ['→ @tuoaccount', '→ Link in bio', '→ Salva per dopo'],
      _note_autore: 'Slide call-to-action finale',
    },
  ],
}
