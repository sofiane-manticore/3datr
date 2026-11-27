import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { NoeudGraphe } from '@3datr/core'
import { LIBELLES_NIVEAUX } from '@3datr/core/sections'
import { Anneaux, PastilleDomaine } from '../concept/Pastilles'
import type { Focus } from './dessin'
import { type GrapheCarte, rechercher } from './graphe'

interface Props {
  g: GrapheCarte
  vus: Set<string> | null
  zoom: number
  noeud: NoeudGraphe | null
  focus: Focus | null
  /** Vrai quand le concept affiché vient d'une recherche ou d'un appui, pas d'un survol. */
  selectionne: boolean
  domaineSurvole: string | null
  onRecherche: (slug: string) => void
  onDomaine: (slug: string) => void
  onSurvolDomaine: (slug: string | null) => void
  onZoom: (f: number) => void
  onRecentrer: () => void
  onFermer: () => void
}

const bouton =
  'grid size-9 place-items-center rounded-lg border border-bord bg-surface/85 text-texte backdrop-blur hover:bg-surface-2 active:scale-95'

/** Tout ce qui flotte au-dessus de la carte : recherche, légende des domaines, zoom, fiche du concept visé. */
export function Interface(p: Props) {
  const total = p.g.noeuds.length
  const nbVus = p.vus ? p.g.noeuds.filter((n) => p.vus!.has(n.slug)).length : 0

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <Recherche g={p.g} onChoix={p.onRecherche} />
        <div className="pointer-events-auto ml-auto hidden rounded-lg border border-bord bg-surface/85 px-3 py-2 text-xs text-doux backdrop-blur sm:block">
          <span className="font-semibold text-texte tabular-nums">{nbVus}</span> / {total} concepts vus
        </div>
      </div>

      <div className="mt-auto flex items-end gap-3">
        <Legende {...p} />
        <div className="ml-auto flex flex-col items-end gap-3">
          {p.noeud && <Fiche {...p} noeud={p.noeud} />}
          <div className="pointer-events-auto flex flex-col gap-1.5">
            <button type="button" className={bouton} onClick={() => p.onZoom(1.6)} aria-label="Zoomer">
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
            <button type="button" className={bouton} onClick={() => p.onZoom(1 / 1.6)} aria-label="Dézoomer">
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
            <button type="button" className={bouton} onClick={p.onRecentrer} aria-label="Voir toute la carte" title="Voir toute la carte (0)">
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Recherche({ g, onChoix }: { g: GrapheCarte; onChoix: (slug: string) => void }) {
  const [q, setQ] = useState('')
  const [actif, setActif] = useState(0)
  const resultats = useMemo(() => rechercher(g.noeuds, q), [g, q])
  const couleur = new Map(g.domaines.map((d) => [d.slug, d.couleur]))
  const choisir = (n: NoeudGraphe) => {
    onChoix(n.slug)
    setQ('')
  }
  return (
    <div className="pointer-events-auto relative w-full max-w-xs">
      <label className="flex items-center gap-2 rounded-lg border border-bord bg-surface/85 px-3 backdrop-blur focus-within:border-accent">
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-doux" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3 3" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Chercher un concept sur la carte</span>
        <input
          type="search"
          value={q}
          placeholder="Chercher un concept…"
          className="h-9 w-full bg-transparent text-sm placeholder:text-doux"
          style={{ outline: 'none' }}
          onChange={(e) => {
            setQ(e.target.value)
            setActif(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActif((a) => Math.min(resultats.length - 1, a + 1))
            else if (e.key === 'ArrowUp') setActif((a) => Math.max(0, a - 1))
            else if (e.key === 'Enter' && resultats[actif]) choisir(resultats[actif])
            else if (e.key === 'Escape') setQ('')
            else return
            e.preventDefault()
          }}
          aria-controls="resultats-carte"
          aria-activedescendant={resultats[actif] ? `res-${resultats[actif].slug}` : undefined}
        />
      </label>
      {resultats.length > 0 && (
        <ul id="resultats-carte" role="listbox" className="absolute inset-x-0 top-11 z-10 overflow-hidden rounded-lg border border-bord bg-surface shadow-xl">
          {resultats.map((n, i) => (
            <li key={n.slug} id={`res-${n.slug}`} role="option" aria-selected={i === actif}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === actif ? 'bg-surface-2' : ''}`}
                onMouseEnter={() => setActif(i)}
                onClick={() => choisir(n)}
              >
                <PastilleDomaine couleur={couleur.get(n.domaine) ?? '#888'} />
                <span className="truncate">{n.titre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Legende({ g, onDomaine, onSurvolDomaine, domaineSurvole }: Props) {
  const [ouverte, setOuverte] = useState(false)
  const compte = useMemo(() => {
    const m = new Map<string, number>()
    for (const n of g.noeuds) m.set(n.domaine, (m.get(n.domaine) ?? 0) + 1)
    return m
  }, [g])
  return (
    <div className="pointer-events-auto max-w-[15rem] rounded-xl border border-bord bg-surface/85 p-2 text-sm backdrop-blur">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-1.5 py-1 text-xs font-semibold tracking-wider text-doux uppercase sm:pointer-events-none"
        onClick={() => setOuverte((o) => !o)}
        aria-expanded={ouverte}
      >
        {g.domaines.length} domaines
        <span className="sm:hidden" aria-hidden="true">{ouverte ? '▾' : '▸'}</span>
      </button>
      <ul className={`${ouverte ? 'block' : 'hidden'} mt-1 max-h-[45vh] overflow-y-auto sm:block`}>
        {g.domaines.map((d) => (
          <li key={d.slug}>
            <button
              type="button"
              className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-surface-2 ${domaineSurvole === d.slug ? 'bg-surface-2' : ''}`}
              onClick={() => {
                onDomaine(d.slug)
                setOuverte(false)
              }}
              onMouseEnter={() => onSurvolDomaine(d.slug)}
              onMouseLeave={() => onSurvolDomaine(null)}
              onFocus={() => onSurvolDomaine(d.slug)}
              onBlur={() => onSurvolDomaine(null)}
            >
              <PastilleDomaine couleur={d.couleur} />
              <span className="min-w-0 flex-1 truncate">{d.titre}</span>
              <span className="text-xs text-doux tabular-nums">{compte.get(d.slug) ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 hidden space-y-1 border-t border-bord px-1.5 pt-2 text-xs text-doux sm:block">
        <div className="flex items-center gap-2">
          <svg width="26" height="8" aria-hidden="true"><path d="M1 4h19" stroke="currentColor" strokeWidth="1.4" /><path d="M25 4l-6-3v6z" fill="currentColor" /></svg>
          prérequis → suite
        </div>
        <div className="flex items-center gap-2">
          <svg width="26" height="8" aria-hidden="true"><path d="M1 4h24" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" /></svg>
          alternative
        </div>
        <div className="flex items-center gap-2">
          <svg width="26" height="12" aria-hidden="true"><circle cx="13" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          à découvrir
        </div>
        <div className="flex items-center gap-2">
          <svg width="26" height="12" aria-hidden="true"><circle cx="13" cy="6" r="5.5" fill="currentColor" /><path d="m10.6 6.1 1.6 1.6 3.2-3.3" fill="none" stroke="var(--fond)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          déjà vu
        </div>
      </div>
      <Link to="/concepts" className="mt-1 block px-1.5 py-1 text-xs text-doux underline-offset-4 hover:text-texte hover:underline">
        Voir la liste complète
      </Link>
    </div>
  )
}

function Fiche({ g, noeud, focus, vus, selectionne, onFermer }: Props & { noeud: NoeudGraphe }) {
  const d = g.domaines.find((x) => x.slug === noeud.domaine)
  const chemin = focus?.chemin.size ?? 0
  const cheminVus = focus && vus ? [...focus.chemin].filter((s) => vus.has(s)).length : 0
  const suites = focus?.suites.size ?? 0
  const vu = vus?.has(noeud.slug)
  return (
    <div className="pointer-events-auto w-72 max-w-[calc(100vw-5.5rem)] rounded-xl border border-bord bg-surface/90 p-4 shadow-2xl backdrop-blur" aria-live="polite">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-doux">
            <PastilleDomaine couleur={d?.couleur ?? '#888'} className="size-2" />
            <span className="truncate">{d?.titre}</span>
          </div>
          <h2 className="mt-1 leading-snug font-semibold text-balance">{noeud.titre}</h2>
        </div>
        {selectionne && (
          <button type="button" onClick={onFermer} className="-mt-1 -mr-1 rounded p-1 text-doux hover:bg-surface-2 hover:text-texte" aria-label="Fermer">
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-doux">
        <span className="inline-flex items-center gap-1.5">
          <Anneaux niveau={noeud.niveau} /> {LIBELLES_NIVEAUX[noeud.niveau]}
        </span>
        {vu && <span className="text-texte">✓ Déjà vu</span>}
        {noeud.statut === 'brouillon' && <span>En rédaction</span>}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-surface-2 px-2.5 py-2">
          <dt className="text-doux">Pour y arriver</dt>
          <dd className="mt-0.5 font-semibold" style={{ color: 'var(--accent)' }}>
            {chemin === 0 ? 'Point de départ' : `${chemin} concept${chemin > 1 ? 's' : ''}`}
            {chemin > 0 && cheminVus > 0 && <span className="font-normal text-doux"> · {cheminVus} vus</span>}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-2 px-2.5 py-2">
          <dt className="text-doux">Ouvre la voie à</dt>
          <dd className="mt-0.5 font-semibold" style={{ color: 'var(--v-vert)' }}>
            {suites === 0 ? 'Aboutissement' : `${suites} concept${suites > 1 ? 's' : ''}`}
          </dd>
        </div>
      </dl>
      {selectionne ? (
        <Link
          to={`/concepts/${noeud.slug}`}
          prefetch="intent"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-fond hover:opacity-90"
        >
          Ouvrir le concept →
        </Link>
      ) : (
        <p className="mt-3 text-xs text-doux">Clique pour ouvrir le concept.</p>
      )}
    </div>
  )
}
