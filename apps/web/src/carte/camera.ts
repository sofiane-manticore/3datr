/** Caméra 2D de la carte : centre (x, y) en unités de la carte, et facteur de zoom k (pixels par unité). */
export interface Camera {
  x: number
  y: number
  k: number
}

export const ZOOM_MIN = 0.12
export const ZOOM_MAX = 4

export const borner = (k: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k))

export function versEcran(c: Camera, l: number, h: number, x: number, y: number) {
  return { x: (x - c.x) * c.k + l / 2, y: (y - c.y) * c.k + h / 2 }
}

export function versCarte(c: Camera, l: number, h: number, sx: number, sy: number) {
  return { x: (sx - l / 2) / c.k + c.x, y: (sy - h / 2) / c.k + c.y }
}

/** Zoome d'un facteur f en gardant fixe le point de l'écran (sx, sy), comme une molette sous le curseur. */
export function zoomerAutour(c: Camera, l: number, h: number, sx: number, sy: number, f: number): Camera {
  const k = borner(c.k * f)
  const p = versCarte(c, l, h, sx, sy)
  return { k, x: p.x - (sx - l / 2) / k, y: p.y - (sy - h / 2) / k }
}

/** Caméra qui fait tenir le rectangle donné dans l'écran, avec une marge en pixels. */
export function cadrer(
  boite: { minX: number; minY: number; maxX: number; maxY: number },
  l: number,
  h: number,
  marge = 40,
): Camera {
  const lb = Math.max(1, boite.maxX - boite.minX)
  const hb = Math.max(1, boite.maxY - boite.minY)
  const k = borner(Math.min((l - 2 * marge) / lb, (h - 2 * marge) / hb))
  return { x: (boite.minX + boite.maxX) / 2, y: (boite.minY + boite.maxY) / 2, k }
}

/** Interpolation de caméra « vol » : le zoom varie en log, pour que le trajet paraisse régulier. */
export function interpoler(a: Camera, b: Camera, t: number): Camera {
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  return {
    x: a.x + (b.x - a.x) * e,
    y: a.y + (b.y - a.y) * e,
    k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * e),
  }
}
