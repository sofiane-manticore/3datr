import { LIBELLES_NIVEAUX, RANG_NIVEAU } from '@3datr/core/sections'
import type { Niveau } from '@3datr/core'

/** Anneaux de niveau, comme sur la carte : 1 facile, 2 moyen, 3 difficile. */
export function Anneaux({ niveau, className = '' }: { niveau: Niveau; className?: string }) {
  const n = RANG_NIVEAU[niveau]
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} title={`Niveau ${LIBELLES_NIVEAUX[niveau].toLowerCase()}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`size-1.5 rounded-full border ${i <= n ? 'border-current bg-current' : 'border-current opacity-35'}`}
        />
      ))}
      <span className="sr-only">Niveau {LIBELLES_NIVEAUX[niveau].toLowerCase()}</span>
    </span>
  )
}

/** Pastille de la couleur du domaine. */
export function PastilleDomaine({ couleur, className = '' }: { couleur: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full ${className}`} style={{ background: couleur }} />
}
