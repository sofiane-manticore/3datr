import type { Graphe, Lien, NoeudGraphe } from '@3datr/core'

/** Le graphe de la carte, indexé pour les survols et les recherches. */
export interface GrapheCarte {
  noeuds: NoeudGraphe[]
  liens: Lien[]
  domaines: Graphe['domaines']
  parSlug: Map<string, NoeudGraphe>
  /** Prérequis directs de chaque concept. */
  prerequis: Map<string, string[]>
  /** Concepts qui dépendent directement de chaque concept. */
  suites: Map<string, string[]>
  /** Rayon de chaque amas de domaine, autour de son centre. */
  rayons: Map<string, number>
  /** Barycentre réel des concepts de chaque domaine. */
  centres: Map<string, { x: number; y: number }>
  /** Cadre de chaque domaine (rectangle englobant ses concepts, marge comprise). */
  cadres: Map<string, Cadre>
}

export interface Cadre {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Marge autour des concepts d'un domaine, en unités de la carte. */
export const MARGE_CADRE = 34

export function indexerGraphe(g: Pick<Graphe, 'noeuds' | 'liens' | 'domaines'>): GrapheCarte {
  const parSlug = new Map(g.noeuds.map((n) => [n.slug, n]))
  const prerequis = new Map<string, string[]>()
  const suites = new Map<string, string[]>()
  const ajouter = (m: Map<string, string[]>, k: string, v: string) => {
    const l = m.get(k)
    if (l) l.push(v)
    else m.set(k, [v])
  }
  for (const l of g.liens) {
    if (!parSlug.has(l.from) || !parSlug.has(l.to)) continue
    if (l.type === 'prerequis' || l.type === 'suite') {
      ajouter(prerequis, l.to, l.from)
      ajouter(suites, l.from, l.to)
    }
  }
  const centres = new Map<string, { x: number; y: number }>()
  const rayons = new Map<string, number>()
  const cadres = new Map<string, Cadre>()
  for (const d of g.domaines) {
    const ns = g.noeuds.filter((n) => n.domaine === d.slug)
    if (ns.length === 0) {
      centres.set(d.slug, { x: d.x, y: d.y })
      rayons.set(d.slug, 60)
      cadres.set(d.slug, { minX: d.x - 60, minY: d.y - 60, maxX: d.x + 60, maxY: d.y + 60 })
      continue
    }
    cadres.set(d.slug, {
      minX: Math.min(...ns.map((n) => n.x)) - MARGE_CADRE,
      minY: Math.min(...ns.map((n) => n.y)) - MARGE_CADRE,
      maxX: Math.max(...ns.map((n) => n.x)) + MARGE_CADRE,
      maxY: Math.max(...ns.map((n) => n.y)) + MARGE_CADRE,
    })
    const cx = ns.reduce((s, n) => s + n.x, 0) / ns.length
    const cy = ns.reduce((s, n) => s + n.y, 0) / ns.length
    centres.set(d.slug, { x: cx, y: cy })
    rayons.set(d.slug, Math.max(60, ...ns.map((n) => Math.hypot(n.x - cx, n.y - cy))) + 40)
  }
  return { noeuds: g.noeuds, liens: g.liens, domaines: g.domaines, parSlug, prerequis, suites, rayons, centres, cadres }
}

/** Tous les prérequis, directs et indirects : le chemin à parcourir pour arriver à ce concept. */
export function ancetres(g: GrapheCarte, slug: string): Set<string> {
  const vus = new Set<string>()
  const pile = [...(g.prerequis.get(slug) ?? [])]
  while (pile.length) {
    const s = pile.pop()!
    if (vus.has(s) || s === slug) continue
    vus.add(s)
    pile.push(...(g.prerequis.get(s) ?? []))
  }
  return vus
}

/** Rayon d'un nœud en unités de la carte : les concepts dont beaucoup dépendent sont plus gros. */
export const rayonNoeud = (n: Pick<NoeudGraphe, 'poids'>) => 4 + Math.sqrt(n.poids) * 2.2

/** Recherche tolérante aux accents et à la casse, les titres qui commencent par la requête d'abord. */
export function rechercher(noeuds: NoeudGraphe[], requete: string, max = 8): NoeudGraphe[] {
  const q = normaliser(requete.trim())
  if (!q) return []
  const scores: [NoeudGraphe, number][] = []
  for (const n of noeuds) {
    const t = normaliser(n.titre)
    const i = t.indexOf(q)
    if (i < 0) continue
    scores.push([n, i === 0 ? 0 : t[i - 1] === ' ' ? 1 : 2])
  }
  return scores
    .sort((a, b) => a[1] - b[1] || a[0].titre.length - b[0].titre.length)
    .slice(0, max)
    .map(([n]) => n)
}

export const normaliser = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
