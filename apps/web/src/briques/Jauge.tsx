import { cssVariable } from './couleurs'
import { formater } from './math'
import type { CouleurVariable } from './types'

/** Jauge horizontale avec repères, pour lire une valeur bornée (−1…1, 0…1). */
export function Jauge({
  valeur,
  min = -1,
  max = 1,
  couleur,
  libelle,
  reperes = [min, (min + max) / 2, max],
}: {
  valeur: number
  min?: number
  max?: number
  couleur?: CouleurVariable | string
  libelle?: string
  reperes?: number[]
}) {
  const p = (x: number) => ((Math.min(max, Math.max(min, x)) - min) / (max - min)) * 100
  const zero = p(Math.max(min, Math.min(max, 0)))
  return (
    <div className="space-y-1" role="meter" aria-valuemin={min} aria-valuemax={max} aria-valuenow={valeur} aria-label={libelle}>
      {libelle && (
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-doux">{libelle}</span>
          <span className="font-mono tabular-nums" style={{ color: cssVariable(couleur) }}>
            {formater(valeur)}
          </span>
        </div>
      )}
      <div className="relative h-2 rounded-full bg-surface-2">
        <div
          className="absolute inset-y-0 rounded-full"
          style={{ left: `${Math.min(zero, p(valeur))}%`, width: `${Math.abs(p(valeur) - zero)}%`, background: cssVariable(couleur) }}
        />
        {reperes.map((r) => (
          <div key={r} className="absolute inset-y-[-2px] w-px bg-doux/50" style={{ left: `${p(r)}%` }} />
        ))}
      </div>
      <div className="relative h-3 font-mono text-[10px] text-doux">
        {reperes.map((r) => (
          <span key={r} className="absolute -translate-x-1/2" style={{ left: `${p(r)}%` }}>
            {formater(r, r % 1 ? 1 : 0)}
          </span>
        ))}
      </div>
    </div>
  )
}
