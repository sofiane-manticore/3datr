import { defineModule } from '../briques/module'
import { FormuleLive } from '../briques/FormuleLive'
import { Jauge } from '../briques/Jauge'
import { angle, dot, formater, length, normalize, scale, type Vec3 } from '../briques/math'
import { Arc, Fleche, PointDeplacable, Scene3D, Trait } from '../briques/scene/Scene3D'

/** Démo de la brique « Scène vecteurs 3D » : produit scalaire de deux flèches. */
export default defineModule({
  id: 'DotProductPlayground',
  titre: 'Produit scalaire de deux directions',
  description: 'Attrape le bout des flèches pour les orienter ; la jauge donne a · b.',
  brique: 'scene-vecteurs-3d',
  variables: {
    a: { type: 'vec3', defaut: [1, 0, 0], couleur: 'rouge', libelle: 'Vecteur a', symbole: 'a', min: -2, max: 2 },
    b: { type: 'vec3', defaut: [0.7, 0.7, 0], couleur: 'bleu', libelle: 'Vecteur b', symbole: 'b', min: -2, max: 2 },
    projection: { type: 'booleen', defaut: true, libelle: 'Montrer la projection de b sur a' },
  },
  presets: [
    { nom: 'Même sens', valeurs: { a: [1, 0, 0], b: [1.5, 0, 0] } },
    { nom: 'Perpendiculaires', valeurs: { a: [1, 0, 0], b: [0, 1, 0] } },
    { nom: 'Opposés', valeurs: { a: [1, 0, 0], b: [-1, 0, 0] } },
    { nom: 'Vers le haut', valeurs: { a: [0, 0, 1], b: [0.6, 0, 0.8] } },
  ],
  defi: {
    texte: 'oriente les deux flèches pour obtenir un produit scalaire nul.',
    reussi: ({ a, b }) => length(a) > 0.3 && length(b) > 0.3 && Math.abs(dot(a, b)) < 0.02,
  },
  Vue: ({ v, set }) => {
    const d = dot(v.a, v.b)
    const la = length(v.a)
    const proj: Vec3 = la > 1e-6 ? scale(normalize(v.a), d / la) : [0, 0, 0]
    return (
      <Scene3D taille={2}>
        <Fleche vers={v.a} couleur="rouge" etiquette="a" />
        <Fleche vers={v.b} couleur="bleu" etiquette="b" />
        <PointDeplacable position={v.a} onChange={(p) => set('a', p)} couleur="rouge" />
        <PointDeplacable position={v.b} onChange={(p) => set('b', p)} couleur="bleu" />
        <Arc a={v.a} b={v.b} couleur="vert" etiquette={`θ = ${formater((angle(v.a, v.b) * 180) / Math.PI, 0)}°`} />
        {v.projection && la > 1e-6 && (
          <>
            <Trait points={[v.b, proj]} pointille couleur="bleu" opacite={0.7} />
            <Trait points={[[0, 0, 0], proj]} couleur="vert" epaisseur={5} />
          </>
        )}
      </Scene3D>
    )
  },
  Lecture: ({ v }) => {
    const d = dot(v.a, v.b)
    const c = length(v.a) * length(v.b) > 1e-9 ? d / (length(v.a) * length(v.b)) : 0
    return (
      <div className="space-y-3 border-t border-bord pt-3">
        <div className="overflow-x-auto text-[0.95rem]">
          <FormuleLive tex={`\\col{rouge}{\\vec a}\\cdot\\col{bleu}{\\vec b} = ${formater(d)}`} />
        </div>
        <Jauge valeur={c} libelle="cos θ (directions seules)" couleur="vert" />
        <p className="text-xs text-doux">1 : même sens · 0 : à angle droit · −1 : opposés.</p>
      </div>
    )
  },
})
