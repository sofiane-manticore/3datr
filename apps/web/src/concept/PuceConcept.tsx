import { Link } from 'react-router'
import type { Apercu } from '../lib/types'
import { Bulle } from './LienConcept'
import { Anneaux, PastilleDomaine } from './Pastilles'

/** Puce cliquable d'un concept : prérequis, suites, alternatives… */
export function PuceConcept({ apercu, vu }: { apercu: Apercu; vu?: boolean }) {
  return (
    <span className="group relative inline-flex">
      <Link
        to={`/concepts/${apercu.slug}`}
        prefetch="intent"
        className="inline-flex items-center gap-2 rounded-full border border-bord bg-surface py-1 pl-2.5 pr-3 text-sm transition hover:border-current hover:bg-surface-2"
        style={{ color: 'var(--texte)' }}
      >
        <PastilleDomaine couleur={apercu.couleur} />
        <span>{apercu.titre}</span>
        <Anneaux niveau={apercu.niveau} className="text-doux" />
        {vu && (
          <svg viewBox="0 0 16 16" className="size-3.5 text-[var(--v-vert)]" aria-label="déjà vu">
            <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </Link>
      <Bulle titre={apercu.titre} resume={apercu.resume} niveau={apercu.niveau} brouillon={apercu.statut === 'brouillon'} />
    </span>
  )
}
