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
  rayonCarte = 900,
): Disposition {
  const centres = new Map<string, { x: number; y: number }>()
  domaines.forEach((d, i) => {
    const a = (i / domaines.length) * Math.PI * 2 - Math.PI / 2
    centres.set(d, { x: arrondi(rayonCarte * Math.cos(a)), y: arrondi(rayonCarte * Math.sin(a)) })
  })

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
