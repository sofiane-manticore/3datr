import { useCallback } from 'react'
import { defineModule } from '../briques/module'
import { normaliser, type Graphe } from '../briques/nodes/bibliotheque'
import { EditeurNodes } from '../briques/nodes/EditeurNodes'
import type { Forme } from '../briques/shader/ApercuShader'

const NEIGE: Graphe = normaliser({
  noeuds: [
    { id: 'coord', type: 'coord-texture', x: 0, y: 40 },
    { id: 'dot', type: 'vector-math', x: 220, y: 0, params: { operation: 'dot' }, valeurs: { B: [0, 0, 1] } },
    { id: 'map', type: 'map-range', x: 440, y: 0, params: { interpolation: 'lisse' }, valeurs: { 'De min': 0.45, 'De max': 0.65 } },
    { id: 'mix', type: 'mix', x: 660, y: 40, valeurs: { A: [0.36, 0.31, 0.27], B: [0.95, 0.97, 1] } },
    { id: 'sortie', type: 'sortie', x: 880, y: 80 },
  ],
  liens: [
    { de: 'coord', sortie: 'Normale', vers: 'dot', entree: 'A' },
    { de: 'dot', sortie: 'Valeur', vers: 'map', entree: 'Valeur' },
    { de: 'map', sortie: 'Résultat', vers: 'mix', entree: 'Facteur' },
    { de: 'mix', sortie: 'Résultat', vers: 'sortie', entree: 'Couleur' },
  ],
})

const DEGRADE: Graphe = normaliser({
  noeuds: [
    { id: 'coord', type: 'coord-texture', x: 0, y: 40 },
    { id: 'sep', type: 'separer', x: 220, y: 20 },
    { id: 'mix', type: 'mix', x: 440, y: 20, valeurs: { A: [0.11, 0.49, 0.84], B: [1, 0.83, 0.23] } },
    { id: 'sortie', type: 'sortie', x: 660, y: 60 },
  ],
  liens: [
    { de: 'coord', sortie: 'UV', vers: 'sep', entree: 'Vecteur' },
    { de: 'sep', sortie: 'X', vers: 'mix', entree: 'Facteur' },
    { de: 'mix', sortie: 'Résultat', vers: 'sortie', entree: 'Couleur' },
  ],
})

const DAMIER: Graphe = normaliser({
  noeuds: [
    { id: 'temps', type: 'temps', x: 0, y: 0 },
    { id: 'math', type: 'math', x: 200, y: 0, params: { operation: 'sine' } },
    { id: 'map', type: 'map-range', x: 400, y: 0, valeurs: { 'De min': -1, 'De max': 1, 'Vers min': 4, 'Vers max': 10 } },
    { id: 'damier', type: 'damier', x: 620, y: 20 },
    { id: 'sortie', type: 'sortie', x: 840, y: 60 },
  ],
  liens: [
    { de: 'temps', sortie: 'Secondes', vers: 'math', entree: 'A' },
    { de: 'math', sortie: 'Valeur', vers: 'map', entree: 'Valeur' },
    { de: 'map', sortie: 'Résultat', vers: 'damier', entree: 'Échelle' },
    { de: 'damier', sortie: 'Couleur', vers: 'sortie', entree: 'Couleur' },
  ],
})

const FORMES = [
  { valeur: 'sphere', libelle: 'Sphère' },
  { valeur: 'tore', libelle: 'Tore' },
  { valeur: 'cube', libelle: 'Cube' },
  { valeur: 'plan', libelle: 'Plan' },
] as const

/** Démo de la brique « Mini éditeur de nodes » : un matériau construit en nodes. */
export default defineModule({
  id: 'NodeEditorPlayground',
  titre: 'Un matériau en nodes',
  description: 'Branche, débranche et règle les nodes ; l’aperçu se recompile à chaque changement.',
  brique: 'editeur-nodes',
  disposition: 'dessous',
  hauteurVue: 'h-[36rem] md:h-[26rem]',
  variables: {
    graphe: { type: 'libre', defaut: NEIGE, libelle: 'Graphe' },
    forme: { type: 'choix', defaut: 'sphere', options: FORMES, libelle: 'Objet de l’aperçu' },
  },
  presets: [
    { nom: 'Neige sur le dessus', valeurs: { graphe: NEIGE } },
    { nom: 'Dégradé UV', valeurs: { graphe: DEGRADE, forme: 'plan' } },
    { nom: 'Damier animé', valeurs: { graphe: DAMIER, forme: 'cube' } },
  ],
  Vue: ({ v, set }) => {
    const onChange = useCallback((g: Graphe) => set('graphe', g), [set])
    return <EditeurNodes graphe={v.graphe} onChange={onChange} forme={v.forme as Forme} />
  },
  Lecture: () => (
    <p className="text-xs text-doux">
      Glisse d’une sortie vers une entrée pour brancher, tire un lien hors de son entrée pour le couper, sélectionne un node et appuie sur Suppr pour l’enlever. Les couleurs des
      sockets sont celles de Blender : gris pour un float, violet pour un vecteur, jaune pour une couleur.
    </p>
  ),
})
