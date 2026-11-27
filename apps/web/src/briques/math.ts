/** Petits outils de calcul vectoriel partagés par les modules (sans dépendance à three.js). */
export type Vec3 = [number, number, number]

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a)
  return l < 1e-9 ? [0, 0, 0] : scale(a, 1 / l)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
export const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x))
export const smoothstep = (e0: number, e1: number, x: number) => {
  if (e0 === e1) return x < e0 ? 0 : 1
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
export const step = (seuil: number, x: number) => (x < seuil ? 0 : 1)
/** Map Range linéaire de Blender, avec écrêtage optionnel. */
export const mapRange = (x: number, deMin: number, deMax: number, versMin: number, versMax: number, ecreter = true) => {
  if (deMax === deMin) return versMin
  const t = (x - deMin) / (deMax - deMin)
  return lerp(versMin, versMax, ecreter ? clamp(t, 0, 1) : t)
}
/** Angle entre deux vecteurs, en radians (0 si l'un est nul). */
export const angle = (a: Vec3, b: Vec3) => {
  const l = length(a) * length(b)
  return l < 1e-9 ? 0 : Math.acos(clamp(dot(a, b) / l, -1, 1))
}
/** Arrondi d'affichage : évite « -0 » et les 0.30000000000000004. */
export const arrondi = (x: number, decimales = 2) => {
  const k = 10 ** decimales
  const r = Math.round(x * k) / k
  return Object.is(r, -0) ? 0 : r
}
export const formater = (x: number, decimales = 2) => arrondi(x, decimales).toFixed(decimales).replace('-', '−')
