import { useEffect } from 'react'
import { LIBELLES_NIVEAUX, ONGLETS_LOGICIELS } from '@3datr/core/sections'
import { marquerVu, useVus } from '../lib/progression'
import { useConcept } from './contexte'
import { Anneaux, PastilleDomaine } from './Pastilles'
import { PuceConcept } from './PuceConcept'

const LIBELLES_NATURE = { fondamental: 'Fondamental', technique: 'Technique', recette: 'Recette' } as const

/** Section 1 : titre, résumé, niveau, logiciels, temps, puces de prérequis et bloc « En détail ». */
export function EnTete() {
  const { concept, domaine, chapitre, apercus, exemple } = useConcept()
  const vus = useVus()
  useEffect(() => {
    if (!exemple) marquerVu(concept.slug)
  }, [concept.slug, exemple])

  const prerequis = concept.prerequis.map((s) => apercus[s]).filter(Boolean)
  const manquants = vus ? prerequis.filter((p) => !vus.has(p.slug)) : []
  const avertir = concept.niveau === 'difficile' && vus !== null && manquants.length > 0

  return (
    <header id="en-tete" className="space-y-5">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-doux">
        <span className="inline-flex items-center gap-2">
          <PastilleDomaine couleur={domaine.couleur} />
          {domaine.titre}
        </span>
        {chapitre && (
          <>
            <span aria-hidden="true">›</span>
            <span>{chapitre.titre}</span>
          </>
        )}
      </nav>

      <div>
        {concept.statut === 'brouillon' && (
          <p className="mb-3 inline-block rounded-full border border-attention/50 px-2.5 py-0.5 text-xs text-attention">
            {exemple ? 'Exemple du gabarit' : 'Fiche en cours de rédaction'}
          </p>
        )}
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">{concept.titre}</h1>
        {concept.resume && <p className="mt-3 text-lg text-doux text-pretty">{concept.resume}</p>}
      </div>

      <ul className="flex flex-wrap items-center gap-2 text-sm" aria-label="Caractéristiques">
        <li className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1">
          <Anneaux niveau={concept.niveau} />
          {LIBELLES_NIVEAUX[concept.niveau]}
        </li>
        {ONGLETS_LOGICIELS.filter((o) => concept.logiciels.includes(o.id)).map((o) => (
          <li key={o.id} className="rounded-full border border-bord px-3 py-1 text-doux" title={o.long}>
            {o.court}
          </li>
        ))}
        {concept.nature && <li className="rounded-full border border-bord px-3 py-1 text-doux">{LIBELLES_NATURE[concept.nature]}</li>}
        {concept.temps && (
          <li className="inline-flex items-center gap-1.5 px-1 text-doux">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {concept.temps} min
          </li>
        )}
      </ul>

      {prerequis.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-doux uppercase">À connaître avant</p>
          <ul className="flex flex-wrap gap-2">
            {prerequis.map((p) => (
              <li key={p.slug}>
                <PuceConcept apercu={p} vu={vus?.has(p.slug)} />
              </li>
            ))}
          </ul>
          {avertir && (
            <p className="mt-3 rounded-lg border border-attention/40 bg-attention/10 px-3 py-2 text-sm">
              Ce concept s'appuie sur {manquants.map((m) => m.titre).join(', ')}, que tu n'as pas encore ouvert
              {manquants.length > 1 ? 's' : ''}. Tu peux continuer, ou y jeter un œil d'abord.
            </p>
          )}
        </div>
      )}

      <EnDetail />
    </header>
  )
}

function EnDetail() {
  const { concept } = useConcept()
  const listes: [string, string[]][] = [
    ['Noms des nodes', concept.nodes],
    ['Aussi appelé', concept.synonymes],
    ['Effets obtenus', concept.effets],
  ]
  const vide = !concept.description && !concept.questions.length && listes.every(([, l]) => !l.length)
  if (vide) return null
  return (
    <details className="group rounded-xl border border-bord bg-surface/60">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        En détail
        <svg viewBox="0 0 16 16" className="size-4 text-doux transition group-open:rotate-180" aria-hidden="true">
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="space-y-4 border-t border-bord px-4 py-4 text-[0.95rem]">
        {concept.description && <p className="text-pretty">{concept.description}</p>}
        {concept.questions.length > 0 && (
          <div>
            <p className="text-xs font-semibold tracking-wider text-doux uppercase">On le cherche souvent comme ça</p>
            <ul className="mt-2 space-y-1">
              {concept.questions.map((q) => (
                <li key={q} className="text-doux">
                  « {q} »
                </li>
              ))}
            </ul>
          </div>
        )}
        {listes
          .filter(([, l]) => l.length)
          .map(([titre, l]) => (
            <div key={titre}>
              <p className="text-xs font-semibold tracking-wider text-doux uppercase">{titre}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {l.map((x) => (
                  <li key={x} className="rounded-md bg-surface-2 px-2 py-0.5 text-sm">
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </details>
  )
}

