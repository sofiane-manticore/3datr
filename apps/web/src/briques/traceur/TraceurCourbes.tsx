import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cssVariable } from '../couleurs'
import { formater } from '../math'
import type { CouleurVariable } from '../types'

/**
 * Brique « Traceur de courbes 2D » : axes gradués, courbes f(x) recalculées à chaque rendu,
 * point qui suit le pointeur sur la première courbe, poignées verticales à faire glisser
 * (seuils, bornes) et points fixes. Rendu SVG mesuré en pixels : le texte n'est jamais déformé.
 */

export interface Courbe {
  f: (x: number) => number
  couleur?: CouleurVariable | string
  libelle?: string
  pointille?: boolean
  epaisseur?: number
}
export interface Poignee {
  x: number
  onChange: (x: number) => void
  couleur?: CouleurVariable | string
  libelle?: string
  pas?: number
  min?: number
  max?: number
}
export interface PointFixe {
  x: number
  y: number
  couleur?: CouleurVariable | string
  libelle?: string
}

const M = { g: 36, d: 14, h: 14, b: 26 }

/** Graduations « rondes » (1, 2, 5 × 10ⁿ). */
export function graduations(min: number, max: number, cible = 6) {
  const brut = (max - min) / cible
  const p = 10 ** Math.floor(Math.log10(brut))
  const pas = [1, 2, 5, 10].map((k) => k * p).find((k) => k >= brut) ?? 10 * p
  const t: number[] = []
  for (let v = Math.ceil(min / pas) * pas; v <= max + pas * 1e-6; v += pas) t.push(Math.abs(v) < pas * 1e-6 ? 0 : v)
  return t
}

export function TraceurCourbes({
  courbes,
  x: [x0, x1],
  y: [y0, y1],
  poignees = [],
  points = [],
  suivi = true,
  libelleX = 'x',
  libelleY,
  surimpression,
}: {
  courbes: Courbe[]
  x: [number, number]
  y: [number, number]
  poignees?: Poignee[]
  points?: PointFixe[]
  /** Point qui suit le pointeur sur la première courbe. */
  suivi?: boolean
  libelleX?: string
  libelleY?: string
  surimpression?: ReactNode
}) {
  const boite = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [t, setT] = useState({ l: 600, h: 375 })
  const [curseur, setCurseur] = useState<number | null>(null)
  const prise = useRef<number | null>(null)
  const idClip = `zone-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  useEffect(() => {
    const el = boite.current!
    const obs = new ResizeObserver(([e]) => setT({ l: Math.max(120, e.contentRect.width), h: Math.max(100, e.contentRect.height) }))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const L = t.l - M.g - M.d
  const H = t.h - M.h - M.b
  const px = (x: number) => M.g + ((x - x0) / (x1 - x0)) * L
  const py = (y: number) => M.h + (1 - (y - y0) / (y1 - y0)) * H
  const versX = (p: number) => x0 + ((p - M.g) / L) * (x1 - x0)

  const chemin = (f: (x: number) => number) => {
    const n = Math.max(200, Math.round(L))
    let d = ''
    let ouvert = false
    let precedent = NaN
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = f(x)
      if (!Number.isFinite(y)) {
        ouvert = false
        continue
      }
      // Saut vertical énorme : discontinuité (tan, step), on lève le crayon.
      const saut = Number.isFinite(precedent) && Math.abs(y - precedent) > (y1 - y0) * 0.9
      const yy = Math.max(-1e4, Math.min(1e4, py(y)))
      d += `${ouvert && !saut ? 'L' : 'M'}${px(x).toFixed(1)},${yy.toFixed(1)}`
      ouvert = true
      precedent = y
    }
    return d
  }

  const xPointeur = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return versX(e.clientX - r.left)
  }

  const onMove = (e: React.PointerEvent) => {
    const x = xPointeur(e)
    if (prise.current !== null) {
      const p = poignees[prise.current]
      const pas = p.pas ?? 0.01
      const v = Math.min(p.max ?? x1, Math.max(p.min ?? x0, Math.round(x / pas) * pas))
      p.onChange(Math.round(v * 1e4) / 1e4)
    }
    setCurseur(x >= x0 && x <= x1 ? x : null)
  }

  const gx = graduations(x0, x1, Math.max(3, Math.round(L / 70)))
  const gy = graduations(y0, y1, Math.max(3, Math.round(H / 50)))
  const yCurseur = curseur !== null && courbes[0] ? courbes[0].f(curseur) : null

  return (
    <div ref={boite} className="absolute inset-0 select-none">
      <svg
        ref={svg}
        width={t.l}
        height={t.h}
        className="block touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => prise.current === null && setCurseur(null)}
        onPointerUp={() => (prise.current = null)}
        onPointerCancel={() => (prise.current = null)}
        role="img"
        aria-label={courbes.map((c) => c.libelle).filter(Boolean).join(', ') || 'Graphique'}
      >
        <defs>
          <clipPath id={idClip}>
            <rect x={M.g} y={M.h} width={L} height={H} />
          </clipPath>
        </defs>
        {gx.map((v) => (
          <line key={`gx${v}`} x1={px(v)} x2={px(v)} y1={M.h} y2={M.h + H} stroke="var(--bord)" strokeWidth={v === 0 ? 1.5 : 1} />
        ))}
        {gy.map((v) => (
          <line key={`gy${v}`} y1={py(v)} y2={py(v)} x1={M.g} x2={M.g + L} stroke="var(--bord)" strokeWidth={v === 0 ? 1.5 : 1} />
        ))}
        {gx.map((v) => (
          <text key={`tx${v}`} x={px(v)} y={M.h + H + 16} textAnchor="middle" className="fill-doux font-mono text-[10px]">
            {formater(v, v % 1 ? 1 : 0)}
          </text>
        ))}
        {gy.map((v) => (
          <text key={`ty${v}`} x={M.g - 6} y={py(v) + 3} textAnchor="end" className="fill-doux font-mono text-[10px]">
            {formater(v, v % 1 ? 1 : 0)}
          </text>
        ))}
        <text x={M.g + L} y={M.h + H - 6} textAnchor="end" className="fill-doux font-mono text-[11px] italic">
          {libelleX}
        </text>
        {libelleY && (
          <text x={M.g + 6} y={M.h + 12} className="fill-doux font-mono text-[11px] italic">
            {libelleY}
          </text>
        )}

        <g clipPath={`url(#${idClip})`}>
          {courbes.map((c, i) => (
            <path
              key={i}
              d={chemin(c.f)}
              fill="none"
              stroke={cssVariable(c.couleur)}
              strokeWidth={c.epaisseur ?? 2.25}
              strokeDasharray={c.pointille ? '5 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {points.map((p, i) => (
            <circle key={i} cx={px(p.x)} cy={py(p.y)} r={4} fill={cssVariable(p.couleur)} />
          ))}
        </g>

        {poignees.map((p, i) => (
          <g key={i} className="cursor-ew-resize">
            <line x1={px(p.x)} x2={px(p.x)} y1={M.h} y2={M.h + H} stroke={cssVariable(p.couleur)} strokeWidth={1.5} strokeDasharray="3 3" />
            <rect
              x={px(p.x) - 12}
              y={M.h}
              width={24}
              height={H}
              fill="transparent"
              onPointerDown={(e) => {
                ;(e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId)
                prise.current = i
              }}
            />
            <circle cx={px(p.x)} cy={M.h + H} r={6} fill={cssVariable(p.couleur)} stroke="var(--surface)" strokeWidth={2} pointerEvents="none" />
            {p.libelle && (
              <text x={px(p.x) + 5} y={M.h + 11} className="font-mono text-[11px] font-semibold" fill={cssVariable(p.couleur)} pointerEvents="none">
                {p.libelle}
              </text>
            )}
          </g>
        ))}

        {suivi && curseur !== null && yCurseur !== null && Number.isFinite(yCurseur) && prise.current === null && (
          <g pointerEvents="none">
            <line x1={px(curseur)} x2={px(curseur)} y1={M.h} y2={M.h + H} stroke="var(--doux)" strokeWidth={1} opacity={0.5} />
            <circle cx={px(curseur)} cy={py(yCurseur)} r={4.5} fill="var(--surface)" stroke={cssVariable(courbes[0].couleur)} strokeWidth={2} />
            <text
              x={px(curseur) + (px(curseur) > M.g + L - 110 ? -8 : 8)}
              y={Math.min(M.h + H - 6, Math.max(M.h + 12, py(yCurseur) - 8))}
              textAnchor={px(curseur) > M.g + L - 110 ? 'end' : 'start'}
              className="fill-texte font-mono text-[11px]"
              paintOrder="stroke"
              stroke="var(--surface)"
              strokeWidth={3}
            >
              ({formater(curseur)} ; {formater(yCurseur)})
            </text>
          </g>
        )}
      </svg>
      {(surimpression || courbes.some((c) => c.libelle)) && (
        <div className="pointer-events-none absolute top-2 right-3 flex flex-col items-end gap-1 text-xs">
          {courbes
            .filter((c) => c.libelle)
            .map((c) => (
              <span key={c.libelle} className="flex items-center gap-1.5 rounded bg-surface/80 px-1.5 font-mono">
                <span className="inline-block h-0.5 w-4" style={{ background: cssVariable(c.couleur) }} />
                {c.libelle}
              </span>
            ))}
          {surimpression}
        </div>
      )}
    </div>
  )
}
