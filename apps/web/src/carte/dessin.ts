import type { NoeudGraphe } from '@3datr/core'
import { type Camera, versEcran } from './camera'
import { type GrapheCarte, rayonNoeud } from './graphe'

/** Couleurs du thème, lues dans les variables CSS pour que la carte suive le thème clair ou sombre. */
export interface Palette {
  fond: string
  surface: string
  bord: string
  texte: string
  doux: string
  accent: string
  suite: string
  sombre: boolean
  police: string
}

export function lirePalette(): Palette {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string, d: string) => s.getPropertyValue(n).trim() || d
  return {
    fond: v('--fond', '#0f1115'),
    surface: v('--surface', '#171a21'),
    bord: v('--bord', '#2b303b'),
    texte: v('--texte', '#e8eaef'),
    doux: v('--doux', '#9aa2b1'),
    accent: v('--accent', '#7c9cff'),
    suite: v('--v-vert', '#51cf66'),
    sombre: document.documentElement.dataset.theme !== 'clair',
    police: getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif',
  }
}

/** Ce que la carte met en valeur : le concept visé, ses prérequis (le chemin) et ses suites directes. */
export interface Focus {
  slug: string
  chemin: Set<string>
  suites: Set<string>
}

export interface EtatDessin {
  camera: Camera
  largeur: number
  hauteur: number
  dpr: number
  palette: Palette
  focus: Focus | null
  domaineSurvole: string | null
  vus: Set<string>
  /** Temps en secondes, pour le petit point qui parcourt le chemin vers le concept visé. */
  t: number
  mouvementReduit: boolean
}

export function avecAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (x) => x + x) : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

const lisse = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

interface Boite {
  x0: number
  y0: number
  x1: number
  y1: number
}
const chevauche = (a: Boite, b: Boite) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

/** Point de contrôle d'un lien courbe : léger arc, toujours du même côté pour un rendu régulier. */
function controle(ax: number, ay: number, bx: number, by: number) {
  return { x: (ax + bx) / 2 - (by - ay) * 0.12, y: (ay + by) / 2 + (bx - ax) * 0.12 }
}

export function dessiner(ctx: CanvasRenderingContext2D, g: GrapheCarte, e: EtatDessin) {
  const { camera: cam, largeur: L, hauteur: H, palette: P, focus } = e
  ctx.setTransform(e.dpr, 0, 0, e.dpr, 0, 0)
  ctx.clearRect(0, 0, L, H)

  dessinerGrille(ctx, e)

  const ecran = (x: number, y: number) => versEcran(cam, L, H, x, y)
  const couleurDomaine = new Map(g.domaines.map((d) => [d.slug, d.couleur]))
  const dansFocus = (s: string) => !focus || s === focus.slug || focus.chemin.has(s) || focus.suites.has(s)

  // Zones de domaine : un cadre arrondi, teinté très légèrement.
  for (const d of g.domaines) {
    const c = g.cadres.get(d.slug)!
    const a = ecran(c.minX, c.minY)
    const b = ecran(c.maxX, c.maxY)
    if (b.x < 0 || a.x > L || b.y < 0 || a.y > H) continue
    const survole = e.domaineSurvole === d.slug
    const att = focus ? 0.5 : 1
    ctx.beginPath()
    ctx.roundRect(a.x, a.y, b.x - a.x, b.y - a.y, Math.min(24, 18 * cam.k + 6))
    ctx.fillStyle = avecAlpha(d.couleur, (P.sombre ? 0.05 : 0.06) * att * (survole ? 2.2 : 1))
    ctx.fill()
    ctx.lineWidth = survole ? 1.5 : 1
    ctx.strokeStyle = avecAlpha(d.couleur, (survole ? 0.7 : 0.28) * att)
    ctx.stroke()
  }

  // Liens : courbes fines et neutres. Le chemin vers le concept visé passe à la couleur d'accent.
  const detail = lisse(0.7, 1.3, cam.k)
  ctx.lineCap = 'round'
  for (const l of g.liens) {
    const a = g.parSlug.get(l.from)
    const b = g.parSlug.get(l.to)
    if (!a || !b) continue
    const pa = ecran(a.x, a.y)
    const pb = ecran(b.x, b.y)
    if (Math.max(pa.x, pb.x) < 0 || Math.min(pa.x, pb.x) > L || Math.max(pa.y, pb.y) < 0 || Math.min(pa.y, pb.y) > H) continue

    const versCible =
      !!focus && l.type !== 'alternative' && (l.to === focus.slug || focus.chemin.has(l.to)) && (l.from === focus.slug || focus.chemin.has(l.from))
    const versSuite = !!focus && l.type !== 'alternative' && l.from === focus.slug && focus.suites.has(l.to)
    let couleur = P.doux
    let alpha: number
    let epaisseur = 1
    if (versCible) {
      couleur = P.accent
      alpha = 0.95
      epaisseur = 2
    } else if (versSuite) {
      couleur = P.suite
      alpha = 0.9
      epaisseur = 1.6
    } else if (focus) alpha = 0.06
    else if (a.domaine === b.domaine) {
      couleur = couleurDomaine.get(a.domaine)!
      alpha = 0.35 + 0.15 * detail
    } else alpha = 0.13 - 0.07 * detail

    const c = controle(pa.x, pa.y, pb.x, pb.y)
    ctx.strokeStyle = avecAlpha(couleur, alpha)
    ctx.lineWidth = epaisseur
    ctx.setLineDash(l.type === 'alternative' ? [3, 4] : [])
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.quadraticCurveTo(c.x, c.y, pb.x, pb.y)
    ctx.stroke()

    // Petit point qui avance le long du chemin, du prérequis vers la suite.
    if (versCible && !e.mouvementReduit) {
      const t = (e.t * 0.6 + (l.from.length % 7) / 7) % 1
      const u = 1 - t
      const x = u * u * pa.x + 2 * u * t * c.x + t * t * pb.x
      const y = u * u * pa.y + 2 * u * t * c.y + t * t * pb.y
      ctx.fillStyle = P.accent
      ctx.beginPath()
      ctx.arc(x, y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Pointe de flèche à l'arrivée, orientée selon la tangente de la courbe.
    const montrer = versCible || versSuite || (!focus && detail > 0)
    if (l.type !== 'alternative' && montrer) {
      const d = Math.hypot(pb.x - c.x, pb.y - c.y)
      const rb = Math.max(2.5, rayonNoeud(b) * cam.k) + 2.5
      if (Math.hypot(pb.x - pa.x, pb.y - pa.y) > rb + 10 && d > 0) {
        const ux = (pb.x - c.x) / d
        const uy = (pb.y - c.y) / d
        const tx = pb.x - ux * rb
        const ty = pb.y - uy * rb
        const t = 4 + epaisseur
        ctx.setLineDash([])
        ctx.fillStyle = avecAlpha(couleur, versCible || versSuite ? alpha : alpha * detail * 1.6)
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx - ux * t - uy * t * 0.5, ty - uy * t + ux * t * 0.5)
        ctx.lineTo(tx - ux * t + uy * t * 0.5, ty - uy * t - ux * t * 0.5)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
  ctx.setLineDash([])

  // Nœuds : cercles nets. Pas encore vu : anneau de couleur ; déjà vu : plein, avec une coche.
  const obstacles: Boite[] = []
  for (const n of g.noeuds) {
    const p = ecran(n.x, n.y)
    const rv = Math.max(2.5, rayonNoeud(n) * cam.k)
    if (p.x + rv < -20 || p.x - rv > L + 20 || p.y + rv < -20 || p.y - rv > H + 20) continue
    obstacles.push({ x0: p.x - rv - 2, y0: p.y - rv - 2, x1: p.x + rv + 2, y1: p.y + rv + 2 })
    const coul = couleurDomaine.get(n.domaine) ?? '#888888'
    const vu = e.vus.has(n.slug)
    const cible = focus?.slug === n.slug
    ctx.globalAlpha = dansFocus(n.slug) ? 1 : 0.2

    if (cible) {
      ctx.fillStyle = avecAlpha(P.accent, 0.18)
      ctx.beginPath()
      ctx.arc(p.x, p.y, rv + 7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(p.x, p.y, rv, 0, Math.PI * 2)
    if (vu || rv < 4) {
      ctx.fillStyle = coul
      ctx.fill()
    } else {
      ctx.fillStyle = P.fond
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, Math.min(3, rv * 0.28))
      ctx.strokeStyle = coul
      ctx.stroke()
      ctx.fillStyle = avecAlpha(coul, 0.18)
      ctx.fill()
    }
    if (vu && rv >= 6) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1.5, rv * 0.18)
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(p.x - rv * 0.38, p.y + rv * 0.02)
      ctx.lineTo(p.x - rv * 0.1, p.y + rv * 0.3)
      ctx.lineTo(p.x + rv * 0.4, p.y - rv * 0.28)
      ctx.stroke()
    }
    if (cible) {
      ctx.lineWidth = 2
      ctx.strokeStyle = P.accent
      ctx.beginPath()
      ctx.arc(p.x, p.y, rv + 3.5, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  dessinerEtiquettes(ctx, g, e, ecran, dansFocus, obstacles)
}

/** Grille de points discrète, en coordonnées de la carte : elle suit le déplacement et le zoom. */
function dessinerGrille(ctx: CanvasRenderingContext2D, e: EtatDessin) {
  const { camera: cam, largeur: L, hauteur: H, palette: P } = e
  // Pas de grille en puissances de 2, choisi pour rester entre 18 et 36 px à l'écran.
  let pas = 40
  while (pas * cam.k < 18) pas *= 2
  while (pas * cam.k > 36) pas /= 2
  const px = pas * cam.k
  const ox = ((((-cam.x * cam.k + L / 2) % px) + px) % px)
  const oy = ((((-cam.y * cam.k + H / 2) % px) + px) % px)
  ctx.fillStyle = avecAlpha(P.doux, P.sombre ? 0.16 : 0.22)
  for (let x = ox; x < L; x += px) for (let y = oy; y < H; y += px) ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5)
}

/**
 * Zoom sémantique et placement sans chevauchement. De loin, les noms des domaines au centre
 * de leur cadre ; de près, un en-tête dans le coin du cadre et les noms des concepts. Chaque
 * étiquette essaie huit places autour de son nœud (dessous, dessus, côtés, diagonales) et
 * n'est affichée que si elle ne touche ni une autre étiquette ni un nœud.
 */
function dessinerEtiquettes(
  ctx: CanvasRenderingContext2D,
  g: GrapheCarte,
  e: EtatDessin,
  ecran: (x: number, y: number) => { x: number; y: number },
  dansFocus: (s: string) => boolean,
  obstacles: Boite[],
) {
  const { camera: cam, palette: P, focus, largeur: L, hauteur: H } = e
  ctx.textBaseline = 'middle'
  const pris: Boite[] = []
  const pres = lisse(0.55, 0.85, cam.k)

  // En-têtes de domaine (de près) : pastille de couleur + nom, dans le coin haut gauche du cadre.
  if (pres > 0.02) {
    for (const d of g.domaines) {
      const c = g.cadres.get(d.slug)!
      const a = ecran(c.minX, c.minY)
      const largeurCadre = (c.maxX - c.minX) * cam.k
      ctx.font = `600 12px ${P.police}`
      let titre = d.titre
      while (ctx.measureText(titre).width > largeurCadre - 40 && titre.includes(' ')) titre = `${titre.slice(0, titre.lastIndexOf(' '))}…`
      const lt = ctx.measureText(titre).width
      const x = a.x + 14
      const y = a.y + 16
      ctx.globalAlpha = pres * (focus ? 0.5 : 1)
      ctx.fillStyle = d.couleur
      ctx.beginPath()
      ctx.arc(x + 4, y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = P.texte
      ctx.textAlign = 'left'
      ctx.fillText(titre, x + 14, y)
      pris.push({ x0: x - 2, y0: y - 9, x1: x + 16 + lt, y1: y + 9 })
    }
  }

  // Noms des domaines (de loin) : centrés, taille qui suit le zoom, jamais superposés.
  if (pres < 0.98) {
    ctx.textAlign = 'center'
    const ordre = [...g.domaines].sort((a, b) => (g.rayons.get(b.slug) ?? 0) - (g.rayons.get(a.slug) ?? 0))
    for (const d of ordre) {
      const ctr = g.centres.get(d.slug)!
      const p = ecran(ctr.x, ctr.y)
      const taille = Math.round(Math.min(20, Math.max(11, 34 * cam.k)))
      ctx.font = `650 ${taille}px ${P.police}`
      // Le titre complet s'il tient, sinon sa première partie.
      let titre = d.titre
      let lt = ctx.measureText(titre).width
      const largeurCadre = (g.cadres.get(d.slug)!.maxX - g.cadres.get(d.slug)!.minX) * cam.k
      if (lt > largeurCadre * 1.1) {
        titre = titreCourt(d.titre)
        lt = ctx.measureText(titre).width
      }
      const b = { x0: p.x - lt / 2 - 10, y0: p.y - taille / 2 - 6, x1: p.x + lt / 2 + 10, y1: p.y + taille / 2 + 6 }
      if (pris.some((q) => chevauche(q, b))) continue
      pris.push(b)
      ctx.globalAlpha = (1 - pres) * (focus ? 0.5 : 1)
      ctx.fillStyle = avecAlpha(P.fond, 0.82)
      ctx.beginPath()
      ctx.roundRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 999)
      ctx.fill()
      ctx.strokeStyle = avecAlpha(d.couleur, 0.6)
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = P.texte
      ctx.fillText(titre, p.x, p.y + 0.5)
    }
  }
  ctx.globalAlpha = 1

  // Concepts : le focus et son chemin d'abord, puis les plus « porteurs ».
  const seuil = cam.k < 0.75 ? Infinity : cam.k < 1.05 ? 4 : cam.k < 1.4 ? 1 : -1
  const candidats: NoeudGraphe[] = []
  for (const n of g.noeuds) {
    const prioritaire = focus && (n.slug === focus.slug || focus.chemin.has(n.slug) || focus.suites.has(n.slug))
    if (prioritaire || n.poids > seuil) candidats.push(n)
  }
  const rang = (n: NoeudGraphe) =>
    focus?.slug === n.slug ? -100 : focus?.chemin.has(n.slug) ? -50 : focus?.suites.has(n.slug) ? -40 : -n.poids
  candidats.sort((a, b) => rang(a) - rang(b))

  const taille = 12
  const hauteur = 20
  ctx.textAlign = 'center'
  for (const n of candidats) {
    const p = ecran(n.x, n.y)
    if (p.x < -150 || p.x > L + 150 || p.y < -40 || p.y > H + 40) continue
    const cible = focus?.slug === n.slug
    ctx.font = `${cible ? 650 : 500} ${taille}px ${P.police}`
    const larg = ctx.measureText(n.titre).width + 14
    const rv = Math.max(2.5, rayonNoeud(n) * cam.k) + (cible ? 6 : 4)
    // Places possibles, dans l'ordre de préférence.
    const places = [
      { x: p.x, y: p.y + rv + hauteur / 2 },
      { x: p.x, y: p.y - rv - hauteur / 2 },
      { x: p.x + rv + larg / 2, y: p.y },
      { x: p.x - rv - larg / 2, y: p.y },
      { x: p.x + rv * 0.7 + larg / 2, y: p.y + rv * 0.7 + hauteur / 2 },
      { x: p.x - rv * 0.7 - larg / 2, y: p.y + rv * 0.7 + hauteur / 2 },
      { x: p.x + rv * 0.7 + larg / 2, y: p.y - rv * 0.7 - hauteur / 2 },
      { x: p.x - rv * 0.7 - larg / 2, y: p.y - rv * 0.7 - hauteur / 2 },
    ]
    let choisie: Boite | null = null
    for (const pl of places) {
      const b = { x0: pl.x - larg / 2, y0: pl.y - hauteur / 2, x1: pl.x + larg / 2, y1: pl.y + hauteur / 2 }
      if (pris.some((q) => chevauche(q, b)) || obstacles.some((q) => chevauche(q, b))) continue
      choisie = b
      break
    }
    if (!choisie) {
      if (!cible) continue
      choisie = { x0: places[0]!.x - larg / 2, y0: places[0]!.y - hauteur / 2, x1: places[0]!.x + larg / 2, y1: places[0]!.y + hauteur / 2 }
    }
    pris.push(choisie)
    const actif = dansFocus(n.slug)
    ctx.globalAlpha = actif ? 1 : 0.3
    ctx.beginPath()
    ctx.roundRect(choisie.x0, choisie.y0, choisie.x1 - choisie.x0, hauteur, 6)
    ctx.fillStyle = cible ? P.accent : avecAlpha(P.surface, 0.92)
    ctx.fill()
    if (!cible) {
      ctx.strokeStyle = focus?.chemin.has(n.slug) ? avecAlpha(P.accent, 0.7) : focus?.suites.has(n.slug) ? avecAlpha(P.suite, 0.7) : P.bord
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.fillStyle = cible ? P.fond : P.texte
    ctx.fillText(n.titre, (choisie.x0 + choisie.x1) / 2, choisie.y0 + hauteur / 2 + 0.5)
  }
  ctx.globalAlpha = 1
}

/** « Transformations et espaces de coordonnées » devient « Transformations ». */
function titreCourt(t: string) {
  return t.split(/,| et /)[0]!.trim()
}
