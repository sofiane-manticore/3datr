import type { Vec3 } from '../math'

/** Valeur d'uniform : nombre (float), vecteur (vec3), couleur « #rrggbb » (vec3) ou booléen. */
export type ValeurUniform = number | Vec3 | string | boolean

export const SENTINELLE = '// --- code du module ---'

export const typeGlsl = (v: ValeurUniform) => (typeof v === 'number' ? 'float' : typeof v === 'boolean' ? 'bool' : 'vec3')

/** Couleur « #rrggbb » en vec3 0..1, sans conversion d'espace colorimétrique (ce que l'on voit est ce que l'on écrit). */
export function hexVersVec3(hex: string): Vec3 {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export const valeurGl = (v: ValeurUniform): number | boolean | Vec3 => (typeof v === 'string' ? hexVersVec3(v) : v)

/**
 * Vertex shader commun. vNormal (monde) et vPosition (objet) sont donnés en Z-up,
 * comme dans Blender et Unreal : (0, 0, 1) est le haut. three.js travaille en Y-up,
 * d'où la conversion (x, y, z) → (x, −z, y).
 */
export const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
vec3 versZup(vec3 p) { return vec3(p.x, -p.z, p.y); }
void main() {
  vUv = uv;
  vPosition = versZup(position);
  vNormal = versZup(normalize(mat3(modelMatrix) * normal));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

/** En-tête commun : varyings, uTemps et une déclaration par uniform du module. */
export function fragmentComplet(code: string, uniforms: Record<string, ValeurUniform>) {
  const decl = Object.entries(uniforms)
    .map(([n, v]) => `uniform ${typeGlsl(v)} ${n};`)
    .join('\n')
  return `varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTemps;
${decl}
${SENTINELLE}
${code}`
}

export interface ErreurGlsl {
  ligne: number | null
  message: string
}

/**
 * Lit le journal du compilateur GLSL (« ERROR: 0:42: 'x' : undeclared identifier »)
 * et ramène les numéros de ligne à ceux du code du module, sans l'en-tête ajouté par three.js.
 */
export function lireErreurs(journal: string, source: string): ErreurGlsl[] {
  const lignes = source.split('\n')
  const s = lignes.findIndex((l) => l.trim() === SENTINELLE) + 1 // ligne (1-based) de la sentinelle
  return journal
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(?:ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/)
      if (!m) return { ligne: null, message: l }
      const n = Number(m[1]) - s
      return { ligne: s > 0 && n >= 1 ? n : null, message: m[2].replace(/^'([^']*)'\s*:\s*/, '« $1 » : ') }
    })
}
