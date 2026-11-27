import { useState } from 'react'
import { EditeurCode } from '../briques/CodeAnnote'
import { defineModule } from '../briques/module'
import { ApercuShader, type Forme } from '../briques/shader/ApercuShader'
import type { ErreurGlsl } from '../briques/shader/glsl'

const RAYURES = `void main() {
  // Une onde sinusoïdale le long de U, qui défile avec le temps
  float onde = sin(vUv.x * uFrequence * 6.2831 + uTemps * uVitesse);
  float masque = smoothstep(-0.15, 0.15, onde);
  vec3 couleur = mix(uCouleurA, uCouleurB, masque);
  gl_FragColor = vec4(couleur, 1.0);
}`

const CERCLES = `void main() {
  // Distance au centre des UV : des anneaux concentriques
  float d = distance(vUv, vec2(0.5));
  float onde = sin(d * uFrequence * 6.2831 - uTemps * uVitesse);
  vec3 couleur = mix(uCouleurA, uCouleurB, step(0.0, onde));
  gl_FragColor = vec4(couleur, 1.0);
}`

const NORMALES = `void main() {
  // vNormal est en Z-up, comme dans Blender : bleu = vers le haut
  vec3 n = normalize(vNormal) * 0.5 + 0.5;
  gl_FragColor = vec4(n, 1.0);
}`

const FORMES = [
  { valeur: 'plan', libelle: 'Plan' },
  { valeur: 'sphere', libelle: 'Sphère' },
  { valeur: 'tore', libelle: 'Tore' },
  { valeur: 'cube', libelle: 'Cube' },
] as const

/** Démo de la brique « Aperçu de shader » : GLSL éditable, uniforms aux curseurs. */
export default defineModule({
  id: 'ShaderPlayground',
  titre: 'Un fragment shader en direct',
  description: 'Modifie le code GLSL ou les curseurs ; une erreur s’affiche à sa ligne.',
  brique: 'apercu-shader',
  disposition: 'dessous',
  hauteurVue: 'h-[34rem] md:h-[24rem]',
  variables: {
    uFrequence: { type: 'nombre', defaut: 6, min: 1, max: 30, pas: 0.5, couleur: 'orange', libelle: 'Fréquence', symbole: 'uFrequence' },
    uVitesse: { type: 'nombre', defaut: 1, min: 0, max: 6, pas: 0.1, couleur: 'vert', libelle: 'Vitesse', symbole: 'uVitesse' },
    uCouleurA: { type: 'couleur', defaut: '#1c3d6e', libelle: 'uCouleurA' },
    uCouleurB: { type: 'couleur', defaut: '#ffd43b', libelle: 'uCouleurB' },
    forme: { type: 'choix', defaut: 'plan', options: FORMES, libelle: 'Forme' },
    code: { type: 'texte', defaut: RAYURES, libelle: 'Code GLSL', dansUrl: false },
  },
  presets: [
    { nom: 'Rayures', valeurs: { code: RAYURES, forme: 'plan' } },
    { nom: 'Anneaux', valeurs: { code: CERCLES, forme: 'plan', uFrequence: 8 } },
    { nom: 'Normales', valeurs: { code: NORMALES, forme: 'sphere' } },
  ],
  Vue: ({ v, set }) => <Vue v={v} set={set} />,
})

function Vue({ v, set }: { v: { uFrequence: number; uVitesse: number; uCouleurA: string; uCouleurB: string; forme: string; code: string }; set: (n: 'code', c: string) => void }) {
  const [erreurs, setErreurs] = useState<ErreurGlsl[]>([])
  return (
    <div className="absolute inset-0 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:grid-rows-1">
      <div className="relative min-h-0 border-bord max-md:border-b md:border-r">
        <ApercuShader
          code={v.code}
          forme={v.forme as Forme}
          anime={v.uVitesse > 0}
          uniforms={{ uFrequence: v.uFrequence, uVitesse: v.uVitesse, uCouleurA: v.uCouleurA, uCouleurB: v.uCouleurB }}
          onErreurs={setErreurs}
        />
      </div>
      <div className="min-h-0 overflow-auto bg-fond/60 py-2">
        <EditeurCode code={v.code} onChange={(c) => set('code', c)} langage="glsl" marquees={erreurs.flatMap((e) => (e.ligne ? [e.ligne] : []))} />
      </div>
    </div>
  )
}
