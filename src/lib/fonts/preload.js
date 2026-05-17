import { FONTS } from './registry.js';

let preloadStarted = false;

/**
 * Carica tutti i 12 font tramite FontFace API, così il dropdown mostra
 * le opzioni nel font corretto. Idempotente: la seconda chiamata è no-op.
 */
export async function preloadAllFonts() {
  if (preloadStarted) return;
  preloadStarted = true;

  const promises = FONTS.map(font =>
    document.fonts.load(`16px "${font.id}"`).catch(() => null)
  );
  await Promise.all(promises);
}
