import type { NoeudGraphe } from '@3datr/core'
import { type Camera, versEcran } from './camera'
import { type GrapheCarte, rayonNoeud } from './graphe'

/** Couleurs du thème, lues dans les variables CSS pour que la carte suive le thème clair ou sombre. */
export interface Palette {
  fond: string
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
  const sombre = document.documentElement.dataset.theme !== 'clair'
  return {
    fond: v('--fond', '#0f1115'),
    texte: v('--texte', '#e8eaef'),
    doux: v('--doux', '#9aa2b1'),
    accent: v('--accent', '#7c9cff'),
    suite: v('--v-vert', '#51cf66'),
    sombre,
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
  /** Temps en secondes, pour les liens qui « coulent » vers le concept visé. */
  t: number
  mouvementReduit: boolean
}

const etoiles = (() => {
  // Générateur pseudo-aléatoire fixe : le ciel ne change pas d'une visite à l'autre.
  let s = 1234567
  const alea = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  return Array.from({ length: 260 }, () => ({ x: alea() * 1024, y: alea() * 1024, r: alea() * 1.1 + 0.3, a: alea() * 0.5 + 0.15, p: alea() < 0.5 ? 0.04 : 0.1 }))
})()

const spritesHalo = new Map<string, HTMLCanvasElement>()
/** Halo lumineux pré-rendu par couleur : beaucoup moins cher qu'un shadowBlur à chaque image. */
function halo(couleur: string): HTMLCanvasElement {
  let c = spritesHalo.get(couleur)
  if (c) return c
  c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, avecAlpha(couleur, 0.75))
  grad.addColorStop(0.25, avecAlpha(couleur, 0.28))
  grad.addColorStop(1, avecAlpha(couleur, 0))
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  spritesHalo.set(couleur, c)
  return c
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

export function dessiner(ctx: CanvasRenderingContext2D, g: GrapheCarte, e: EtatDessin) {
  const { camera: cam, largeur: L, hauteur: H, palette: P, focus } = e
  ctx.setTransform(e.dpr, 0, 0, e.dpr, 0, 0)
  ctx.clearRect(0, 0, L, H)

  // Ciel : deux couches d'étoiles en parallaxe, en coordonnées écran.
  if (P.sombre) {
    for (const s of etoiles) {
      const ox = (((s.x - cam.x * cam.k * s.p) % 1024) + 1024) % 1024
      const oy = (((s.y - cam.y * cam.k * s.p) % 1024) + 1024) % 1024
      ctx.fillStyle = `rgba(255,255,255,${s.a})`
      for (let x = ox; x < L; x += 1024)
        for (let y = oy; y < H; y += 1024) {
          ctx.beginPath()
          ctx.arc(x, y, s.r, 0, Math.PI * 2)
          ctx.fill()
        }
    }
  }

  const ecran = (x: number, y: number) => versEcran(cam, L, H, x, y)
  const couleurDomaine = new Map(g.domaines.map((d) => [d.slug, d.couleur]))

  // Nébuleuses : un nuage coloré par domaine.
  ctx.globalCompositeOperation = P.sombre ? 'lighter' : 'source-over'
  for (const d of g.domaines) {
    const c = g.centres.get(d.slug)!
    const r = g.rayons.get(d.slug)! * 1.35 * cam.k
    const p = ecran(c.x, c.y)
    if (p.x + r < 0 || p.x - r > L || p.y + r < 0 || p.y - r > H) continue
    const force = (P.sombre ? 0.13 : 0.1) * (e.domaineSurvole === d.slug ? 2 : focus ? 0.6 : 1)
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
    grad.addColorStop(0, avecAlpha(d.couleur, force))
    grad.addColorStop(0.6, avecAlpha(d.couleur, force * 0.45))
    grad.addColorStop(1, avecAlpha(d.couleur, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  const dansFocus = (s: string) => !focus || s === focus.slug || focus.chemin.has(s) || focus.suites.has(s)

  // Liens. Au repos : fils discrets. Avec un focus : le chemin s'allume et coule vers le concept visé.
  const detail = lisse(0.7, 1.3, cam.k)
  ctx.lineCap = 'round'
  for (const l of g.liens) {
    const a = g.parSlug.get(l.from)
    const b = g.parSlug.get(l.to)
    if (!a || !b) continue
    const pa = ecran(a.x, a.y)
    const pb = ecran(b.x, b.y)
    if (Math.max(pa.x, pb.x) < 0 || Math.min(pa.x, pb.x) > L || Math.max(pa.y, pb.y) < 0 || Math.min(pa.y, pb.y) > H) continue

    let couleur: string
    let alpha: number
    let epaisseur = Math.max(0.6, Math.min(1.6, cam.k * 1.1))
    let coule = false
    const versCible = focus && (l.to === focus.slug || focus.chemin.has(l.to)) && (l.from === focus.slug || focus.chemin.has(l.from))
    const versSuite = focus && l.from === focus.slug && focus.suites.has(l.to)
    if (versCible && l.type !== 'alternative') {
      couleur = P.accent
      alpha = 0.9
      epaisseur += 0.8
      coule = !e.mouvementReduit
    } else if (versSuite && l.type !== 'alternative') {
      couleur = P.suite
      alpha = 0.75
      epaisseur += 0.4
    } else if (focus) {
      couleur = P.doux
      alpha = 0.05
    } else {
      couleur = a.domaine === b.domaine ? couleurDomaine.get(a.domaine)! : P.doux
      alpha = a.domaine === b.domaine ? 0.32 + 0.12 * detail : 0.09 + 0.06 * detail
    }
    ctx.strokeStyle = avecAlpha(couleur, alpha)
    ctx.lineWidth = epaisseur
    if (l.type === 'alternative') ctx.setLineDash([4, 5])
    else if (coule) {
      ctx.setLineDash([6, 8])
      ctx.lineDashOffset = -e.t * 28
    } else ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Pointe de flèche (prérequis → suite) quand on est assez près.
    if (l.type !== 'alternative' && (detail > 0 || versCible || versSuite) && (!focus || versCible || versSuite)) {
      const d = Math.hypot(pb.x - pa.x, pb.y - pa.y)
      const rb = rayonNoeud(b) * cam.k + 3
      if (d > rb + 8) {
        const ux = (pb.x - pa.x) / d
        const uy = (pb.y - pa.y) / d
        const tx = pb.x - ux * rb
        const ty = pb.y - uy * rb
        const t = 5 + epaisseur
        ctx.setLineDash([])
        ctx.fillStyle = ctx.strokeStyle
        ctx.globalAlpha = versCible || versSuite ? 1 : detail
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx - ux * t - uy * t * 0.55, ty - uy * t + ux * t * 0.55)
        ctx.lineTo(tx - ux * t + uy * t * 0.55, ty - uy * t - ux * t * 0.55)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }
  ctx.setLineDash([])

  // Nœuds : halo, cœur, anneaux de niveau quand on est près.
  const anneaux = lisse(1.2, 1.8, cam.k)
  const pulsation = e.mouvementReduit ? 0 : (Math.sin(e.t * 3) + 1) / 2
  for (const n of g.noeuds) {
    const p = ecran(n.x, n.y)
    const r = rayonNoeud(n) * cam.k
    if (p.x + r * 4 < 0 || p.x - r * 4 > L || p.y + r * 4 < 0 || p.y - r * 4 > H) continue
    const coul = couleurDomaine.get(n.domaine) ?? '#888888'
    const actif = dansFocus(n.slug)
    const vu = e.vus.has(n.slug)
    const cible = focus?.slug === n.slug
    const rv = Math.max(2, r)

    ctx.globalAlpha = actif ? 1 : 0.18
    if (P.sombre || cible) {
      const tailleHalo = Math.min(rv * (vu ? 6 : 4.2), rv + (vu ? 40 : 24)) * (cible ? 1.3 + pulsation * 0.35 : 1)
      ctx.globalCompositeOperation = P.sombre ? 'lighter' : 'source-over'
      ctx.drawImage(halo(coul), p.x - tailleHalo, p.y - tailleHalo, tailleHalo * 2, tailleHalo * 2)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.fillStyle = coul
    ctx.beginPath()
    ctx.arc(p.x, p.y, rv, 0, Math.PI * 2)
    ctx.fill()
    if (vu) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, rv * 0.45, 0, Math.PI * 2)
      ctx.fill()
    } else if (!P.sombre) {
      ctx.strokeStyle = avecAlpha('#000000', 0.25)
      ctx.lineWidth = 1
      ctx.stroke()
    }
    if (anneaux > 0) {
      const rang = n.niveau === 'facile' ? 1 : n.niveau === 'moyen' ? 2 : 3
      ctx.strokeStyle = coul
      ctx.lineWidth = 1
      ctx.globalAlpha = (actif ? 0.7 : 0.15) * anneaux
      for (let i = 1; i <= rang; i++) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, rv + 3 + i * 3, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    if (cible) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = P.texte
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.x, p.y, rv + 4 + pulsation * 3, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  dessinerEtiquettes(ctx, g, e, ecran, dansFocus)
}

/**
 * Zoom sémantique : de loin, les noms des domaines ; en s'approchant, les concepts les plus
 * importants, puis tous. Les étiquettes qui se chevaucheraient sont simplement omises.
 */
function dessinerEtiquettes(
  ctx: CanvasRenderingContext2D,
  g: GrapheCarte,
  e: EtatDessin,
  ecran: (x: number, y: number) => { x: number; y: number },
  dansFocus: (s: string) => boolean,
) {
  const { camera: cam, palette: P, focus, largeur: L, hauteur: H } = e
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Noms des domaines : grands au centre des amas de loin, puis discrets au-dessus quand on s'approche.
  const pris: { x0: number; y0: number; x1: number; y1: number }[] = []
  const nomsPris: typeof pris = []
  const pres = lisse(0.6, 0.95, cam.k)
  for (const d of g.domaines) {
    const c = g.centres.get(d.slug)!
    const r = g.rayons.get(d.slug)!
    if (pres > 0.02) {
      const p = ecran(c.x, c.y - r - 10)
      ctx.globalAlpha = pres * 0.85
      ctx.font = `600 12px ${P.police}`
      ctx.fillStyle = d.couleur
      ctx.fillText(d.titre.toUpperCase(), p.x, p.y)
    }
    if (pres < 0.98) {
      const p = ecran(c.x, c.y)
      ctx.globalAlpha = (1 - pres) * (focus ? 0.5 : 1)
      // Taille qui suit le zoom (bornée), pour que les noms ne se marchent pas dessus sur un petit écran.
      const taille = Math.round(Math.min(22, Math.max(11, 40 * cam.k)))
      ctx.font = `650 ${taille}px ${P.police}`
      ctx.lineWidth = 4
      ctx.strokeStyle = avecAlpha(P.sombre ? '#000000' : '#ffffff', 0.55)
      const titre = titreCourt(d.titre)
      const lt = ctx.measureText(titre).width
      const b = { x0: p.x - lt / 2 - 4, y0: p.y - taille / 2 - 2, x1: p.x + lt / 2 + 4, y1: p.y + taille / 2 + 2 }
      if (nomsPris.some((q) => q.x0 < b.x1 && q.x1 > b.x0 && q.y0 < b.y1 && q.y1 > b.y0)) continue
      nomsPris.push(b)
      if (pres < 0.5) pris.push(b)
      ctx.strokeText(titre, p.x, p.y)
      ctx.fillStyle = P.sombre ? '#ffffff' : P.texte
      ctx.fillText(titre, p.x, p.y)
    }
  }
  ctx.globalAlpha = 1

  // Concepts : les plus « porteurs » d'abord, le focus et son chemin toujours.
  const seuil = cam.k < 0.8 ? Infinity : cam.k < 1.1 ? 4 : cam.k < 1.5 ? 2 : -1
  const candidats: NoeudGraphe[] = []
  for (const n of g.noeuds) {
    const prioritaire = focus && (n.slug === focus.slug || focus.chemin.has(n.slug) || focus.suites.has(n.slug))
    if (prioritaire || n.poids > seuil) candidats.push(n)
  }
  const rang = (n: NoeudGraphe) => (focus?.slug === n.slug ? -100 : focus?.chemin.has(n.slug) ? -50 : focus?.suites.has(n.slug) ? -40 : -n.poids)
  candidats.sort((a, b) => rang(a) - rang(b))

  const taille = cam.k > 1.6 ? 13 : 12
  for (const n of candidats) {
    const p = ecran(n.x, n.y)
    if (p.x < -100 || p.x > L + 100 || p.y < -30 || p.y > H + 30) continue
    const cible = focus?.slug === n.slug
    ctx.font = `${cible ? 650 : 500} ${cible ? taille + 2 : taille}px ${P.police}`
    const larg = ctx.measureText(n.titre).width
    const y = p.y + rayonNoeud(n) * cam.k + (cam.k > 1.2 ? 16 : 11) + (cible ? 4 : 0)
    const boite = { x0: p.x - larg / 2 - 3, y0: y - taille / 2 - 2, x1: p.x + larg / 2 + 3, y1: y + taille / 2 + 2 }
    if (!cible && pris.some((b) => b.x0 < boite.x1 && b.x1 > boite.x0 && b.y0 < boite.y1 && b.y1 > boite.y0)) continue
    pris.push(boite)
    ctx.globalAlpha = dansFocus(n.slug) ? 1 : 0.25
    ctx.lineWidth = 3.5
    ctx.strokeStyle = avecAlpha(P.sombre ? '#0f1115' : '#fbfbfc', 0.85)
    ctx.strokeText(n.titre, p.x, y)
    ctx.fillStyle = cible ? P.texte : focus?.chemin.has(n.slug) ? P.texte : P.sombre ? 'rgba(232,234,239,0.88)' : P.texte
    ctx.fillText(n.titre, p.x, y)
  }
  ctx.globalAlpha = 1
}

/** De loin, « Transformations et espaces de coordonnées » devient « Transformations ». */
function titreCourt(t: string) {
  return t.length > 28 ? t.split(/,| et /)[0]!.trim() : t
}
