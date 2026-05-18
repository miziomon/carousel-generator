import { getFont } from './registry.js';
import { getCompensation } from './compensations.js';

/**
 * Risolve il font effettivo per uno slot semantico del theme.
 * Restituisce CSS variables pronte per essere applicate inline sul wrapper del template.
 *
 * @param {'primary'|'secondary'|'mono'} slot
 * @param {object} theme - Il theme del carosello (deve avere theme.fonts)
 * @param {{ fontId?: string, sizePx?: number }} [overrides] - Override per-slide opzionali
 * @returns {object} Oggetto con chiavi CSS variable
 */
export function resolveFontVars(slot, theme, overrides = {}) {
  const fontId = overrides.fontId ?? theme.fonts?.[slot];
  const font = getFont(fontId);
  const comp = getCompensation(font.id);
  const sizeBase = overrides.sizePx ?? theme.fonts?.sizes?.[slot] ?? 68;

  return {
    '--font-family': font.css_family,
    '--font-weight': String(comp.weight),
    '--font-letter-spacing': comp.letter_spacing,
    '--font-line-height-multiplier': String(comp.line_height_multiplier),
    '--font-size-multiplier': String(comp.font_size_multiplier ?? 1),
    '--font-text-transform': comp.text_transform,
    '--font-variation-settings': comp.font_variation_settings ?? 'normal',
    '--font-size-base': String(sizeBase),
  };
}

/**
 * Risolve il font per una singola slide, applicando gli override per-slide
 * (font_id_override, font_size_override) sopra le impostazioni globali del tema.
 *
 * @param {object} slide - La slide con eventuali campi font_id_override / font_size_override
 * @param {object} theme - Il theme del carosello
 * @returns {object} Oggetto con chiavi CSS variable
 */
export function resolveSlideFont(slide, theme) {
  const slot = slide.font ?? 'primary';
  return resolveFontVars(slot, theme, {
    fontId: slide.font_id_override,
    sizePx: slide.font_size_override,
  });
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
