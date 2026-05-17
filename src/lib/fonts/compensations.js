// Compensazioni tipografiche per-font rispetto ai default di calibrazione del template.
// Questi valori sono stime iniziali da verificare visivamente. Per modificarli, tocca
// solo questo file — i template non vanno toccati.
export const FONT_COMPENSATIONS = {
  'Archivo Black': {
    letter_spacing: '-0.03em',
    line_height_multiplier: 1.0,
    weight: 900,
    text_transform: 'none',
    font_size_multiplier: 1,
  },
  'Bebas Neue': {
    letter_spacing: '0.01em',
    line_height_multiplier: 0.95,
    weight: 400,
    text_transform: 'uppercase',
    font_size_multiplier: 1.15,
  },
  'Anton': {
    letter_spacing: '0.005em',
    line_height_multiplier: 0.92,
    weight: 400,
    text_transform: 'none',
    font_size_multiplier: 1.08,
  },
  'Oswald': {
    letter_spacing: '0',
    line_height_multiplier: 0.98,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 1.05,
  },
  'Inter': {
    letter_spacing: '-0.025em',
    line_height_multiplier: 1.05,
    weight: 800,
    text_transform: 'none',
    font_size_multiplier: 0.92,
  },
  'DM Sans': {
    letter_spacing: '-0.02em',
    line_height_multiplier: 1.02,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.96,
  },
  'Plus Jakarta Sans': {
    letter_spacing: '-0.025em',
    line_height_multiplier: 1.03,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.94,
  },
  'Manrope': {
    letter_spacing: '-0.02em',
    line_height_multiplier: 1.04,
    weight: 800,
    text_transform: 'none',
    font_size_multiplier: 0.94,
  },
  'Fraunces': {
    letter_spacing: '-0.02em',
    line_height_multiplier: 1.05,
    weight: 900,
    text_transform: 'none',
    font_size_multiplier: 0.97,
    font_variation_settings: '"opsz" 144',
  },
  'Playfair Display': {
    letter_spacing: '-0.015em',
    line_height_multiplier: 1.02,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.94,
  },
  'DM Serif Display': {
    letter_spacing: '-0.01em',
    line_height_multiplier: 1.0,
    weight: 400,
    text_transform: 'none',
    font_size_multiplier: 0.92,
  },
  'Lora': {
    letter_spacing: '-0.01em',
    line_height_multiplier: 1.08,
    weight: 700,
    text_transform: 'none',
    font_size_multiplier: 0.96,
  },
  'JetBrains Mono': {
    letter_spacing: '0.18em',
    line_height_multiplier: 1.0,
    weight: 600,
    text_transform: 'uppercase',
    font_size_multiplier: 1.0,
  },
};

export function getCompensation(fontId) {
  return FONT_COMPENSATIONS[fontId] ?? FONT_COMPENSATIONS['Archivo Black'];
}
