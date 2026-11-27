import type { Vec3 } from '../math'

/**
 * Bibliothèque du mini éditeur de nodes et compilateur du graphe en fragment shader GLSL.
 * Les noms suivent Blender (Math, Vector Math, Map Range, Mix, Separate XYZ…), en français.
 * Comme dans Blender, un float branché dans une entrée vecteur devient (f, f, f)
 * et un vecteur branché dans une entrée float donne la moyenne de ses composantes.
 */

export type TypeSocket = 'float' | 'vecteur' | 'couleur'
export type ValeurSocket = number | Vec3

export interface DefSocket {
  nom: string
  type: TypeSocket
  defaut?: ValeurSocket
  /** Expression GLSL utilisée quand l'entrée n'est pas branchée et n'a pas de valeur (ex. coordonnées UV). */
  implicite?: string
}

export type DefParam =
  | { nom: string; type: 'choix'; defaut: string; options: { valeur: string; libelle: string }[] }
  | { nom: string; type: 'nombre'; defaut: number; pas?: number }
  | { nom: string; type: 'couleur'; defaut: string }

export type Categorie = 'entree' | 'math' | 'vecteur' | 'couleur' | 'convertisseur' | 'texture' | 'sortie'

export interface DefNoeud {
  type: string
  titre: string
  categorie: Categorie
  entrees: DefSocket[]
  sorties: DefSocket[]
  params?: DefParam[]
  /** Entrées affichées selon les paramètres (Math › Sinus n'a qu'une entrée). */
  entreesVisibles?: (p: Params) => string[]
  sortiesVisibles?: (p: Params) => string[]
  /** Reçoit les expressions GLSL des entrées (déjà converties au bon type), rend celles des sorties. */
  glsl: (e: Record<string, string>, p: Params) => Record<string, string>
  /** Fonctions GLSL auxiliaires à placer avant main(). */
  auxiliaires?: string
}

export type Params = Record<string, string | number>

export interface NoeudGraphe {
  id: string
  type: string
  x: number
  y: number
  params?: Params
  /** Valeurs des entrées non branchées. */
  valeurs?: Record<string, ValeurSocket>
}
export interface LienGraphe {
  de: string
  sortie: string
  vers: string
  entree: string
}
export interface Graphe {
  noeuds: NoeudGraphe[]
  liens: LienGraphe[]
}

export const f = (x: number) => {
  const s = String(Math.round(x * 1e5) / 1e5)
  return /[.e]/.test(s) ? s : `${s}.0`
}
const v3 = (v: Vec3) => `vec3(${v.map(f).join(', ')})`
export const hexVersVec3 = (hex: string): Vec3 => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const OPS_MATH: { valeur: string; libelle: string; glsl: (a: string, b: string) => string; unaire?: boolean }[] = [
  { valeur: 'add', libelle: 'Addition', glsl: (a, b) => `${a} + ${b}` },
  { valeur: 'subtract', libelle: 'Soustraction', glsl: (a, b) => `${a} - ${b}` },
  { valeur: 'multiply', libelle: 'Multiplication', glsl: (a, b) => `${a} * ${b}` },
  { valeur: 'divide', libelle: 'Division', glsl: (a, b) => `(${b} == 0.0 ? 0.0 : ${a} / ${b})` },
  { valeur: 'power', libelle: 'Puissance', glsl: (a, b) => `pow(max(${a}, 0.0), ${b})` },
  { valeur: 'sine', libelle: 'Sinus', glsl: (a) => `sin(${a})`, unaire: true },
  { valeur: 'cosine', libelle: 'Cosinus', glsl: (a) => `cos(${a})`, unaire: true },
  { valeur: 'fract', libelle: 'Fraction', glsl: (a) => `fract(${a})`, unaire: true },
  { valeur: 'absolute', libelle: 'Absolu', glsl: (a) => `abs(${a})`, unaire: true },
  { valeur: 'minimum', libelle: 'Minimum', glsl: (a, b) => `min(${a}, ${b})` },
  { valeur: 'maximum', libelle: 'Maximum', glsl: (a, b) => `max(${a}, ${b})` },
  { valeur: 'greater', libelle: 'Supérieur à', glsl: (a, b) => `step(${b}, ${a})` },
]

const OPS_VECTEUR: { valeur: string; libelle: string; vecteur?: (a: string, b: string, s: string) => string; valeur_?: (a: string, b: string) => string; entrees: string[] }[] = [
  { valeur: 'add', libelle: 'Addition', vecteur: (a, b) => `${a} + ${b}`, entrees: ['A', 'B'] },
  { valeur: 'subtract', libelle: 'Soustraction', vecteur: (a, b) => `${a} - ${b}`, entrees: ['A', 'B'] },
  { valeur: 'multiply', libelle: 'Multiplication', vecteur: (a, b) => `${a} * ${b}`, entrees: ['A', 'B'] },
  { valeur: 'scale', libelle: 'Échelle', vecteur: (a, _b, s) => `${a} * ${s}`, entrees: ['A', 'Échelle'] },
  { valeur: 'dot', libelle: 'Produit scalaire', valeur_: (a, b) => `dot(${a}, ${b})`, entrees: ['A', 'B'] },
  { valeur: 'cross', libelle: 'Produit vectoriel', vecteur: (a, b) => `cross(${a}, ${b})`, entrees: ['A', 'B'] },
  { valeur: 'length', libelle: 'Longueur', valeur_: (a) => `length(${a})`, entrees: ['A'] },
  { valeur: 'normalize', libelle: 'Normaliser', vecteur: (a) => `(length(${a}) > 0.0 ? normalize(${a}) : vec3(0.0))`, entrees: ['A'] },
]

export const NOEUDS: DefNoeud[] = [
  {
    type: 'coord-texture',
    titre: 'Texture Coordinate',
    categorie: 'entree',
    entrees: [],
    sorties: [
      { nom: 'UV', type: 'vecteur' },
      { nom: 'Objet', type: 'vecteur' },
      { nom: 'Normale', type: 'vecteur' },
    ],
    glsl: () => ({ UV: 'vec3(vUv, 0.0)', Objet: 'vPosition', Normale: 'normalize(vNormal)' }),
  },
  {
    type: 'temps',
    titre: 'Temps',
    categorie: 'entree',
    entrees: [],
    sorties: [{ nom: 'Secondes', type: 'float' }],
    glsl: () => ({ Secondes: 'uTemps' }),
  },
  {
    type: 'valeur',
    titre: 'Value',
    categorie: 'entree',
    entrees: [],
    sorties: [{ nom: 'Valeur', type: 'float' }],
    params: [{ nom: 'valeur', type: 'nombre', defaut: 0.5, pas: 0.05 }],
    glsl: (_e, p) => ({ Valeur: f(Number(p.valeur)) }),
  },
  {
    type: 'rgb',
    titre: 'RGB',
    categorie: 'entree',
    entrees: [],
    sorties: [{ nom: 'Couleur', type: 'couleur' }],
    params: [{ nom: 'couleur', type: 'couleur', defaut: '#4dabf7' }],
    glsl: (_e, p) => ({ Couleur: v3(hexVersVec3(String(p.couleur))) }),
  },
  {
    type: 'math',
    titre: 'Math',
    categorie: 'convertisseur',
    entrees: [
      { nom: 'A', type: 'float', defaut: 0.5 },
      { nom: 'B', type: 'float', defaut: 0.5 },
    ],
    sorties: [{ nom: 'Valeur', type: 'float' }],
    params: [{ nom: 'operation', type: 'choix', defaut: 'add', options: OPS_MATH.map(({ valeur, libelle }) => ({ valeur, libelle })) }],
    entreesVisibles: (p) => (OPS_MATH.find((o) => o.valeur === p.operation)?.unaire ? ['A'] : ['A', 'B']),
    glsl: (e, p) => ({ Valeur: (OPS_MATH.find((o) => o.valeur === p.operation) ?? OPS_MATH[0]).glsl(e.A, e.B) }),
  },
  {
    type: 'vector-math',
    titre: 'Vector Math',
    categorie: 'vecteur',
    entrees: [
      { nom: 'A', type: 'vecteur', defaut: [0, 0, 0] },
      { nom: 'B', type: 'vecteur', defaut: [0, 0, 1] },
      { nom: 'Échelle', type: 'float', defaut: 1 },
    ],
    sorties: [
      { nom: 'Vecteur', type: 'vecteur' },
      { nom: 'Valeur', type: 'float' },
    ],
    params: [{ nom: 'operation', type: 'choix', defaut: 'dot', options: OPS_VECTEUR.map(({ valeur, libelle }) => ({ valeur, libelle })) }],
    entreesVisibles: (p) => (OPS_VECTEUR.find((o) => o.valeur === p.operation) ?? OPS_VECTEUR[0]).entrees,
    sortiesVisibles: (p) => ((OPS_VECTEUR.find((o) => o.valeur === p.operation) ?? OPS_VECTEUR[0]).valeur_ ? ['Valeur'] : ['Vecteur']),
    glsl: (e, p) => {
      const op = OPS_VECTEUR.find((o) => o.valeur === p.operation) ?? OPS_VECTEUR[0]
      return op.valeur_
        ? { Valeur: op.valeur_(e.A, e.B), Vecteur: 'vec3(0.0)' }
        : { Vecteur: op.vecteur!(e.A, e.B, e['Échelle']), Valeur: '0.0' }
    },
  },
  {
    type: 'map-range',
    titre: 'Map Range',
    categorie: 'convertisseur',
    entrees: [
      { nom: 'Valeur', type: 'float', defaut: 0.5 },
      { nom: 'De min', type: 'float', defaut: 0 },
      { nom: 'De max', type: 'float', defaut: 1 },
      { nom: 'Vers min', type: 'float', defaut: 0 },
      { nom: 'Vers max', type: 'float', defaut: 1 },
    ],
    sorties: [{ nom: 'Résultat', type: 'float' }],
    params: [
      {
        nom: 'interpolation',
        type: 'choix',
        defaut: 'lineaire',
        options: [
          { valeur: 'lineaire', libelle: 'Linéaire' },
          { valeur: 'lisse', libelle: 'Smooth Step' },
        ],
      },
    ],
    glsl: (e, p) => {
      const t =
        p.interpolation === 'lisse'
          ? `smoothstep(${e['De min']}, ${e['De max']}, ${e.Valeur})`
          : `clamp((${e.Valeur} - ${e['De min']}) / max(${e['De max']} - ${e['De min']}, 1e-6), 0.0, 1.0)`
      return { Résultat: `mix(${e['Vers min']}, ${e['Vers max']}, ${t})` }
    },
  },
  {
    type: 'separer',
    titre: 'Separate XYZ',
    categorie: 'convertisseur',
    entrees: [{ nom: 'Vecteur', type: 'vecteur', defaut: [0, 0, 0] }],
    sorties: [
      { nom: 'X', type: 'float' },
      { nom: 'Y', type: 'float' },
      { nom: 'Z', type: 'float' },
    ],
    glsl: (e) => ({ X: `${e.Vecteur}.x`, Y: `${e.Vecteur}.y`, Z: `${e.Vecteur}.z` }),
  },
  {
    type: 'combiner',
    titre: 'Combine XYZ',
    categorie: 'convertisseur',
    entrees: [
      { nom: 'X', type: 'float', defaut: 0 },
      { nom: 'Y', type: 'float', defaut: 0 },
      { nom: 'Z', type: 'float', defaut: 0 },
    ],
    sorties: [{ nom: 'Vecteur', type: 'vecteur' }],
    glsl: (e) => ({ Vecteur: `vec3(${e.X}, ${e.Y}, ${e.Z})` }),
  },
  {
    type: 'damier',
    titre: 'Checker Texture',
    categorie: 'texture',
    entrees: [
      { nom: 'Vecteur', type: 'vecteur', implicite: 'vec3(vUv, 0.0)' },
      { nom: 'Couleur 1', type: 'couleur', defaut: [0.8, 0.8, 0.8] },
      { nom: 'Couleur 2', type: 'couleur', defaut: [0.2, 0.2, 0.2] },
      { nom: 'Échelle', type: 'float', defaut: 5 },
    ],
    sorties: [
      { nom: 'Couleur', type: 'couleur' },
      { nom: 'Facteur', type: 'float' },
    ],
    auxiliaires: `float damier3(vec3 p) { vec3 c = floor(p + 1e-4); return mod(c.x + c.y + c.z, 2.0); }`,
    glsl: (e) => ({
      Facteur: `damier3(${e.Vecteur} * ${e['Échelle']})`,
      Couleur: `mix(${e['Couleur 2']}, ${e['Couleur 1']}, damier3(${e.Vecteur} * ${e['Échelle']}))`,
    }),
  },
  {
    type: 'mix',
    titre: 'Mix',
    categorie: 'couleur',
    entrees: [
      { nom: 'Facteur', type: 'float', defaut: 0.5 },
      { nom: 'A', type: 'couleur', defaut: [0.1, 0.1, 0.1] },
      { nom: 'B', type: 'couleur', defaut: [0.9, 0.9, 0.9] },
    ],
    sorties: [{ nom: 'Résultat', type: 'couleur' }],
    glsl: (e) => ({ Résultat: `mix(${e.A}, ${e.B}, clamp(${e.Facteur}, 0.0, 1.0))` }),
  },
  {
    type: 'sortie',
    titre: 'Material Output',
    categorie: 'sortie',
    entrees: [{ nom: 'Couleur', type: 'couleur', defaut: [0.5, 0.5, 0.5] }],
    sorties: [],
    glsl: () => ({}),
  },
]

export const defNoeud = (type: string) => NOEUDS.find((n) => n.type === type)

export const paramsParDefaut = (d: DefNoeud): Params => Object.fromEntries((d.params ?? []).map((p) => [p.nom, p.defaut]))

export function convertir(expr: string, de: TypeSocket, vers: TypeSocket) {
  const vDe = de !== 'float'
  const vVers = vers !== 'float'
  if (vDe === vVers) return expr
  return vVers ? `vec3(${expr})` : `dot(${expr}, vec3(1.0 / 3.0))`
}

const literal = (s: DefSocket, v: ValeurSocket | undefined) => {
  const x = v ?? s.defaut
  if (x === undefined) return s.implicite ?? (s.type === 'float' ? '0.0' : 'vec3(0.0)')
  if (typeof x === 'number') return s.type === 'float' ? f(x) : `vec3(${f(x)})`
  return s.type === 'float' ? f((x[0] + x[1] + x[2]) / 3) : v3(x)
}

const nomVar = (id: string, socket: string) => `n_${id.replace(/[^A-Za-z0-9]/g, '_')}_${socket.normalize('NFD').replace(/[^A-Za-z0-9]/g, '')}`

/** Vrai si brancher `de` → `vers` créerait une boucle (vers mène déjà à de). */
export function creeCycle(liens: Pick<LienGraphe, 'de' | 'vers'>[], de: string, vers: string) {
  if (de === vers) return true
  const pile = [vers]
  const vus = new Set<string>()
  while (pile.length) {
    const n = pile.pop()!
    if (n === de) return true
    if (vus.has(n)) continue
    vus.add(n)
    for (const l of liens) if (l.de === n) pile.push(l.vers)
  }
  return false
}

export interface Compilation {
  code: string
  erreur?: string
  utiliseTemps: boolean
}

/** Compile le graphe en fragment shader, en ne gardant que les nodes reliés à la sortie. */
export function compiler(g: Graphe): Compilation {
  const sortie = g.noeuds.find((n) => n.type === 'sortie')
  if (!sortie) return { code: FRAGMENT_VIDE, erreur: 'Il manque un node Material Output.', utiliseTemps: false }

  const parId = new Map(g.noeuds.map((n) => [n.id, n]))
  const lignes: string[] = []
  const aux = new Set<string>()
  const faits = new Set<string>()
  const enCours = new Set<string>()
  let utiliseTemps = false

  const visiter = (id: string): void => {
    if (faits.has(id)) return
    if (enCours.has(id)) throw new Error('Le graphe contient une boucle.')
    enCours.add(id)
    const n = parId.get(id)!
    const d = defNoeud(n.type)
    if (!d) throw new Error(`Node inconnu : ${n.type}`)
    const p = { ...paramsParDefaut(d), ...n.params }
    const e: Record<string, string> = {}
    for (const s of d.entrees) {
      const l = g.liens.find((x) => x.vers === id && x.entree === s.nom)
      const src = l && parId.get(l.de)
      const dSrc = src && defNoeud(src.type)
      const sSrc = dSrc?.sorties.find((x) => x.nom === l!.sortie)
      if (l && src && sSrc) {
        visiter(src.id)
        e[s.nom] = convertir(nomVar(src.id, sSrc.nom), sSrc.type, s.type)
      } else e[s.nom] = literal(s, n.valeurs?.[s.nom])
    }
    if (n.type === 'temps') utiliseTemps = true
    if (d.auxiliaires) aux.add(d.auxiliaires)
    const out = d.glsl(e, p)
    for (const s of d.sorties) lignes.push(`  ${s.type === 'float' ? 'float' : 'vec3'} ${nomVar(id, s.nom)} = ${out[s.nom] ?? (s.type === 'float' ? '0.0' : 'vec3(0.0)')};`)
    enCours.delete(id)
    faits.add(id)
  }

  try {
    visiter(sortie.id)
  } catch (err) {
    return { code: FRAGMENT_VIDE, erreur: (err as Error).message, utiliseTemps: false }
  }
  const dSortie = defNoeud('sortie')!
  const l = g.liens.find((x) => x.vers === sortie.id && x.entree === 'Couleur')
  const src = l && parId.get(l.de)
  const sSrc = src && defNoeud(src.type)?.sorties.find((x) => x.nom === l!.sortie)
  const couleur = sSrc ? convertir(nomVar(src!.id, sSrc.nom), sSrc.type, 'couleur') : literal(dSortie.entrees[0], sortie.valeurs?.Couleur)

  const code = `${[...aux].join('\n')}${aux.size ? '\n' : ''}void main() {
${lignes.join('\n')}
  gl_FragColor = vec4(clamp(${couleur}, 0.0, 1.0), 1.0);
}`
  return { code, utiliseTemps }
}

const FRAGMENT_VIDE = `void main() { gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0); }`

/** Forme canonique d'un graphe (paramètres complétés, positions entières) : deux graphes égaux ont le même JSON. */
export function normaliser(g: Graphe): Graphe {
  return {
    noeuds: g.noeuds.map((n) => ({
      id: n.id,
      type: n.type,
      x: Math.round(n.x),
      y: Math.round(n.y),
      params: { ...paramsParDefaut(defNoeud(n.type)!), ...n.params },
      valeurs: { ...n.valeurs },
    })),
    liens: g.liens.map((l) => ({ de: l.de, sortie: l.sortie, vers: l.vers, entree: l.entree })),
  }
}
