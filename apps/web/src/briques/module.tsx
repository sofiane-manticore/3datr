import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ControleAuto } from './controles'
import { defauts, ecrireEtat, lireEtat } from './etat-url'
import type { ComposantModule, DefModule, DefVariables, PropsVue, Valeurs } from './types'

/**
 * Déclare un module interactif. Le composant rendu hérite de :
 * contrôles générés depuis les variables (curseurs aux couleurs de la formule),
 * préréglages, bouton Réinitialiser, lien de partage, état dans l'URL et défi.
 *
 *   export default defineModule({
 *     id: 'DotProductPlayground',
 *     brique: 'scene-vecteurs-3d',
 *     variables: { a: { type: 'vec3', defaut: [1, 0, 0], couleur: 'rouge', libelle: 'Vecteur a' } },
 *     Vue: ({ v, set }) => <SceneVecteurs3D>…</SceneVecteurs3D>,
 *   })
 */
export function defineModule<const V extends DefVariables>(def: DefModule<V>): ComposantModule {
  const Module = () => <CoqueModule def={def} />
  Module.displayName = def.id
  return Object.assign(Module, { meta: { id: def.id, titre: def.titre, description: def.description, brique: def.brique } })
}

const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function useEtatModule<V extends DefVariables>(def: DefModule<V>) {
  const [v, setV] = useState<Valeurs<V>>(() =>
    typeof window === 'undefined' ? defauts(def.variables) : lireEtat(def.variables, new URLSearchParams(window.location.search)),
  )

  // L'URL suit l'état (sans entrée d'historique), pour partager une configuration.
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    const t = setTimeout(() => {
      // Les virgules restent lisibles dans l'adresse (?a=1,0,0).
      const p = ecrireEtat(def.variables, v, new URLSearchParams(window.location.search)).toString().replace(/%2C/gi, ',')
      const url = `${window.location.pathname}${p ? `?${p}` : ''}${window.location.hash}`
      window.history.replaceState(window.history.state, '', url)
    }, 200)
    return () => clearTimeout(t)
  }, [v, def.variables])

  const set = useCallback(<K extends keyof V>(nom: K, valeur: Valeurs<V>[K]) => setV((o) => ({ ...o, [nom]: valeur })), [])
  const setPlusieurs = useCallback((valeurs: Partial<Valeurs<V>>) => setV((o) => ({ ...o, ...valeurs })), [])
  return { v, setV, set, setPlusieurs }
}

function CoqueModule<V extends DefVariables>({ def }: { def: DefModule<V> }) {
  const { v, setV, set, setPlusieurs } = useEtatModule(def)
  const props: PropsVue<V> = { v, set, setPlusieurs }
  const initial = useMemo(() => defauts(def.variables), [def.variables])
  const modifie = !egal(v, initial)
  const { Vue, Lecture } = def
  const controles = Object.entries(def.variables).filter(([, d]) => !d.cache && d.type !== 'libre' && d.type !== 'texte')
  const dessous = def.disposition === 'dessous'
  const presetActif = def.presets?.find((p) => Object.entries(p.valeurs).every(([k, x]) => egal(v[k], x)))

  return (
    <section className="module-3datr overflow-hidden rounded-xl border border-bord bg-surface" aria-label={`Module interactif : ${def.titre}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-bord px-3 py-2">
        <h3 className="mr-auto text-sm font-semibold">{def.titre}</h3>
        {def.presets && def.presets.length > 0 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Préréglages">
            {def.presets.map((p) => (
              <button
                key={p.nom}
                type="button"
                onClick={() => setV({ ...initial, ...structuredClone(p.valeurs) })}
                aria-pressed={p === presetActif}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${p === presetActif ? 'border-accent text-texte' : 'border-bord text-doux hover:border-doux hover:text-texte'}`}
              >
                {p.nom}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <BoutonPartage />
          <button
            type="button"
            onClick={() => setV(structuredClone(initial))}
            disabled={!modifie}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-doux hover:bg-surface-2 hover:text-texte disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Réinitialiser
          </button>
        </div>
      </div>

      <div className={dessous ? '' : 'md:grid md:grid-cols-[minmax(0,1fr)_15.5rem]'}>
        <div className={`relative min-w-0 ${def.hauteurVue ?? 'aspect-[4/3] sm:aspect-[16/10]'}`}>
          <Vue {...props} />
        </div>
        {(controles.length > 0 || Lecture) && (
          <div
            className={`space-y-4 border-bord p-4 ${dessous ? 'grid gap-x-6 gap-y-4 border-t sm:grid-cols-2 sm:space-y-0 lg:grid-cols-3' : 'border-t md:border-t-0 md:border-l'}`}
          >
            {controles.map(([nom, d]) => (
              <ControleAuto key={nom} def={d} valeur={v[nom]} onChange={(x) => set(nom as keyof V, x as Valeurs<V>[keyof V])} />
            ))}
            {Lecture && (
              <div className={dessous ? 'sm:col-span-full' : ''}>
                <Lecture {...props} />
              </div>
            )}
          </div>
        )}
      </div>

      {def.defi && <Defi id={def.id} texte={def.defi.texte} reussi={def.defi.reussi(v)} />}
    </section>
  )
}

function Defi({ id, texte, reussi }: { id: string; texte: string; reussi: boolean }) {
  const [deja, setDeja] = useState(false)
  useEffect(() => {
    if (!reussi || deja) return
    setDeja(true)
    // La progression (étape API) écoutera cet événement.
    window.dispatchEvent(new CustomEvent('3datr:defi-reussi', { detail: { module: id } }))
  }, [reussi, deja, id])
  return (
    <div className={`flex items-center gap-2 border-t border-bord px-3 py-2 text-sm ${reussi ? 'text-texte' : 'text-doux'}`} aria-live="polite">
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${reussi ? 'border-[var(--v-vert)] bg-[var(--v-vert)] text-fond' : 'border-bord'}`}
        aria-hidden="true"
      >
        {reussi && (
          <svg viewBox="0 0 16 16" className="size-3">
            <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>
        <span className="font-semibold">Défi{reussi ? ' réussi' : ''} :</span> {texte}
      </span>
    </div>
  )
}

function BoutonPartage() {
  const [copie, setCopie] = useState(false)
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopie(true)
      setTimeout(() => setCopie(false), 1500)
    } catch {
      /* presse-papiers refusé : l'URL reste visible dans la barre d'adresse */
    }
  }
  return (
    <button
      type="button"
      onClick={copier}
      title="Copier le lien de cette configuration"
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-doux hover:bg-surface-2 hover:text-texte"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
        <path d="M6.5 9.5 9.5 6.5M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {copie ? 'Lien copié' : 'Partager'}
    </button>
  )
}

/** Surimpression discrète en coin de vue (légende, mesure, bouton d'axe). */
export function Coin({ position = 'haut-gauche', children }: { position?: 'haut-gauche' | 'haut-droite' | 'bas-gauche' | 'bas-droite'; children: ReactNode }) {
  const pos = {
    'haut-gauche': 'left-2 top-2',
    'haut-droite': 'right-2 top-2',
    'bas-gauche': 'bottom-2 left-2',
    'bas-droite': 'bottom-2 right-2',
  }[position]
  return <div className={`pointer-events-none absolute ${pos} z-10 flex flex-col gap-1 [&>*]:pointer-events-auto`}>{children}</div>
}
