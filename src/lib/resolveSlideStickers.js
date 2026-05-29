/**
 * Calcola la pila effettiva di sticker per una slide.
 * Combina sticker globali (con eventuale override o hide) e sticker locali,
 * rispettando l'ordine custom se presente.
 *
 * @param {object} slide - Oggetto slide (draft o salvato).
 * @param {object} theme - Tema del carousel (contiene global_stickers).
 * @returns {Array<object>} - Array di sticker effettivi con id valorizzato.
 */
export function resolveSlideStickers(slide, theme) {
  const globals   = theme?.global_stickers ?? []
  const hidden    = new Set(slide?.hidden_stickers ?? [])
  const overrides = slide?.sticker_overrides ?? {}
  const locals    = slide?.stickers ?? []

  // Globali visibili con eventuale patch applicata
  const effectiveGlobals = globals
    .filter((s) => !hidden.has(s.id))
    .map((s) => overrides[s.id] ? { ...s, ...overrides[s.id] } : s)

  // Pool completo: globali visibili + locali
  const pool = [...effectiveGlobals, ...locals]

  const order = slide?.sticker_order
  if (!order || order.length === 0) return pool

  // Applica ordine custom; sticker non in lista vengono appesi in coda
  const byId    = new Map(pool.map((s) => [s.id, s]))
  const ordered = order.map((id) => byId.get(id)).filter(Boolean)
  const inOrder = new Set(order)
  const tail    = pool.filter((s) => !inOrder.has(s.id))
  return [...ordered, ...tail]
}

/**
 * Materializza l'array sticker_order per una slide partendo dallo stato corrente.
 * Utile prima di un'operazione di riordino quando sticker_order non è ancora definito.
 *
 * @param {object} slide - Oggetto slide.
 * @param {object} theme - Tema del carousel.
 * @returns {Array<string>} - Array di id nell'ordine corrente.
 */
export function materializeOrder(slide, theme) {
  if (slide?.sticker_order?.length) return [...slide.sticker_order]
  return resolveSlideStickers(slide, theme).map((s) => s.id)
}
