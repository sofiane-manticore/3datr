import { Link } from 'react-router'
import { useContext } from 'react'
import { ContexteConcept } from './contexte'
import { Anneaux, PastilleDomaine } from './Pastilles'

/**
 * Lien vers un autre concept, écrit [[slug]] ou [[slug|texte]] dans le MDX.
 * Pastille du domaine, niveau, et une bulle avec le résumé au survol ou au focus.
 */
export function LienConcept({ slug, texte }: { slug: string; texte?: string }) {
  const apercu = useContext(ContexteConcept)?.apercus[slug]
  if (!apercu) return <Link to={`/concepts/${slug}`}>{texte ?? slug}</Link>
  return (
    <span className="group relative inline">
      <Link
        to={`/concepts/${slug}`}
        className="lien-concept inline-flex items-baseline gap-1 rounded px-0.5 font-medium underline decoration-1 underline-offset-[3px] hover:bg-surface-2"
        style={{ textDecorationColor: apercu.couleur }}
        prefetch="intent"
      >
        <PastilleDomaine couleur={apercu.couleur} className="relative -top-px size-2 self-center" />
        {texte ?? apercu.titre}
      </Link>
      <Bulle titre={apercu.titre} resume={apercu.resume} niveau={apercu.niveau} brouillon={apercu.statut === 'brouillon'} />
    </span>
  )
}

/** Bulle de résumé, seulement sur les appareils avec survol (sur mobile elle déborderait de l’écran). */
export function Bulle({
  titre,
  resume,
  niveau,
  brouillon,
}: {
  titre: string
  resume?: string
  niveau: Parameters<typeof Anneaux>[0]['niveau']
  brouillon?: boolean
}) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none invisible absolute bottom-full left-0 z-20 hidden [@media(hover:hover)]:block mb-2 w-64 max-w-[80vw] rounded-lg border border-bord bg-surface p-3 text-sm font-normal leading-snug text-texte opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
    >
      <span className="flex items-center justify-between gap-2 font-semibold">
        {titre}
        <Anneaux niveau={niveau} className="text-doux" />
      </span>
      <span className="mt-1 block text-doux">{resume ?? (brouillon ? 'Fiche en cours de rédaction.' : '')}</span>
    </span>
  )
}
