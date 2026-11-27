import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { chargeurModule } from '../lib/modules'
import { useConcept } from './contexte'

/**
 * Le module interactif, visible sans scroller. Il n'est monté que dans le navigateur
 * (WebGL, pointeur) : le HTML pré-rendu montre un cadre de même taille, sans saut de mise en page.
 * Tant que la fiche n'a pas son module, le cadre affiche l'idée de module du catalogue.
 */
export function EmplacementModule() {
  const { concept } = useConcept()
  const chargeur = chargeurModule(concept.module)
  const Module = useMemo(() => (chargeur ? lazy(chargeur) : null), [chargeur])
  const [monte, setMonte] = useState(false)
  useEffect(() => setMonte(true), [])

  if (!Module) {
    return (
      <Cadre>
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <svg viewBox="0 0 48 48" className="size-10 text-doux" aria-hidden="true">
            <path d="M24 6 40 15v18l-16 9-16-9V15z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M24 24 40 15M24 24 8 15M24 24v18" stroke="var(--accent)" strokeWidth="2" />
          </svg>
          <p className="font-semibold">Module interactif en préparation</p>
          {concept.idee_module && <p className="max-w-md text-sm text-doux">Au programme : {concept.idee_module}.</p>}
        </div>
      </Cadre>
    )
  }

  // Le module a son propre cadre (barre d'outils, vue, contrôles) ; même gabarit en attendant.
  return monte ? (
    <ErreurModule>
      <Suspense fallback={<AttenteModule />}>
        <Module />
      </Suspense>
    </ErreurModule>
  ) : (
    <AttenteModule />
  )
}

export function AttenteModule() {
  return (
    <div className="overflow-hidden rounded-xl border border-bord bg-surface">
      <div className="h-[41px] border-b border-bord" />
      <div className="fond-grille aspect-[4/3] sm:aspect-[16/10]">
        <Attente />
      </div>
    </div>
  )
}

function Cadre({ children }: { children: ReactNode }) {
  return (
    <div className="fond-grille relative aspect-[4/3] max-h-[70vh] w-full overflow-hidden rounded-xl border border-bord sm:aspect-[16/10]">
      {children}
    </div>
  )
}

function Attente() {
  return <div className="flex h-full items-center justify-center text-sm text-doux">Chargement du module…</div>
}

export class ErreurModule extends Component<{ children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false }
  static getDerivedStateFromError() {
    return { erreur: true }
  }
  render() {
    if (this.state.erreur)
      return <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-bord p-6 text-center text-sm text-doux">Le module n'a pas pu démarrer sur cet appareil.</div>
    return this.props.children
  }
}
