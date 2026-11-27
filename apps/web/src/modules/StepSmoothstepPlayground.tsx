import { defineModule } from '../briques/module'
import { FormuleLive } from '../briques/FormuleLive'
import { formater, smoothstep, step } from '../briques/math'
import { TraceurCourbes } from '../briques/traceur/TraceurCourbes'

const MODES = [
  { valeur: 'smoothstep', libelle: 'Smoothstep' },
  { valeur: 'step', libelle: 'Step' },
  { valeur: 'lineaire', libelle: 'Linéaire' },
] as const

const fonction = (mode: string, e0: number, e1: number) => (x: number) =>
  mode === 'step' ? step((e0 + e1) / 2, x) : mode === 'lineaire' ? Math.min(1, Math.max(0, e1 === e0 ? (x < e0 ? 0 : 1) : (x - e0) / (e1 - e0))) : smoothstep(e0, e1, x)

/** Démo de la brique « Traceur de courbes 2D » : seuil net ou transition douce. */
export default defineModule({
  id: 'StepSmoothstepPlayground',
  titre: 'Step et smoothstep',
  description: 'Fais glisser les deux bornes sur le graphique ou avec les curseurs.',
  brique: 'traceur-courbes',
  variables: {
    e0: { type: 'nombre', defaut: 0.3, min: -0.2, max: 1.2, pas: 0.01, couleur: 'orange', libelle: 'Début', symbole: 'e₀' },
    e1: { type: 'nombre', defaut: 0.7, min: -0.2, max: 1.2, pas: 0.01, couleur: 'violet', libelle: 'Fin', symbole: 'e₁' },
    mode: { type: 'choix', defaut: 'smoothstep', options: MODES, libelle: 'Fonction' },
  },
  presets: [
    { nom: 'Doux', valeurs: { e0: 0.1, e1: 0.9, mode: 'smoothstep' } },
    { nom: 'Net', valeurs: { e0: 0.48, e1: 0.52, mode: 'smoothstep' } },
    { nom: 'Inversé', valeurs: { e0: 0.8, e1: 0.2, mode: 'smoothstep' } },
  ],
  defi: {
    texte: 'avec smoothstep, fais tenir toute la transition entre 0,4 et 0,6.',
    reussi: ({ e0, e1, mode }) => mode === 'smoothstep' && e0 >= 0.4 && e1 <= 0.6 && e1 > e0,
  },
  Vue: ({ v, set }) => (
    <TraceurCourbes
      x={[-0.2, 1.2]}
      y={[-0.15, 1.15]}
      libelleY="masque"
      courbes={[
        { f: fonction(v.mode, v.e0, v.e1), couleur: 'bleu', libelle: MODES.find((m) => m.valeur === v.mode)!.libelle },
        ...(v.mode !== 'step' ? [{ f: fonction('step', v.e0, v.e1), couleur: 'var(--doux)', pointille: true, epaisseur: 1.25 }] : []),
      ]}
      poignees={[
        { x: v.e0, onChange: (x) => set('e0', x), couleur: 'orange', libelle: 'e₀', min: -0.2, max: 1.2 },
        { x: v.e1, onChange: (x) => set('e1', x), couleur: 'violet', libelle: 'e₁', min: -0.2, max: 1.2 },
      ]}
    />
  ),
  Lecture: ({ v }) => {
    const f = fonction(v.mode, v.e0, v.e1)
    const stops = Array.from({ length: 33 }, (_, i) => {
      const x = -0.2 + (1.4 * i) / 32
      const g = Math.round(f(x) * 100)
      return `color-mix(in srgb, var(--texte) ${g}%, var(--fond)) ${((i / 32) * 100).toFixed(1)}%`
    })
    return (
      <div className="space-y-3 border-t border-bord pt-3">
        <div className="overflow-x-auto text-[0.95rem]">
          <FormuleLive
            tex={
              v.mode === 'step'
                ? `\\operatorname{step}(${formater((v.e0 + v.e1) / 2)}, x)`
                : `\\operatorname{${v.mode === 'lineaire' ? 'linéaire' : 'smoothstep'}}(\\col{orange}{${formater(v.e0)}}, \\col{violet}{${formater(v.e1)}}, x)`
            }
          />
        </div>
        <div>
          <div className="mb-1 text-xs text-doux">Masque obtenu sur x de −0,2 à 1,2</div>
          <div className="h-5 rounded border border-bord" style={{ background: `linear-gradient(90deg, ${stops.join(', ')})` }} />
        </div>
      </div>
    )
  },
})
