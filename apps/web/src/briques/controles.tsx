import { useId, useState, type ReactNode } from 'react'
import { cssVariable } from './couleurs'
import { arrondi, type Vec3 } from './math'
import type { CouleurVariable, DefVariable } from './types'

/**
 * Contrôles des modules. Un curseur prend la couleur de sa variable :
 * le même rouge que `\col{rouge}{a}` dans la formule.
 */

const decimales = (pas: number) => Math.max(0, Math.min(4, Math.ceil(-Math.log10(pas))))

export function Curseur({
  libelle,
  symbole,
  valeur,
  onChange,
  min,
  max,
  pas = 0.01,
  couleur,
  unite,
}: {
  libelle: string
  symbole?: string
  valeur: number
  onChange: (v: number) => void
  min: number
  max: number
  pas?: number
  couleur?: CouleurVariable | string
  unite?: string
}) {
  const id = useId()
  const p = max === min ? 0 : ((valeur - min) / (max - min)) * 100
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-x-3 gap-y-1">
      <label htmlFor={id} className="flex min-w-0 items-baseline gap-1.5 text-sm">
        {symbole && (
          <span className="font-mono font-semibold" style={{ color: cssVariable(couleur) }}>
            {symbole}
          </span>
        )}
        <span className="truncate text-doux">{libelle}</span>
      </label>
      <ChampNombre valeur={valeur} onChange={onChange} min={min} max={max} pas={pas} unite={unite} libelle={libelle} />
      <input
        id={id}
        type="range"
        className="curseur col-span-2"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--c' as string]: cssVariable(couleur), ['--p' as string]: `${p}%` }}
      />
    </div>
  )
}

/** Champ numérique qui laisse taper librement et ne valide qu'à la sortie ou sur Entrée. */
function ChampNombre({
  valeur,
  onChange,
  min,
  max,
  pas,
  unite,
  libelle,
}: {
  valeur: number
  onChange: (v: number) => void
  min?: number
  max?: number
  pas: number
  unite?: string
  libelle: string
}) {
  const [saisie, setSaisie] = useState<string | null>(null)
  const affiche = saisie ?? String(arrondi(valeur, decimales(pas)))
  const valider = () => {
    if (saisie === null) return
    const x = Number(saisie.replace(',', '.').replace('−', '-'))
    if (saisie.trim() !== '' && Number.isFinite(x)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, x)))
    setSaisie(null)
  }
  return (
    <div className="flex items-center justify-end rounded-md border border-bord bg-fond px-1.5 focus-within:border-accent">
      <input
        aria-label={`${libelle}, valeur`}
        inputMode="decimal"
        className="w-full min-w-0 bg-transparent py-0.5 text-right font-mono text-xs tabular-nums outline-none"
        value={affiche}
        onChange={(e) => setSaisie(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => e.key === 'Enter' && valider()}
      />
      {unite && <span className="pl-0.5 text-xs text-doux">{unite}</span>}
    </div>
  )
}

export function CurseurVec3({
  libelle,
  symbole,
  valeur,
  onChange,
  min = -2,
  max = 2,
  pas = 0.05,
  couleur,
}: {
  libelle: string
  symbole?: string
  valeur: Vec3
  onChange: (v: Vec3) => void
  min?: number
  max?: number
  pas?: number
  couleur?: CouleurVariable | string
}) {
  const axe = (i: number, x: number) => {
    const v = [...valeur] as Vec3
    v[i] = x
    onChange(v)
  }
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 flex items-baseline gap-1.5 text-sm">
        {symbole && (
          <span className="font-mono font-semibold" style={{ color: cssVariable(couleur) }}>
            {symbole}
          </span>
        )}
        <span className="text-doux">{libelle}</span>
      </legend>
      {(['x', 'y', 'z'] as const).map((n, i) => (
        <div key={n} className="grid grid-cols-[1rem_minmax(0,1fr)_3.75rem] items-center gap-2">
          <span className="font-mono text-xs text-doux">{n}</span>
          <input
            type="range"
            aria-label={`${libelle}, composante ${n}`}
            className="curseur"
            min={min}
            max={max}
            step={pas}
            value={valeur[i]}
            onChange={(e) => axe(i, Number(e.target.value))}
            style={{ ['--c' as string]: cssVariable(couleur), ['--p' as string]: `${((valeur[i] - min) / (max - min)) * 100}%` }}
          />
          <ChampNombre valeur={valeur[i]} onChange={(x) => axe(i, x)} min={min} max={max} pas={pas} libelle={`${libelle} ${n}`} />
        </div>
      ))}
    </fieldset>
  )
}

export function Interrupteur({ libelle, valeur, onChange }: { libelle: string; valeur: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="text-doux">{libelle}</span>
      <button
        type="button"
        role="switch"
        aria-checked={valeur}
        onClick={() => onChange(!valeur)}
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${valeur ? 'border-accent bg-accent' : 'border-bord bg-surface-2'}`}
      >
        <span className={`absolute top-0.5 size-3.5 rounded-full bg-fond transition-[left] ${valeur ? 'left-[1.15rem]' : 'left-0.5'}`} />
      </button>
    </label>
  )
}

export function Choix<T extends string>({
  libelle,
  valeur,
  options,
  onChange,
}: {
  libelle: string
  valeur: T
  options: readonly { valeur: T; libelle: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm text-doux">{libelle}</div>
      <div role="radiogroup" aria-label={libelle} className="flex flex-wrap gap-1 rounded-lg border border-bord bg-fond p-0.5">
        {options.map((o) => (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={o.valeur === valeur}
            onClick={() => onChange(o.valeur)}
            className={`min-w-0 flex-1 rounded-md px-2 py-1 text-xs whitespace-nowrap ${o.valeur === valeur ? 'bg-surface-2 text-texte' : 'text-doux hover:text-texte'}`}
          >
            {o.libelle}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SelecteurCouleur({ libelle, valeur, onChange }: { libelle: string; valeur: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-doux">{libelle}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-doux">{valeur}</span>
        <input type="color" value={valeur} onChange={(e) => onChange(e.target.value)} className="h-6 w-9 cursor-pointer rounded border border-bord bg-transparent" />
      </span>
    </label>
  )
}

/** Le bon contrôle pour une variable déclarée. */
export function ControleAuto({ def, valeur, onChange }: { def: DefVariable; valeur: unknown; onChange: (v: unknown) => void }): ReactNode {
  switch (def.type) {
    case 'nombre':
      return <Curseur {...def} valeur={valeur as number} onChange={onChange} />
    case 'vec3':
      return <CurseurVec3 {...def} valeur={valeur as Vec3} onChange={onChange} />
    case 'booleen':
      return <Interrupteur libelle={def.libelle} valeur={valeur as boolean} onChange={onChange} />
    case 'couleur':
      return <SelecteurCouleur libelle={def.libelle} valeur={valeur as string} onChange={onChange} />
    case 'choix':
      return <Choix libelle={def.libelle} valeur={valeur as string} options={def.options} onChange={onChange} />
    default:
      return null
  }
}
