import type { ConceptCompile, Niveau, Statut } from '@3datr/core'

/** Ce qu'il faut savoir d'un concept lié pour afficher sa pastille et sa bulle. */
export interface Apercu {
  slug: string
  titre: string
  resume?: string
  niveau: Niveau
  statut: Statut
  domaine: string
  couleur: string
}

export interface DonneesConcept {
  concept: ConceptCompile
  domaine: { slug: string; titre: string; couleur: string }
  chapitre: { slug: string; titre: string } | null
  /** Aperçus de tous les concepts que la page peut citer ou lister, par slug. */
  apercus: Record<string, Apercu>
  /** Parcours qui contiennent ce concept, avec sa position. */
  parcours: { slug: string; titre: string; position: number; total: number }[]
  /** Concepts voisins dans l'ordre du chapitre. */
  precedent: string | null
  suivant: string | null
  /** Page d'exemple du gabarit : pas une vraie fiche. */
  exemple?: boolean
}
