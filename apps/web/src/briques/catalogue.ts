import type { IdBrique } from './types'

/** Les six briques sur lesquelles se construit chaque module interactif. */
export const BRIQUES: { id: IdBrique; titre: string; description: string; pour: string }[] = [
  {
    id: 'scene-vecteurs-3d',
    titre: 'Scène vecteurs 3D',
    description: 'Grille, repère, flèches et points que l’on déplace à la souris ou au doigt, en Z-up (Blender, Unreal) ou Y-up.',
    pour: 'Vecteurs, normales, transformations, espaces de coordonnées',
  },
  {
    id: 'traceur-courbes',
    titre: 'Traceur de courbes 2D',
    description: 'Axes, f(x) recalculée en direct, point qui suit le pointeur et poignées à faire glisser.',
    pour: 'Fonctions, interpolation, easing, bruit en 1D',
  },
  {
    id: 'apercu-shader',
    titre: 'Aperçu de shader',
    description: 'Un fragment shader sur un plan, une sphère, un tore ou un cube, uniforms reliés aux curseurs, erreurs GLSL affichées à la bonne ligne.',
    pour: 'Shaders, textures procédurales, UV',
  },
  {
    id: 'editeur-nodes',
    titre: 'Mini éditeur de nodes',
    description: 'Nodes typés à brancher comme dans Blender, compilés en direct en shader pour l’aperçu.',
    pour: 'Shader Editor, Material Editor, logique des graphes',
  },
  {
    id: 'tableur-attributs',
    titre: 'Tableur d’attributs',
    description: 'Le Spreadsheet de Blender relié à la vue 3D : survoler une ligne allume le point, et inversement.',
    pour: 'Geometry Nodes, attributs, domaines',
  },
  {
    id: 'pas-a-pas',
    titre: 'Exécution pas à pas',
    description: 'Code annoté, lecture, pause et pas suivant, variables visibles à chaque étape.',
    pour: 'Programmation, boucles, algorithmes',
  },
]

export const brique = (id: IdBrique) => BRIQUES.find((b) => b.id === id)!
