import { getFont } from './registry.js';
import { getCompensation } from './compensations.js';

/**
 * Risolve il font effettivo per uno slot semantico del theme.
 * Restituisce CSS variables pronte per essere applicate inline sul wrapper del template.
 *
 * @param {'primary'|'secondary'|'mono'} slot
 * @param {object} theme - Il theme del carosello (deve avere theme.fonts)
 * @returns {object} Oggetto con chiavi CSS variable
 */
export function resolveFontVars(slot, theme) {
  const fontId = theme.fonts?.[slot];
  const font = getFont(fontId);
  const comp = getCompensation(font.id);

  return {
    '--font-family': font.css_family,
    '--font-weight': String(comp.weight),
    '--font-letter-spacing': comp.letter_spacing,
    '--font-line-height-multiplier': String(comp.line_height_multiplier),
    '--font-size-multiplier': String(comp.font_size_multiplier ?? 1),
    '--font-text-transform': comp.text_transform,
    '--font-variation-settings': comp.font_variation_settings ?? 'normal',
  };
}

/**
 * Calcola i font effettivi considerando un eventuale stato di preview temporaneo.
 * Il fontPreview NON è in history e NON va persistito.
 *
 * @param {object} theme
 * @param {object|null} fontPreview - { slot, fontId } oppure null
 * @returns {object} theme.fonts con eventuale override temporaneo
 */
export function effectiveFonts(theme, fontPreview) {
  if (!fontPreview) return theme.fonts;
  return { ...theme.fonts, [fontPreview.slot]: fontPreview.fontId };
}
