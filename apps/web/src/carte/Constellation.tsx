import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Graphe, NoeudGraphe } from '@3datr/core'
import { useVus } from '../lib/progression'
import { type Camera, cadrer, interpoler, versCarte, zoomerAutour } from './camera'
import { type EtatDessin, type Focus, dessiner, lirePalette, sousLePoint } from './dessin'
import { type DispositionCarte, disposerCarte } from './disposition'
import { ancetres, indexerGraphe } from './graphe'
import { Interface } from './Interface'

const CLE_CAMERA = '3datr-camera'

export type DonneesCarte = Pick<Graphe, 'noeuds' | 'liens' | 'domaines'>

/**
 * La carte des concepts : un canevas infini où l'on se déplace (glisser, molette, pincer).
 * Chaque domaine est une carte mentale ; survoler un concept montre tout le chemin de ses prérequis.
 */
export function Constellation({ donnees }: { donnees: DonneesCarte }) {
  // La disposition mesure le texte : elle se calcule dans le navigateur seulement.
  const disposition = useMemo<DispositionCarte | null>(() => {
    if (typeof document === 'undefined') return null
    const ctx = document.createElement('canvas').getContext('2d')!
    const mesure = (t: string, police: string) => {
      ctx.font = police
      return ctx.measureText(t).width
    }
    return disposerCarte(donnees, mesure, getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif')
  }, [donnees])
  const g = useMemo(() => {
    if (!disposition) return indexerGraphe(donnees)
    const noeuds = donnees.noeuds.map((n) => ({ ...n, ...pos(disposition, n.slug, n) }))
    return indexerGraphe({ ...donnees, noeuds })
  }, [donnees, disposition])
  const navigate = useNavigate()
  const vus = useVus()
  const conteneur = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  const [survol, setSurvol] = useState<string | null>(null)
  const [selection, setSelection] = useState<string | null>(null)
  const [domaineSurvole, setDomaineSurvole] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pret, setPret] = useState(false)

  const vise = survol ?? selection
  const focus = useMemo<Focus | null>(
    () => (vise ? { slug: vise, chemin: ancetres(g, vise), suites: new Set(g.suites.get(vise) ?? []) } : null),
    [g, vise],
  )

  // Tout ce que la boucle de dessin lit, sans repasser par React à chaque image.
  const etat = useRef<EtatDessin | null>(null)
  const vol = useRef<{ de: Camera; vers: Camera; debut: number; duree: number } | null>(null)
  const inertie = useRef<{ vx: number; vy: number } | null>(null)
  const image = useRef(0)
  const demanderDessin = useRef<() => void>(() => {})

  const boiteTout = useMemo(() => (disposition ? union([...disposition.zones.values()]) : boite(g.noeuds)), [g, disposition])

  // Mise en place : taille, thème, première caméra (celle de la dernière visite si elle existe).
  useEffect(() => {
    if (!disposition) return
    const cv = canvas.current!
    const ct = conteneur.current!
    const ctx = cv.getContext('2d')!
    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const r = ct.getBoundingClientRect()
    let camera = vueEnsemble(boiteTout, r.width, r.height)
    try {
      const c = JSON.parse(sessionStorage.getItem(CLE_CAMERA) ?? 'null') as Camera | null
      if (c && [c.x, c.y, c.k].every(Number.isFinite)) camera = c
    } catch {
      /* rien */
    }
    etat.current = {
      camera,
      largeur: r.width,
      hauteur: r.height,
      dpr: window.devicePixelRatio || 1,
      palette: lirePalette(),
      disposition,
      focus: null,
      domaineSurvole: null,
      vus: new Set(),
      t: 0,
      mouvementReduit,
    }

    let enCours = false
    const boucle = (ms: number) => {
      const e = etat.current!
      e.t = ms / 1000
      let encore = false
      if (vol.current) {
        const v = vol.current
        const t = Math.min(1, (ms - v.debut) / v.duree)
        e.camera = interpoler(v.de, v.vers, t)
        if (t >= 1) vol.current = null
        else encore = true
      } else if (inertie.current) {
        const i = inertie.current
        e.camera = { ...e.camera, x: e.camera.x - i.vx / e.camera.k, y: e.camera.y - i.vy / e.camera.k }
        i.vx *= 0.92
        i.vy *= 0.92
        if (Math.hypot(i.vx, i.vy) < 0.2) inertie.current = null
        else encore = true
      }
      dessiner(ctx, g, e)
      setZoom((z) => (Math.abs(z - e.camera.k) > 0.01 ? e.camera.k : z))
      if (encore) image.current = requestAnimationFrame(boucle)
      else {
        enCours = false
        try {
          sessionStorage.setItem(CLE_CAMERA, JSON.stringify(e.camera))
        } catch {
          /* rien */
        }
      }
    }
    demanderDessin.current = () => {
      if (enCours) return
      enCours = true
      image.current = requestAnimationFrame(boucle)
    }

    const redimensionner = () => {
      const b = ct.getBoundingClientRect()
      const e = etat.current!
      e.largeur = b.width
      e.hauteur = b.height
      e.dpr = window.devicePixelRatio || 1
      cv.width = Math.round(b.width * e.dpr)
      cv.height = Math.round(b.height * e.dpr)
      cv.style.width = `${b.width}px`
      cv.style.height = `${b.height}px`
      demanderDessin.current()
    }
    const ro = new ResizeObserver(redimensionner)
    ro.observe(ct)
    redimensionner()

    const mo = new MutationObserver(() => {
      etat.current!.palette = lirePalette()
      demanderDessin.current()
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    setPret(true)

    return () => {
      ro.disconnect()
      mo.disconnect()
      cancelAnimationFrame(image.current)
    }
  }, [g, boiteTout, disposition])

  useEffect(() => {
    if (!etat.current) return
    etat.current.focus = focus
    etat.current.domaineSurvole = domaineSurvole
    etat.current.vus = vus ?? new Set()
    demanderDessin.current()
  }, [focus, domaineSurvole, vus])

  const voler = useCallback((vers: Camera, duree = 700) => {
    const e = etat.current
    if (!e) return
    inertie.current = null
    if (e.mouvementReduit) {
      e.camera = vers
      vol.current = null
    } else vol.current = { de: e.camera, vers, debut: performance.now(), duree }
    demanderDessin.current()
  }, [])

  const allerVers = useCallback(
    (slug: string) => {
      const n = g.parSlug.get(slug)
      const e = etat.current
      if (!n || !e) return
      setSelection(slug)
      voler({ x: n.x, y: n.y, k: Math.max(e.camera.k, 1.3) })
    },
    [g, voler],
  )

  const allerAuDomaine = useCallback(
    (slug: string) => {
      const e = etat.current
      if (!e) return
      setSelection(null)
      const z = e.disposition.zones.get(slug)
      if (z) voler(cadrer(z, e.largeur - (e.largeur >= 640 ? 260 : 0), e.hauteur, 40))
    },
    [voler],
  )

  const zoomer = useCallback(
    (f: number) => {
      const e = etat.current
      if (!e) return
      voler(zoomerAutour(e.camera, e.largeur, e.hauteur, e.largeur / 2, e.hauteur / 2, f), 300)
    },
    [voler],
  )

  const recentrer = useCallback(() => {
    const e = etat.current
    if (e) voler(vueEnsemble(boiteTout, e.largeur, e.hauteur))
  }, [boiteTout, voler])

  // ---------- Pointeur : glisser, pincer, molette, survol, clic ----------
  const pointeurs = useRef(new Map<number, { x: number; y: number }>())
  const geste = useRef<{
    x: number
    y: number
    deplace: boolean
    t: number
    dernier: { x: number; y: number; t: number }
    vitesse?: { vx: number; vy: number }
  } | null>(null)

  const noeudSous = useCallback(
    (sx: number, sy: number): NoeudGraphe | null => {
      const e = etat.current
      if (!e) return null
      const p = versCarte(e.camera, e.largeur, e.hauteur, sx, sy)
      const slug = sousLePoint(e.disposition, p.x, p.y)
      return slug ? (g.parSlug.get(slug) ?? null) : null
    },
    [g],
  )

  useEffect(() => {
    const cv = canvas.current!
    const molette = (ev: WheelEvent) => {
      ev.preventDefault()
      const e = etat.current
      if (!e) return
      vol.current = null
      inertie.current = null
      const r = cv.getBoundingClientRect()
      // Molette de souris : zoom. Pavé tactile : deux doigts déplacent, pincer (ctrlKey) zoome.
      const pave = !ev.ctrlKey && ev.deltaMode === 0 && Math.abs(ev.deltaX) > 0
      if (pave) {
        e.camera = { ...e.camera, x: e.camera.x + ev.deltaX / e.camera.k, y: e.camera.y + ev.deltaY / e.camera.k }
      } else {
        const unite = ev.deltaMode === 1 ? 16 : 1
        const f = Math.exp(-ev.deltaY * unite * (ev.ctrlKey ? 0.01 : 0.0015))
        e.camera = zoomerAutour(e.camera, e.largeur, e.hauteur, ev.clientX - r.left, ev.clientY - r.top, f)
      }
      demanderDessin.current()
    }
    cv.addEventListener('wheel', molette, { passive: false })
    return () => cv.removeEventListener('wheel', molette)
  }, [])

  const local = (ev: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: ev.clientX - r.left, y: ev.clientY - r.top }
  }

  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    ev.currentTarget.setPointerCapture(ev.pointerId)
    const p = local(ev)
    pointeurs.current.set(ev.pointerId, p)
    vol.current = null
    inertie.current = null
    if (pointeurs.current.size === 1) geste.current = { ...p, deplace: false, t: performance.now(), dernier: { ...p, t: performance.now() } }
    else if (geste.current) geste.current.deplace = true
  }

  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const e = etat.current
    if (!e) return
    const p = local(ev)
    const avant = pointeurs.current.get(ev.pointerId)
    if (!avant) {
      // Simple survol à la souris.
      if (ev.pointerType === 'mouse') {
        const n = noeudSous(p.x, p.y)
        setSurvol(n?.slug ?? null)
        ev.currentTarget.style.cursor = n ? 'pointer' : 'grab'
      }
      return
    }
    if (pointeurs.current.size === 2) {
      const [idA, idB] = [...pointeurs.current.keys()]
      const autre = pointeurs.current.get(idA === ev.pointerId ? idB! : idA!)!
      const dAvant = Math.hypot(avant.x - autre.x, avant.y - autre.y)
      const dApres = Math.hypot(p.x - autre.x, p.y - autre.y)
      const mx = (p.x + autre.x) / 2
      const my = (p.y + autre.y) / 2
      let c = zoomerAutour(e.camera, e.largeur, e.hauteur, mx, my, dApres / Math.max(1, dAvant))
      c = { ...c, x: c.x - (p.x - avant.x) / 2 / c.k, y: c.y - (p.y - avant.y) / 2 / c.k }
      e.camera = c
    } else {
      const g0 = geste.current
      if (g0 && !g0.deplace && Math.hypot(p.x - g0.x, p.y - g0.y) < 5) return
      if (g0) {
        g0.deplace = true
        const now = performance.now()
        const dt = Math.max(1, now - g0.dernier.t)
        inertie.current = null
        g0.vitesse = {
          vx: ((p.x - g0.dernier.x) / dt) * 16,
          vy: ((p.y - g0.dernier.y) / dt) * 16,
        }
        g0.dernier = { ...p, t: now }
      }
      e.camera = { ...e.camera, x: e.camera.x - (p.x - avant.x) / e.camera.k, y: e.camera.y - (p.y - avant.y) / e.camera.k }
      ev.currentTarget.style.cursor = 'grabbing'
      if (survol) setSurvol(null)
    }
    pointeurs.current.set(ev.pointerId, p)
    demanderDessin.current()
  }

  const onPointerUp = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(ev)
    pointeurs.current.delete(ev.pointerId)
    const g0 = geste.current
    if (pointeurs.current.size > 0) return
    geste.current = null
    ev.currentTarget.style.cursor = 'grab'
    if (!g0) return
    if (g0.deplace) {
      const v = g0.vitesse
      if (v && performance.now() - g0.dernier.t < 80 && !etat.current?.mouvementReduit) {
        inertie.current = v
        demanderDessin.current()
      }
      return
    }
    const n = noeudSous(p.x, p.y)
    if (ev.pointerType === 'mouse') {
      if (n) navigate(`/concepts/${n.slug}`)
      else setSelection(null)
    } else {
      // Au doigt, pas de survol : un premier appui montre le concept et son chemin, la fiche s'ouvre depuis la carte.
      setSelection(n?.slug ?? null)
    }
  }

  const onDoubleClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const e = etat.current
    if (!e) return
    const r = canvas.current!.getBoundingClientRect()
    voler(zoomerAutour(e.camera, e.largeur, e.hauteur, ev.clientX - r.left, ev.clientY - r.top, 2), 350)
  }

  const onKeyDown = (ev: React.KeyboardEvent) => {
    const e = etat.current
    if (!e) return
    const pas = 120 / e.camera.k
    const deplacer = (dx: number, dy: number) => voler({ ...e.camera, x: e.camera.x + dx, y: e.camera.y + dy }, 200)
    const actions: Record<string, () => void> = {
      ArrowLeft: () => deplacer(-pas, 0),
      ArrowRight: () => deplacer(pas, 0),
      ArrowUp: () => deplacer(0, -pas),
      ArrowDown: () => deplacer(0, pas),
      '+': () => zoomer(1.5),
      '=': () => zoomer(1.5),
      '-': () => zoomer(1 / 1.5),
      '0': recentrer,
      Escape: () => setSelection(null),
    }
    const a = actions[ev.key]
    if (a) {
      ev.preventDefault()
      a()
    }
  }

  const noeudVise = vise ? g.parSlug.get(vise) ?? null : null

  return (
    <div ref={conteneur} className="relative h-full w-full overflow-hidden select-none" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvas}
        tabIndex={0}
        role="img"
        aria-label={`Carte des ${g.noeuds.length} concepts, regroupés en ${g.domaines.length} domaines. Utilise la recherche ou la liste pour naviguer au clavier.`}
        className={`absolute inset-0 cursor-grab outline-none transition-opacity duration-700 ${pret ? 'opacity-100' : 'opacity-0'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(ev) => ev.pointerType === 'mouse' && !pointeurs.current.size && setSurvol(null)}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      />
      <Interface
        g={g}
        vus={vus}
        zoom={zoom}
        noeud={noeudVise}
        focus={focus}
        selectionne={selection !== null && survol === null}
        domaineSurvole={domaineSurvole}
        onRecherche={allerVers}
        onDomaine={allerAuDomaine}
        onSurvolDomaine={setDomaineSurvole}
        onZoom={zoomer}
        onRecentrer={recentrer}
        onFermer={() => setSelection(null)}
      />
    </div>
  )
}

function pos(d: DispositionCarte, slug: string, defaut: { x: number; y: number }) {
  const b = d.cartes.get(slug)
  return b ? { x: b.x, y: b.y } : { x: defaut.x, y: defaut.y }
}

function union(zs: { minX: number; minY: number; maxX: number; maxY: number }[]) {
  return zs.reduce(
    (b, z) => ({ minX: Math.min(b.minX, z.minX), minY: Math.min(b.minY, z.minY), maxX: Math.max(b.maxX, z.maxX), maxY: Math.max(b.maxY, z.maxY) }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  )
}

function boite(ns: { x: number; y: number }[]) {
  return ns.reduce(
    (b, n) => ({ minX: Math.min(b.minX, n.x), minY: Math.min(b.minY, n.y), maxX: Math.max(b.maxX, n.x), maxY: Math.max(b.maxY, n.y) }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  )
}

/** Toute la carte, décalée à droite sur grand écran pour ne pas passer sous la légende. */
function vueEnsemble(b: ReturnType<typeof boite>, l: number, h: number): Camera {
  const legende = l >= 640 ? 260 : 0
  const c = cadrer(b, l - legende, h, 20)
  return { ...c, x: c.x - legende / 2 / c.k }
}
