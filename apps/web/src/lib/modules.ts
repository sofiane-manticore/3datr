import type { ComponentType } from 'react'

/**
 * Registre des modules interactifs : apps/web/src/modules/<Nom>.tsx ou <Nom>/index.tsx.
 * Le nom est celui du champ `module:` de la fiche. La validation du contenu vérifie
 * qu'il existe ; ici on ne fait que le charger à la demande (React.lazy).
 */
const fichiers = import.meta.glob<{ default: ComponentType }>(['../modules/*.tsx', '../modules/*/index.tsx'])

const parNom = new Map(
  Object.entries(fichiers).map(([chemin, charger]) => {
    const morceaux = chemin.replace(/\.tsx$/, '').split('/')
    const nom = morceaux[morceaux.length - 1] === 'index' ? morceaux[morceaux.length - 2] : morceaux[morceaux.length - 1]
    return [nom, charger]
  }),
)

export const chargeurModule = (nom: string | null | undefined) => (nom ? parNom.get(nom) ?? null : null)
