import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'

export interface NoeudADisposer {
  slug: string
  domaine: string
  poids: number
}

interface NoeudSim extends SimulationNodeDatum {
  slug: string
  domaine: string
  poids: number
  cx: number
  cy: number
}

export interface Disposition {
  centres: Map<string, { x: number; y: number }>
  positions: Map<string, { x: number; y: number }>
}

const ANGLE_OR = Math.PI * (3 - Math.sqrt(5))
const arrondi = (v: number) => Math.round(v * 10) / 10

/**
 * Place les concepts en constellation : chaque domaine est une île autour d'un
 * centre fixe, les concepts reliés se rapprochent. Tout est déterministe (pas de
 * Math.random) pour que la carte ne bouge pas d'un déploiement à l'autre tant que
 * le contenu ne change pas.
 */
export function disposer(
  domaines: string[],
  noeuds: NoeudADisposer[],
  liens: { from: string; to: string }[],
  rayonCarte = 700,
): Disposition {
  const centres = placerDomaines(domaines, noeuds, liens, rayonCarte)

  const rangDansDomaine = new Map<string, number>()
  const sim: NoeudSim[] = noeuds.map((n) => {
    const c = centres.get(n.domaine) ?? { x: 0, y: 0 }
    const k = rangDansDomaine.get(n.domaine) ?? 0
    rangDansDomaine.set(n.domaine, k + 1)
    const r = 18 * Math.sqrt(k + 0.5)
    return { ...n, cx: c.x, cy: c.y, x: c.x + r * Math.cos(k * ANGLE_OR), y: c.y + r * Math.sin(k * ANGLE_OR) }
  })
  const index = new Map(sim.map((n) => [n.slug, n]))
  const liensSim = liens
    .filter((l) => index.has(l.from) && index.has(l.to))
    .map((l) => ({ source: index.get(l.from)!, target: index.get(l.to)! }))

  forceSimulation(sim)
    .force(
      'liens',
      forceLink<NoeudSim, { source: NoeudSim; target: NoeudSim }>(liensSim)
        .distance(60)
        .strength((l) => (l.source.domaine === l.target.domaine ? 0.25 : 0.02)),
    )
    .force('repulsion', forceManyBody<NoeudSim>().strength(-60).distanceMax(400))
    .force('collision', forceCollide<NoeudSim>((n) => 14 + Math.sqrt(n.poids) * 4))
    .force('ileX', forceX<NoeudSim>((n) => n.cx).strength(0.12))
    .force('ileY', forceY<NoeudSim>((n) => n.cy).strength(0.12))
    .stop()
    .tick(400)

  const positions = new Map(sim.map((n) => [n.slug, { x: arrondi(n.x ?? 0), y: arrondi(n.y ?? 0) }]))
  return { centres, positions }
}

interface DomaineSim extends SimulationNodeDatum {
  slug: string
  rayon: number
}

/**
 * Place les centres des domaines : les domaines très liés entre eux (vecteurs et
 * transformations, bruits et SDF…) se rapprochent, sans que les îles se chevauchent.
 * On part d'un cercle (déterministe) et on laisse les forces resserrer la constellation.
 */
function placerDomaines(
  domaines: string[],
  noeuds: NoeudADisposer[],
  liens: { from: string; to: string }[],
  rayonDepart: number,
): Map<string, { x: number; y: number }> {
  const domaineDe = new Map(noeuds.map((n) => [n.slug, n.domaine]))
  const taille = new Map<string, number>()
  for (const n of noeuds) taille.set(n.domaine, (taille.get(n.domaine) ?? 0) + 1)
  const sim: DomaineSim[] = domaines.map((slug, i) => {
    const a = (i / domaines.length) * Math.PI * 2 - Math.PI / 2
    return { slug, rayon: 30 + 26 * Math.sqrt(taille.get(slug) ?? 1), x: rayonDepart * Math.cos(a), y: rayonDepart * Math.sin(a) }
  })
  const index = new Map(sim.map((d) => [d.slug, d]))
  const comptes = new Map<string, number>()
  for (const l of liens) {
    const a = domaineDe.get(l.from)
    const b = domaineDe.get(l.to)
    if (!a || !b || a === b) continue
    const k = a < b ? `${a}|${b}` : `${b}|${a}`
    comptes.set(k, (comptes.get(k) ?? 0) + 1)
  }
  const max = Math.max(1, ...comptes.values())
  const liensSim = [...comptes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => {
    const [a, b] = k.split('|') as [string, string]
    return { source: index.get(a)!, target: index.get(b)!, n }
  })
  forceSimulation(sim)
    .force(
      'liens',
      forceLink<DomaineSim, { source: DomaineSim; target: DomaineSim; n: number }>(liensSim)
        .distance((l) => l.source.rayon + l.target.rayon + 40)
        .strength((l) => 0.05 + 0.5 * (l.n / max)),
    )
    .force('repulsion', forceManyBody<DomaineSim>().strength(-300))
    .force('collision', forceCollide<DomaineSim>((d) => d.rayon + 100).strength(1).iterations(4))
    .force('x', forceX<DomaineSim>(0).strength(0.06))
    .force('y', forceY<DomaineSim>(0).strength(0.06))
    .stop()
    .tick(500)
  return new Map(sim.map((d) => [d.slug, { x: arrondi(d.x ?? 0), y: arrondi(d.y ?? 0) }]))
}
