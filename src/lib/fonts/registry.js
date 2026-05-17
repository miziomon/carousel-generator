import { FONT_CATEGORIES } from './categories.js';

export const FONTS = [
  // DISPLAY
  {
    id: 'Archivo Black',
    category: 'display',
    label: 'Archivo Black',
    css_family: '"Archivo Black", sans-serif',
    weights: [900],
    italic: false,
    is_variable: false,
    files: ['archivo-black.woff2'],
  },
  {
    id: 'Bebas Neue',
    category: 'display',
    label: 'Bebas Neue',
    css_family: '"Bebas Neue", sans-serif',
    weights: [400],
    italic: false,
    is_variable: false,
    files: ['BebasNeue-Regular.woff2'],
    notes: 'All-caps only',
  },
  {
    id: 'Anton',
    category: 'display',
    label: 'Anton',
    css_family: '"Anton", sans-serif',
    weights: [400],
    italic: false,
    is_variable: false,
    files: ['Anton-Regular.woff2'],
  },
  {
    id: 'Oswald',
    category: 'display',
    label: 'Oswald',
    css_family: '"Oswald", sans-serif',
    weights: [700],
    italic: false,
    is_variable: false,
    files: ['Oswald-700.woff2'],
  },

  // SANS
  {
    id: 'Inter',
    category: 'sans',
    label: 'Inter',
    css_family: '"Inter", sans-serif',
    weights: [400, 800],
    italic: false,
    is_variable: true,
    files: ['Inter-Variable.ttf'],
  },
  {
    id: 'DM Sans',
    category: 'sans',
    label: 'DM Sans',
    css_family: '"DM Sans", sans-serif',
    weights: [500, 700],
    italic: false,
    is_variable: false,
    files: ['DMSans-500.woff2', 'DMSans-700.woff2'],
  },
  {
    id: 'Plus Jakarta Sans',
    category: 'sans',
    label: 'Plus Jakarta Sans',
    css_family: '"Plus Jakarta Sans", sans-serif',
    weights: [600, 700],
    italic: false,
    is_variable: false,
    files: ['PlusJakartaSans-600.woff2', 'PlusJakartaSans-700.woff2'],
  },
  {
    id: 'Manrope',
    category: 'sans',
    label: 'Manrope',
    css_family: '"Manrope", sans-serif',
    weights: [400, 800],
    italic: false,
    is_variable: true,
    files: ['Manrope-Variable.ttf'],
  },

  // SERIF
  {
    id: 'Fraunces',
    category: 'serif',
    label: 'Fraunces',
    css_family: '"Fraunces", serif',
    weights: [100, 900],
    italic: false,
    is_variable: true,
    files: ['fraunces-variable.woff2'],
  },
  {
    id: 'Playfair Display',
    category: 'serif',
    label: 'Playfair Display',
    css_family: '"Playfair Display", serif',
    weights: [700],
    italic: true,
    is_variable: false,
    files: ['PlayfairDisplay-700.woff2', 'PlayfairDisplay-700Italic.woff2'],
  },
  {
    id: 'DM Serif Display',
    category: 'serif',
    label: 'DM Serif Display',
    css_family: '"DM Serif Display", serif',
    weights: [400],
    italic: false,
    is_variable: false,
    files: ['DMSerifDisplay-Regular.woff2'],
  },
  {
    id: 'Lora',
    category: 'serif',
    label: 'Lora',
    css_family: '"Lora", serif',
    weights: [400, 700],
    italic: false,
    is_variable: true,
    files: ['Lora-Variable.ttf'],
  },

  // MONO
  {
    id: 'JetBrains Mono',
    category: 'mono',
    label: 'JetBrains Mono',
    css_family: '"JetBrains Mono", monospace',
    weights: [400, 600],
    italic: false,
    is_variable: false,
    files: ['jetbrains-mono-400.woff2', 'jetbrains-mono-600.woff2'],
  },
];

export function getFont(id) {
  return FONTS.find(f => f.id === id) ?? FONTS[0];
}

export function getFontsForRole(role) {
  return FONTS.filter(f => FONT_CATEGORIES[f.category].roles.includes(role));
}

export const FONT_IDS = FONTS.map(f => f.id);
