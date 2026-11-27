import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import { SECTIONS_CONCEPT, type IdSection, type IdSectionRedigee } from '@3datr/core/sections'
import type { ContenuMdx } from '../lib/contenus'
import type { DonneesConcept } from '../lib/types'
import { ContexteConcept, useConcept } from './contexte'
import { EmplacementModule } from './EmplacementModule'
import { Encadre } from './Encadre'
import { EnTete } from './EnTete'
import { LienConcept } from './LienConcept'
import { Logiciel, Logiciels } from './Logiciels'
import { NodeTree } from './NodeTree'
import { NavigationChapitre, PourAllerPlusLoin } from './PourAllerPlusLoin'

/** Marqueur posé par le plugin remark-sections autour de chaque section rédigée. */
function Section({ children }: { id: IdSectionRedigee; children?: ReactNode }) {
  return <>{children}</>
}

/** Composants utilisables dans le MDX des concepts. */
export const COMPOSANTS_MDX = { Section, LienConcept, Logiciels, Logiciel, NodeTree, Encadre }

/**
 * Rend le MDX et range ses sections par identifiant. Le corps compilé ne contient
 * que des éléments <Section> à la racine (garanti par remark-sections) et aucun hook :
 * on peut l'appeler comme une fonction pour récupérer ces éléments.
 */
function extraireSections(Contenu: ContenuMdx | null): Partial<Record<IdSectionRedigee, ReactNode>> {
  if (!Contenu) return {}
  const racine = (Contenu as (p: object) => ReactElement | null)({ components: COMPOSANTS_MDX })
  const enfants = isValidElement(racine) && racine.type === Fragment ? Children.toArray((racine.props as { children?: ReactNode }).children) : [racine]
  const sections: Partial<Record<IdSectionRedigee, ReactNode>> = {}
  for (const e of enfants) {
    if (isValidElement(e) && e.type === Section) {
      const p = e.props as { id: IdSectionRedigee; children?: ReactNode }
      sections[p.id] = p.children
    }
  }
  return sections
}

const titre = (id: IdSection) => SECTIONS_CONCEPT.find((s) => s.id === id)!.titre

/** Sections qu'un concept publié peut omettre (toutes ne s'écrivent pas en formule). */
const OPTIONNELLES: IdSectionRedigee[] = ['formule', 'defi']

/**
 * Gabarit d'une page concept : les 9 sections toujours dans le même ordre,
 * pour que l'on sache où regarder. Une section manquante d'un brouillon reste
 * visible avec la mention « à rédiger » ; un concept publié masque les optionnelles absentes.
 */
export function PageConcept({ donnees, Contenu }: { donnees: DonneesConcept; Contenu: ContenuMdx | null }) {
  const sections = extraireSections(Contenu)
  const brouillon = donnees.concept.statut === 'brouillon'
  const visible = (id: IdSectionRedigee) => sections[id] !== undefined || (brouillon && id !== 'defi') || !OPTIONNELLES.includes(id)

  const redigee = (id: IdSectionRedigee) =>
    visible(id) && (
      <BlocSection key={id} id={id} defi={id === 'defi'} redige>
        {sections[id] ?? <ARediger id={id} />}
      </BlocSection>
    )

  const presentes = SECTIONS_CONCEPT.filter((s) => s.source === 'gabarit' || visible(s.id as IdSectionRedigee))

  return (
    <ContexteConcept.Provider value={donnees}>
      <main
        className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12"
        style={{ ["--domaine" as string]: donnees.domaine.couleur }}
      >
        <article className="min-w-0 max-w-3xl space-y-12">
          <EnTete />
          {redigee('intuition')}
          <BlocSection id="module" titreVisible={false}>
            <EmplacementModule />
          </BlocSection>
          {redigee('formule')}
          {redigee('logiciels')}
          {redigee('recettes')}
          {redigee('pieges')}
          <BlocSection id="plus-loin">
            <PourAllerPlusLoin />
          </BlocSection>
          {redigee('defi')}
          <NavigationChapitre />
        </article>
        <Sommaire ids={presentes.map((s) => s.id).filter((id) => id !== 'en-tete')} />
      </main>
    </ContexteConcept.Provider>
  )
}

function BlocSection({
  id,
  children,
  titreVisible = true,
  defi = false,
  redige = false,
}: {
  id: IdSection
  children: ReactNode
  titreVisible?: boolean
  defi?: boolean
  /** Texte venu du MDX : reçoit la typographie des contenus rédigés. */
  redige?: boolean
}) {
  return (
    <section
      id={id}
      aria-labelledby={`titre-${id}`}
      className={defi ? 'rounded-2xl border border-accent/40 bg-accent/5 p-5 sm:p-6' : undefined}
    >
      <h2 id={`titre-${id}`} className={titreVisible ? 'mb-4 text-xl font-semibold tracking-tight sm:text-2xl' : 'sr-only'}>
        {titre(id)}
      </h2>
      <div className={redige ? 'prose-3datr' : undefined}>{children}</div>
    </section>
  )
}

const CONSIGNES: Record<IdSectionRedigee, string> = {
  intuition: 'Deux ou trois phrases et une analogie visuelle, sans formule.',
  formule: 'La formule, chaque variable dans la couleur de son curseur.',
  logiciels: 'Un onglet par logiciel avec le nom exact du node, un node tree minimal et un extrait de code.',
  recettes: 'Deux ou trois usages concrets en production.',
  pieges: 'Les erreurs fréquentes et comment les reconnaître.',
  defi: 'Un objectif à atteindre dans le module.',
}

function ARediger({ id }: { id: IdSectionRedigee }) {
  const { concept } = useConcept()
  return (
    <div className="rounded-xl border border-dashed border-bord px-4 py-3 text-sm text-doux">
      <p>À rédiger · {CONSIGNES[id]}</p>
      {id === 'logiciels' && concept.nodes.length > 0 && (
        <p className="mt-2">
          Nodes concernés : <span className="text-texte">{concept.nodes.join(', ')}</span>
        </p>
      )}
    </div>
  )
}

function Sommaire({ ids }: { ids: IdSection[] }) {
  return (
    <nav aria-label="Sommaire de la page" className="hidden lg:block">
      <div className="sticky top-20">
        <p className="mb-3 text-xs font-semibold tracking-wider text-doux uppercase">Sur cette page</p>
        <ol className="space-y-1.5 border-l border-bord text-sm">
          {ids.map((id) => (
            <li key={id}>
              <a href={`#${id}`} className="-ml-px block border-l border-transparent pl-3 text-doux hover:border-[var(--domaine,var(--accent))] hover:text-texte">
                {titre(id)}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
