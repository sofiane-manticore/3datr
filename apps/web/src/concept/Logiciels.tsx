import { Children, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { ONGLETS_LOGICIELS } from '@3datr/core/sections'
import type { Logiciel as IdLogiciel } from '@3datr/core'
import { usePreference } from '../lib/progression'

interface PropsLogiciel {
  id: IdLogiciel
  /** Nom exact du node, ex. « Vector Math › Dot Product ». */
  node?: string
  children?: ReactNode
}

/** Un onglet de « Dans tes logiciels ». S'utilise dans <Logiciels>. */
export function Logiciel({ node, children }: PropsLogiciel) {
  return (
    <>
      {node && (
        <p className="text-sm text-doux">
          Node : <code>{node}</code>
        </p>
      )}
      {children}
    </>
  )
}

/**
 * Onglets par logiciel. Le choix est mémorisé : un artiste Unreal retrouve
 * l'onglet Unreal ouvert sur toutes les pages.
 *
 * <Logiciels>
 *   <Logiciel id="gn" node="Vector Math › Dot Product">…</Logiciel>
 *   <Logiciel id="code">…</Logiciel>
 * </Logiciels>
 */
export function Logiciels({ children }: { children?: ReactNode }) {
  const onglets = Children.toArray(children).filter(
    (c): c is ReactElement<PropsLogiciel> => isValidElement(c) && (c.props as PropsLogiciel).id !== undefined,
  )
  const ids = onglets.map((o) => o.props.id)
  const [prefere, setPrefere] = usePreference<IdLogiciel>('3datr-logiciel', ids[0] ?? 'gn')
  const actif = ids.includes(prefere) ? prefere : ids[0]
  const base = useId()
  if (!onglets.length) return null

  const libelle = (id: IdLogiciel) => ONGLETS_LOGICIELS.find((o) => o.id === id) ?? { court: id, long: id }
  const clavier = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const suivant = ids[(i + d + ids.length) % ids.length]
    setPrefere(suivant)
    document.getElementById(`${base}-onglet-${suivant}`)?.focus()
  }

  return (
    <div className="not-prose overflow-hidden rounded-xl border border-bord">
      <div role="tablist" aria-label="Logiciels" className="flex overflow-x-auto border-b border-bord bg-surface">
        {ids.map((id, i) => (
          <button
            key={id}
            id={`${base}-onglet-${id}`}
            role="tab"
            type="button"
            aria-selected={id === actif}
            aria-controls={`${base}-panneau-${id}`}
            tabIndex={id === actif ? 0 : -1}
            onClick={() => setPrefere(id)}
            onKeyDown={(e) => clavier(e, i)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm whitespace-nowrap transition ${
              id === actif ? 'border-accent font-semibold text-texte' : 'border-transparent text-doux hover:text-texte'
            }`}
            title={libelle(id).long}
          >
            {libelle(id).court}
          </button>
        ))}
      </div>
      {onglets.map((o) => (
        <div
          key={o.props.id}
          id={`${base}-panneau-${o.props.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-onglet-${o.props.id}`}
          hidden={o.props.id !== actif}
          className="prose-3datr space-y-4 p-4 sm:p-5"
        >
          {o}
        </div>
      ))}
    </div>
  )
}
