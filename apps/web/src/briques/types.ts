import type { ComponentType, ReactNode } from 'react'
import type { CouleurVariable } from '../mdx/katex'
import type { Vec3 } from './math'

export type { CouleurVariable }

interface Base {
  libelle: string
  /** Écrite dans l'URL (par défaut oui, sauf pour `libre`). */
  dansUrl?: boolean
  /** Ne pas afficher de contrôle automatique : la vue la pilote elle-même (point déplaçable…). */
  cache?: boolean
}

/** Variables d'un module : la page, la formule, les préréglages et l'URL lisent les mêmes. */
export type DefVariable =
  | (Base & { type: 'nombre'; defaut: number; min: number; max: number; pas?: number; couleur?: CouleurVariable; symbole?: string; unite?: string })
  | (Base & { type: 'vec3'; defaut: Vec3; min?: number; max?: number; pas?: number; couleur?: CouleurVariable; symbole?: string })
  | (Base & { type: 'booleen'; defaut: boolean })
  | (Base & { type: 'couleur'; defaut: string })
  | (Base & { type: 'choix'; defaut: string; options: readonly { valeur: string; libelle: string }[] })
  | (Base & { type: 'texte'; defaut: string })
  /** Valeur structurée (graphe de nodes…) : pas de contrôle automatique. */
  | (Base & { type: 'libre'; defaut: unknown })

export type DefVariables = Record<string, DefVariable>

type ValeurDe<D> = D extends { type: 'nombre' }
  ? number
  : D extends { type: 'vec3' }
    ? Vec3
    : D extends { type: 'booleen' }
      ? boolean
      : D extends { type: 'couleur' | 'texte' }
        ? string
        : D extends { type: 'choix'; options: readonly { valeur: infer O }[] }
          ? O
          : D extends { type: 'libre'; defaut: infer T }
            ? T
            : never

export type Valeurs<V extends DefVariables> = { -readonly [K in keyof V]: ValeurDe<V[K]> }

export type IdBrique = 'scene-vecteurs-3d' | 'traceur-courbes' | 'apercu-shader' | 'editeur-nodes' | 'tableur-attributs' | 'pas-a-pas'

export interface PropsVue<V extends DefVariables> {
  v: Valeurs<V>
  /** Change une variable. */
  set: <K extends keyof V>(nom: K, valeur: Valeurs<V>[K]) => void
  /** Change plusieurs variables d'un coup. */
  setPlusieurs: (valeurs: Partial<Valeurs<V>>) => void
}

export interface DefModule<V extends DefVariables> {
  id: string
  titre: string
  /** Une phrase : ce que l'on manipule. */
  description?: string
  brique: IdBrique
  variables: V
  presets?: { nom: string; valeurs: Partial<Valeurs<V>> }[]
  defi?: { texte: string; reussi: (v: Valeurs<V>) => boolean }
  /**
   * `cote` : contrôles à droite de la vue (en dessous sur mobile).
   * `dessous` : vue sur toute la largeur, contrôles en dessous (éditeur de nodes, tableur).
   */
  disposition?: 'cote' | 'dessous'
  /** Classe de hauteur de la vue, par défaut un rapport 4/3 (16/10 dès sm). */
  hauteurVue?: string
  Vue: ComponentType<PropsVue<V>>
  /** Contenu sous les contrôles automatiques : résultat chiffré, formule en direct… */
  Lecture?: ComponentType<PropsVue<V>>
}

export interface MetaModule {
  id: string
  titre: string
  description?: string
  brique: IdBrique
}

export type ComposantModule = ComponentType & { meta: MetaModule }

export type Enfants = { children?: ReactNode }
