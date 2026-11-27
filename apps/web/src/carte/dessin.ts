import type { Camera } from './camera'
import { type Bloc, type DispositionCarte, TEXTE_CARTE, TEXTE_TITRE } from './disposition'
import type { GrapheCarte } from './graphe'

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
  disposition: DispositionCarte
  focus: Focus | null
  domaineSurvole: string | null
  vus: Set<string>
  t: number
  mouvementReduit: boolean
}

export function avecAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (x) => x + x) : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Point où le segment centre → (x, y) sort du rectangle : les traits partent du bord des cartes. */
function bord(b: Bloc, x: number, y: number, marge = 0) {
  const dx = x - b.x
  const dy = y - b.y
  if (dx === 0 && dy === 0) return { x: b.x, y: b.y }
  const t = Math.min((b.w / 2 + marge) / Math.abs(dx || 1e-9), (b.h / 2 + marge) / Math.abs(dy || 1e-9))
  return { x: b.x + dx * Math.min(1, t), y: b.y + dy * Math.min(1, t) }
}

export function dessiner(ctx: CanvasRenderingContext2D, g: GrapheCarte, e: EtatDessin) {
  const { camera: cam, largeur: L, hauteur: H, palette: P, focus, disposition: D } = e
  ctx.setTransform(e.dpr, 0, 0, e.dpr, 0, 0)
  ctx.fillStyle = P.fond
  ctx.fillRect(0, 0, L, H)

  // On dessine en coordonnées de la carte : tout (cartes, textes, traits) suit le zoom, comme sur un tableau blanc.
  ctx.setTransform(e.dpr * cam.k, 0, 0, e.dpr * cam.k, e.dpr * (L / 2 - cam.x * cam.k), e.dpr * (H / 2 - cam.y * cam.k))
  const px = 1 / cam.k // un pixel écran, en unités de la carte
  const vue = { x0: cam.x - L / 2 / cam.k, y0: cam.y - H / 2 / cam.k, x1: cam.x + L / 2 / cam.k, y1: cam.y + H / 2 / cam.k }
  const visible = (b: { x: number; y: number; w: number; h: number }) =>
    b.x + b.w / 2 > vue.x0 && b.x - b.w / 2 < vue.x1 && b.y + b.h / 2 > vue.y0 && b.y - b.h / 2 < vue.y1

  const couleur = new Map(g.domaines.map((d) => [d.slug, d.couleur]))
  const dansFocus = (s: string) => !focus || s === focus.slug || focus.chemin.has(s) || focus.suites.has(s)
  const blocDe = (id: string) => (id.startsWith('#') ? D.titres.get(id.slice(1))! : D.cartes.get(id)!)

  // Arbre de chaque domaine : traits pointillés courts et discrets.
  ctx.lineCap = 'round'
  ctx.setLineDash([3 * Math.max(1, px), 4 * Math.max(1, px)])
  ctx.lineWidth = Math.max(1.1, 1.1 * px)
  for (const a of D.aretes) {
    const pa = blocDe(a.de)
    const pb = blocDe(a.vers)
    const da = bord(pa, pb.x, pb.y, 4)
    const db = bord(pb, pa.x, pa.y, 4)
    if (Math.max(da.x, db.x) < vue.x0 || Math.min(da.x, db.x) > vue.x1 || Math.max(da.y, db.y) < vue.y0 || Math.min(da.y, db.y) > vue.y1) continue
    const actif = !focus || (dansFocus(a.vers) && (a.de.startsWith('#') || dansFocus(a.de)))
    ctx.strokeStyle = avecAlpha(P.doux, (focus ? (actif ? 0.45 : 0.12) : 0.5) * (e.domaineSurvole && e.domaineSurvole !== a.domaine ? 0.4 : 1))
    ctx.beginPath()
    ctx.moveTo(da.x, da.y)
    ctx.lineTo(db.x, db.y)
    ctx.stroke()
  }
  ctx.setLineDash([])

  // Au survol seulement : les vrais liens de prérequis (chemin complet) et les suites directes.
  if (focus) {
    for (const l of g.liens) {
      if (l.type === 'alternative') continue
      const versCible = (l.to === focus.slug || focus.chemin.has(l.to)) && focus.chemin.has(l.from)
      const versSuite = l.from === focus.slug && focus.suites.has(l.to)
      if (!versCible && !versSuite) continue
      const a = D.cartes.get(l.from)
      const b = D.cartes.get(l.to)
      if (!a || !b) continue
      const da = bord(a, b.x, b.y, 2)
      const db = bord(b, a.x, a.y, 4)
      const c = { x: (da.x + db.x) / 2 - (db.y - da.y) * 0.15, y: (da.y + db.y) / 2 + (db.x - da.x) * 0.15 }
      const coul = versSuite ? P.suite : P.accent
      ctx.strokeStyle = avecAlpha(coul, 0.9)
      ctx.lineWidth = Math.max(1.6, 1.6 * px)
      ctx.beginPath()
      ctx.moveTo(da.x, da.y)
      ctx.quadraticCurveTo(c.x, c.y, db.x, db.y)
      ctx.stroke()
      // Pointe de flèche.
      const d = Math.hypot(db.x - c.x, db.y - c.y) || 1
      const ux = (db.x - c.x) / d
      const uy = (db.y - c.y) / d
      const t = Math.max(7, 7 * px)
      ctx.fillStyle = coul
      ctx.beginPath()
      ctx.moveTo(db.x, db.y)
      ctx.lineTo(db.x - ux * t - uy * t * 0.5, db.y - uy * t + ux * t * 0.5)
      ctx.lineTo(db.x - ux * t + uy * t * 0.5, db.y - uy * t - ux * t * 0.5)
      ctx.closePath()
      ctx.fill()
    }
  }

  // Cartes des concepts.
  const lisible = TEXTE_CARTE.taille * cam.k >= 7.5
  for (const n of g.noeuds) {
    const b = D.cartes.get(n.slug)
    if (!b || !visible(b)) continue
    const coul = couleur.get(n.domaine) ?? '#888888'
    const cible = focus?.slug === n.slug
    const chemin = focus?.chemin.has(n.slug)
    const suite = focus?.suites.has(n.slug)
    const vu = e.vus.has(n.slug)
    const x = b.x - b.w / 2
    const y = b.y - b.h / 2
    ctx.globalAlpha = dansFocus(n.slug) && (!e.domaineSurvole || e.domaineSurvole === n.domaine) ? 1 : 0.28

    ctx.beginPath()
    ctx.roundRect(x, y, b.w, b.h, 8)
    ctx.fillStyle = P.surface
    ctx.fill()
    ctx.lineWidth = cible ? Math.max(2, 2 * px) : Math.max(1, px)
    ctx.strokeStyle = cible || chemin ? P.accent : suite ? P.suite : vu ? avecAlpha(coul, 0.8) : P.bord
    ctx.stroke()

    // Repère de couleur du domaine, à gauche.
    ctx.fillStyle = coul
    ctx.beginPath()
    ctx.roundRect(x + 6, y + 7, 3, b.h - 14, 1.5)
    ctx.fill()

    if (lisible) {
      ctx.fillStyle = P.texte
      ctx.font = `500 ${TEXTE_CARTE.taille}px ${P.police}`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      b.lignes.forEach((l, i) => ctx.fillText(l, x + TEXTE_CARTE.padX, y + TEXTE_CARTE.padY + TEXTE_CARTE.interligne * (i + 0.5)))
    } else {
      // De loin, des barres grises remplacent le texte : la forme reste lisible sans bruit.
      ctx.fillStyle = avecAlpha(P.doux, 0.35)
      b.lignes.forEach((l, i) => {
        const lw = Math.min(b.w - TEXTE_CARTE.padX * 2, l.length * 6.5)
        ctx.fillRect(x + TEXTE_CARTE.padX, y + TEXTE_CARTE.padY + TEXTE_CARTE.interligne * i + 5, lw, 6)
      })
    }

    if (vu) {
      // Petite coche dans le coin.
      const cx = x + b.w - 2
      const cy = y + 2
      ctx.fillStyle = coul
      ctx.beginPath()
      ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = P.fond
      ctx.lineWidth = 1.8
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(cx - 3.2, cy)
      ctx.lineTo(cx - 0.8, cy + 2.4)
      ctx.lineTo(cx + 3.4, cy - 2.4)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // Titres des domaines : texte gras, posé sur un fond uni. De loin, ils grossissent pour rester lisibles.
  const echelle = Math.max(1, (L < 640 ? 10.5 : 13) / (TEXTE_TITRE.taille * cam.k))
  for (const d of g.domaines) {
    const t = D.titres.get(d.slug)!
    const w = t.w * echelle
    const h = t.h * echelle
    if (!visible({ x: t.x, y: t.y, w, h })) continue
    const survole = e.domaineSurvole === d.slug
    ctx.globalAlpha = focus || (e.domaineSurvole && !survole) ? 0.45 : 1
    ctx.beginPath()
    ctx.roundRect(t.x - w / 2, t.y - h / 2, w, h, 10 * echelle)
    ctx.fillStyle = survole ? avecAlpha(d.couleur, P.sombre ? 0.22 : 0.16) : P.fond
    ctx.fill()
    ctx.lineWidth = Math.max(1.5, 1.5 * px)
    ctx.strokeStyle = avecAlpha(d.couleur, 0.9)
    ctx.stroke()
    ctx.fillStyle = P.texte
    ctx.font = `650 ${TEXTE_TITRE.taille * echelle}px ${P.police}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    t.lignes.forEach((l, i) =>
      ctx.fillText(l, t.x, t.y - h / 2 + (TEXTE_TITRE.padY + TEXTE_TITRE.interligne * (i + 0.5)) * echelle),
    )
    ctx.globalAlpha = 1
  }
}

/** Le bloc (carte ou titre) sous un point de la carte. */
export function sousLePoint(D: DispositionCarte, x: number, y: number): string | null {
  for (const [slug, b] of D.cartes) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2) return slug
  return null
}

