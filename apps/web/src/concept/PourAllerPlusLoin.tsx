import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useVus } from '../lib/progression'
import { useConcept } from './contexte'
import { PuceConcept } from './PuceConcept'

/**
 * Section 8, générée : suites (déclarées et déduites des prérequis des autres),
 * alternatives dans un encadré « Voir aussi », rétroliens « Cité par » et parcours.
 * La carte locale du voisinage viendra avec la carte en constellation (étape 7).
 */
export function PourAllerPlusLoin() {
  const { concept, apercus, parcours } = useConcept()
  const vus = useVus()
  const puces = (slugs: string[]) =>
    slugs
      .map((s) => apercus[s])
      .filter(Boolean)
      .map((a) => (
        <li key={a.slug}>
          <PuceConcept apercu={a} vu={vus?.has(a.slug)} />
        </li>
      ))

  const suites = [...new Set([...concept.suites, ...concept.requisPar])]
  const rien = !suites.length && !concept.alternativesTous.length && !concept.citePar.length && !parcours.length

  return (
    <div className="space-y-6">
      {rien && <p className="text-doux">Pas encore de lien vers d'autres concepts.</p>}
      {suites.length > 0 && (
        <Bloc titre="Et ensuite">
          <ul className="flex flex-wrap gap-2">{puces(suites)}</ul>
        </Bloc>
      )}
      {concept.alternativesTous.length > 0 && (
        <aside className="rounded-xl border-2 border-double border-bord p-4">
          <p className="text-sm font-semibold">Voir aussi</p>
          <p className="mt-1 text-sm text-doux">Une autre façon d'obtenir le même résultat.</p>
          <ul className="mt-3 flex flex-wrap gap-2">{puces(concept.alternativesTous)}</ul>
        </aside>
      )}
      {concept.citePar.length > 0 && (
        <Bloc titre="Cité par">
          <ul className="flex flex-wrap gap-2">{puces(concept.citePar)}</ul>
        </Bloc>
      )}
      {parcours.length > 0 && (
        <Bloc titre="Dans les parcours">
          <ul className="space-y-1.5">
            {parcours.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{p.titre}</span>
                <span className="text-sm text-doux">
                  étape {p.position} sur {p.total}
                </span>
              </li>
            ))}
          </ul>
        </Bloc>
      )}
    </div>
  )
}

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-doux uppercase">{titre}</h3>
      {children}
    </div>
  )
}

/** Concept précédent et suivant dans le chapitre. */
export function NavigationChapitre() {
  const { precedent, suivant, apercus, chapitre } = useConcept()
  const p = precedent ? apercus[precedent] : null
  const s = suivant ? apercus[suivant] : null
  if (!p && !s) return null
  return (
    <nav aria-label={`Chapitre ${chapitre?.titre ?? ''}`} className="grid gap-3 sm:grid-cols-2">
      {p ? (
        <Link to={`/concepts/${p.slug}`} prefetch="intent" className="rounded-xl border border-bord p-4 hover:bg-surface">
          <span className="text-xs text-doux">← Précédent</span>
          <span className="mt-1 block font-medium">{p.titre}</span>
        </Link>
      ) : (
        <span />
      )}
      {s && (
        <Link to={`/concepts/${s.slug}`} prefetch="intent" className="rounded-xl border border-bord p-4 text-right hover:bg-surface">
          <span className="text-xs text-doux">Suivant →</span>
          <span className="mt-1 block font-medium">{s.titre}</span>
        </Link>
      )}
    </nav>
  )
}
