import type { Chapitre, Domaine, EnTeteConcept, Niveau, Parcours, Statut, TypeLien } from './schema.js'

/** Version du format de catalog.json et graph.json. À incrémenter si la forme change. */
export const VERSION_FORMAT = 1

export interface Lien {
  from: string
  to: string
  type: TypeLien
}

export interface ConceptCompile extends EnTeteConcept {
  /** Chemin du fichier source, relatif à content/. */
  fichier: string
  /** Empreinte de l'en-tête et du corps, pour savoir si un concept a changé. */
  hash: string
  /** Concepts cités dans le texte avec [[slug]]. */
  cites: string[]
  /** Concepts qui citent celui-ci (rétroliens, section « Cité par »). */
  citePar: string[]
  /** Concepts qui ont celui-ci en prérequis (suites déduites). */
  requisPar: string[]
  /** Alternatives dans les deux sens. */
  alternativesTous: string[]
}

export interface DomaineCompile extends Domaine {
  ordre: number
  chapitres: (Chapitre & { concepts: string[] })[]
}

export interface Catalogue {
  version: typeof VERSION_FORMAT
  hash: string
  domaines: DomaineCompile[]
  parcours: Parcours[]
  concepts: ConceptCompile[]
}

export interface NoeudGraphe {
  slug: string
  titre: string
  domaine: string
  chapitre: string
  niveau: Niveau
  statut: Statut
  /** Nombre de concepts qui en dépendent directement (taille du nœud). */
  poids: number
  x: number
  y: number
}

export interface Graphe {
  version: typeof VERSION_FORMAT
  hash: string
  domaines: { slug: string; titre: string; couleur: string; x: number; y: number }[]
  noeuds: NoeudGraphe[]
  liens: Lien[]
}
