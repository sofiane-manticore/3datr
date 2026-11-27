import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import type { Graphe } from '@3datr/core'

/**
 * Disposition « carte mentale » : chaque domaine a un titre central, ses concepts sont des
 * cartes rectangulaires reliées en arbre (chaque concept est rattaché à un seul parent, son
 * prérequis le plus avancé dans le domaine, ou le titre du domaine). Les liens transverses
 * ne sont pas dessinés au repos, seulement au survol.
 *
 * Calculée dans le navigateur, car la taille des cartes dépend de la mesure réelle du texte.
 * Tout est déterministe : mêmes données et même police, même carte.
 */

export const TEXTE_CARTE = { taille: 13, interligne: 17, largeurMax: 168, padX: 14, padY: 10 }
export const TEXTE_TITRE = { taille: 20, interligne: 25, largeurMax: 230, padX: 16, padY: 10 }

export interface Bloc {
  x: number
  y: number
  w: number
  h: number
  lignes: string[]
}

export interface Arete {
  /** Slug du parent, ou `#domaine` pour le titre du domaine. */
  de: string
  vers: string
  domaine: string
}

export interface DispositionCarte {
  cartes: Map<string, Bloc>
  titres: Map<string, Bloc>
  aretes: Arete[]
  /** Rectangle englobant de chaque domaine (titre et cartes). */
  zones: Map<string, { minX: number; minY: number; maxX: number; maxY: number }>
}

export type Mesure = (texte: string, police: string) => number

/** Coupe un texte en lignes qui tiennent dans `largeurMax`. */
export function couper(texte: string, largeurMax: number, mesure: (t: string) => number): string[] {
  const mots = texte.split(/\s+/)
  const lignes: string[] = []
  let ligne = ''
  for (const m of mots) {
    const essai = ligne ? `${ligne} ${m}` : m
    if (ligne && mesure(essai) > largeurMax) {
      lignes.push(ligne)
      ligne = m
    } else ligne = essai
  }
  if (ligne) lignes.push(ligne)
  return lignes
}

function bloc(texte: string, style: typeof TEXTE_CARTE, police: string, mesure: Mesure, largeurMin: number): Bloc {
  const m = (t: string) => mesure(t, police)
  const lignes = couper(texte, style.largeurMax, m)
  const largeur = Math.max(...lignes.map(m))
  return { x: 0, y: 0, w: Math.max(largeurMin, Math.ceil(largeur) + style.padX * 2), h: lignes.length * style.interligne + style.padY * 2, lignes }
}

interface Sim extends SimulationNodeDatum {
  id: string
  w: number
  h: number
}

/** Collision entre rectangles : pousse deux cartes qui se recouvrent selon l'axe le plus court. */
function forceRectangles(marge: number) {
  let noeuds: Sim[] = []
  const f = (alpha: number) => {
    for (let i = 0; i < noeuds.length; i++)
      for (let j = i + 1; j < noeuds.length; j++) separer(noeuds[i]!, noeuds[j]!, marge, 0.5 + alpha)
  }
  f.initialize = (n: Sim[]) => {
    noeuds = n
  }
  return f
}

function separer(a: Sim, b: Sim, marge: number, force: number) {
  const dx = b.x! - a.x!
  const dy = b.y! - a.y!
  const ox = (a.w + b.w) / 2 + marge - Math.abs(dx)
  const oy = (a.h + b.h) / 2 + marge - Math.abs(dy)
  if (ox <= 0 || oy <= 0) return
  const fixeA = a.fx != null
  const fixeB = b.fx != null
  const partA = fixeA ? 0 : fixeB ? 1 : 0.5
  const partB = fixeB ? 0 : fixeA ? 1 : 0.5
  if (ox < oy) {
    const s = (dx === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(dx)) * ox * force
    a.x! -= s * partA
    b.x! += s * partB
  } else {
    const s = (dy === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(dy)) * oy * force
    a.y! -= s * partA
    b.y! += s * partB
  }
}

export function disposerCarte(g: Pick<Graphe, 'noeuds' | 'liens' | 'domaines'>, mesure: Mesure, policeFamille: string): DispositionCarte {
  const policeCarte = `500 ${TEXTE_CARTE.taille}px ${policeFamille}`
  const policeTitre = `650 ${TEXTE_TITRE.taille}px ${policeFamille}`
  const domaineDe = new Map(g.noeuds.map((n) => [n.slug, n.domaine]))
  const prerequis = new Map<string, string[]>()
  for (const l of g.liens) {
    if (l.type !== 'prerequis' && l.type !== 'suite') continue
    if (!domaineDe.has(l.from) || !domaineDe.has(l.to)) continue
    prerequis.set(l.to, [...(prerequis.get(l.to) ?? []), l.from])
  }

  const cartes = new Map<string, Bloc>()
  const titres = new Map<string, Bloc>()
  const aretes: Arete[] = []
  const amas = new Map<string, { rayon: number; ids: string[] }>()

  for (const d of g.domaines) {
    const ns = g.noeuds.filter((n) => n.domaine === d.slug)
    const titre = bloc(d.titre, TEXTE_TITRE, policeTitre, mesure, 120)
    titres.set(d.slug, titre)
    const racine = `#${d.slug}`

    // Arbre : parent = prérequis du même domaine le plus profond, sinon le titre du domaine.
    const profondeur = new Map<string, number>()
    const parent = new Map<string, string>()
    const prof = (s: string, pile = new Set<string>()): number => {
      if (profondeur.has(s)) return profondeur.get(s)!
      if (pile.has(s)) return 0
      pile.add(s)
      let meilleur = racine
      let pMax = 0
      for (const p of prerequis.get(s) ?? []) {
        if (domaineDe.get(p) !== d.slug) continue
        const v = prof(p, pile)
        if (v > pMax || (v === pMax && meilleur !== racine && p < meilleur)) {
          pMax = v
          meilleur = p
        }
      }
      pile.delete(s)
      parent.set(s, meilleur)
      profondeur.set(s, pMax + 1)
      return pMax + 1
    }
    for (const n of ns) prof(n.slug)
    const enfants = new Map<string, string[]>()
    for (const n of ns) {
      const p = parent.get(n.slug)!
      enfants.set(p, [...(enfants.get(p) ?? []), n.slug])
      aretes.push({ de: p, vers: n.slug, domaine: d.slug })
    }

    // Position de départ : arbre radial (chaque feuille reçoit une part égale du cercle).
    const feuilles = (s: string): number => {
      const e = enfants.get(s) ?? []
      return e.length === 0 ? 1 : e.reduce((t, c) => t + feuilles(c), 0)
    }
    const depart = new Map<string, { x: number; y: number }>()
    const placer = (s: string, a0: number, a1: number, niveau: number) => {
      const e = enfants.get(s) ?? []
      const total = e.reduce((t, c) => t + feuilles(c), 0)
      let a = a0
      for (const c of e) {
        const part = ((a1 - a0) * feuilles(c)) / total
        const ang = a + part / 2
        depart.set(c, { x: Math.cos(ang) * (150 + niveau * 150), y: Math.sin(ang) * (110 + niveau * 110) })
        placer(c, a, a + part, niveau + 1)
        a += part
      }
    }
    placer(racine, -Math.PI / 2, (Math.PI * 3) / 2, 0)

    const sims: Sim[] = [{ id: racine, w: titre.w, h: titre.h, x: 0, y: 0, fx: 0, fy: 0 }]
    for (const n of ns) {
      const b = bloc(n.titre, TEXTE_CARTE, policeCarte, mesure, 90)
      cartes.set(n.slug, b)
      sims.push({ id: n.slug, w: b.w, h: b.h, ...depart.get(n.slug)! })
    }
    const index = new Map(sims.map((s) => [s.id, s]))
    const liensSim = aretes
      .filter((a) => a.domaine === d.slug)
      .map((a) => ({ source: index.get(a.de)!, target: index.get(a.vers)! }))

    forceSimulation(sims)
      .force(
        'arbre',
        forceLink<Sim, { source: Sim; target: Sim }>(liensSim)
          .distance((l) => (l.source.w + l.target.w) / 4 + (l.source.h + l.target.h) / 2 + 36)
          .strength(0.5),
      )
      .force('repulsion', forceManyBody<Sim>().strength(-260).distanceMax(500))
      .force('rect', forceRectangles(22))
      .force('x', forceX<Sim>(0).strength(0.03))
      .force('y', forceY<Sim>(0).strength(0.05))
      .stop()
      .tick(320)
    // Passes finales : aucune carte ne doit en toucher une autre.
    for (let k = 0; k < 80; k++) for (let i = 0; i < sims.length; i++) for (let j = i + 1; j < sims.length; j++) separer(sims[i]!, sims[j]!, 22, 1)

    let rayon = 0
    for (const s of sims) {
      if (s.id === racine) continue
      const b = cartes.get(s.id)!
      b.x = s.x!
      b.y = s.y!
      rayon = Math.max(rayon, Math.hypot(Math.abs(s.x!) + s.w / 2, Math.abs(s.y!) + s.h / 2))
    }
    amas.set(d.slug, { rayon: rayon + 30, ids: ns.map((n) => n.slug) })
  }

  // Les domaines gardent la disposition relative calculée au build (domaines liés côte à côte),
  // écartée juste assez pour que les arbres ne se touchent pas.
  interface SimD extends SimulationNodeDatum {
    slug: string
    rayon: number
    cx: number
    cy: number
  }
  const ech = 1.1
  const simsD: SimD[] = g.domaines.map((d) => ({ slug: d.slug, rayon: amas.get(d.slug)!.rayon, cx: d.x * ech, cy: d.y * ech, x: d.x * ech, y: d.y * ech }))
  forceSimulation(simsD)
    .force('collision', forceCollide<SimD>((d) => d.rayon + 50).strength(1).iterations(6))
    .force('x', forceX<SimD>((d) => d.cx).strength(0.08))
    .force('y', forceY<SimD>((d) => d.cy).strength(0.08))
    .stop()
    .tick(300)

  const zones = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>()
  for (const d of simsD) {
    const t = titres.get(d.slug)!
    t.x = d.x!
    t.y = d.y!
    const z = { minX: t.x - t.w / 2, minY: t.y - t.h / 2, maxX: t.x + t.w / 2, maxY: t.y + t.h / 2 }
    for (const s of amas.get(d.slug)!.ids) {
      const b = cartes.get(s)!
      b.x += d.x!
      b.y += d.y!
      z.minX = Math.min(z.minX, b.x - b.w / 2)
      z.minY = Math.min(z.minY, b.y - b.h / 2)
      z.maxX = Math.max(z.maxX, b.x + b.w / 2)
      z.maxY = Math.max(z.maxY, b.y + b.h / 2)
    }
    zones.set(d.slug, z)
  }
  return { cartes, titres, aretes, zones }
}
