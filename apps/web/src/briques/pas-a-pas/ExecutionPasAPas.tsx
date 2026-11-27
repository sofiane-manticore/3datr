import { useEffect, useState, type ReactNode } from 'react'
import { CodeAnnote, type Langage } from '../CodeAnnote'
import { formater } from '../math'
import { changees, type Etape, type Valeur } from './trace'

/**
 * Brique « Exécution pas à pas » : le code, la ligne en cours, les variables à cet instant
 * (celles qui viennent de changer sont surlignées), la sortie console, et un rendu libre
 * de l'état (points posés, tableau rempli…). Lecture, pause, pas précédent, pas suivant.
 */
export function ExecutionPasAPas({
  code,
  langage = 'python',
  etapes,
  rendu,
  intervalle = 600,
}: {
  code: string
  langage?: Langage
  etapes: Etape[]
  /** Dessin de l'état à l'étape courante. */
  rendu?: (e: Etape, index: number) => ReactNode
  /** Millisecondes entre deux pas en lecture. */
  intervalle?: number
}) {
  const [i, setI] = useState(0)
  const [lecture, setLecture] = useState(false)
  const n = etapes.length
  const k = Math.min(i, Math.max(0, n - 1))
  const e = etapes[k]

  useEffect(() => {
    if (!lecture) return
    if (k >= n - 1) {
      setLecture(false)
      return
    }
    const t = setTimeout(() => setI(k + 1), intervalle)
    return () => clearTimeout(t)
  }, [lecture, k, n, intervalle])

  if (!e) return null
  const nouveaux = changees(etapes[k - 1], e)

  const bouton = 'flex size-8 items-center justify-center rounded-md text-doux hover:bg-surface-2 hover:text-texte disabled:opacity-35 disabled:hover:bg-transparent'
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:grid-rows-1">
        <div className="min-h-0 overflow-auto border-bord bg-fond/60 py-2 max-md:border-b md:border-r">
          <CodeAnnote code={code} langage={langage} active={e.ligne} />
        </div>
        <div className="flex min-h-0 flex-col">
          {rendu && <div className="relative min-h-0 flex-1 border-b border-bord">{rendu(e, k)}</div>}
          <div className={`overflow-auto p-3 ${rendu ? 'max-h-[45%] shrink-0' : 'flex-1'}`}>
            <table className="w-full font-mono text-xs">
              <caption className="pb-1 text-left font-sans text-[11px] tracking-wide text-doux uppercase">Variables</caption>
              <tbody>
                {Object.entries(e.variables).map(([nom, v]) => (
                  <tr key={nom} className={nouveaux.has(nom) ? 'text-accent' : ''}>
                    <td className="py-0.5 pr-3 align-top">{nom}</td>
                    <td className="py-0.5 break-all">{afficher(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {e.note && <p className="mt-2 text-xs text-doux">{e.note}</p>}
            {e.sortie.length > 0 && (
              <div className="mt-2 rounded border border-bord bg-fond px-2 py-1 font-mono text-[11px]">
                {e.sortie.slice(-4).map((l, j) => (
                  <div key={j}>{l}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 border-t border-bord px-2 py-1">
        <button type="button" className={bouton} onClick={() => (setLecture(false), setI(0))} disabled={k === 0} aria-label="Revenir au début">
          <Icone d="M4 3v10M13 3 6 8l7 5z" />
        </button>
        <button type="button" className={bouton} onClick={() => (setLecture(false), setI(k - 1))} disabled={k === 0} aria-label="Pas précédent">
          <Icone d="M11 3 5 8l6 5z" />
        </button>
        <button
          type="button"
          className={`${bouton} text-texte`}
          onClick={() => {
            if (k >= n - 1) setI(0)
            setLecture(!lecture)
          }}
          aria-label={lecture ? 'Pause' : 'Lecture'}
        >
          {lecture ? <Icone d="M5 3v10M11 3v10" trait /> : <Icone d="M5 3l8 5-8 5z" />}
        </button>
        <button type="button" className={bouton} onClick={() => (setLecture(false), setI(k + 1))} disabled={k >= n - 1} aria-label="Pas suivant">
          <Icone d="M5 3l6 5-6 5z" />
        </button>
        <input
          type="range"
          className="curseur mx-2 flex-1"
          min={0}
          max={Math.max(0, n - 1)}
          value={k}
          onChange={(ev) => (setLecture(false), setI(Number(ev.target.value)))}
          aria-label="Étape"
          style={{ ['--c' as string]: 'var(--accent)', ['--p' as string]: `${n > 1 ? (k / (n - 1)) * 100 : 0}%` }}
        />
        <span className="w-20 text-right font-mono text-xs text-doux tabular-nums">
          {k + 1} / {n}
        </span>
      </div>
    </div>
  )
}

function afficher(v: Valeur): string {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : formater(v, 3)
  if (typeof v === 'string') return `"${v}"`
  if (Array.isArray(v)) return `[${v.slice(0, 8).map(afficher).join(', ')}${v.length > 8 ? ', …' : ''}]`
  if (v && typeof v === 'object') return `{${Object.entries(v).map(([k, x]) => `${k}: ${afficher(x)}`).join(', ')}}`
  return String(v)
}

function Icone({ d, trait }: { d: string; trait?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path d={d} fill={trait ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth={trait ? 2 : 1} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
