import type { ComponentType } from 'react'

/** Composant produit par la compilation d'un fichier MDX. */
export type ContenuMdx = ComponentType<{ components?: Record<string, unknown> }>

/**
 * Registre des corps MDX des concepts. Chaque fichier devient un petit morceau
 * de JavaScript chargé à la demande : une page ne télécharge que son texte.
 */
const fichiers = import.meta.glob<{ default: ContenuMdx }>('../../../../content/concepts/*/*.mdx')
const parSlug = new Map(Object.entries(fichiers).map(([chemin, charger]) => [chemin.split('/').pop()!.replace(/\.mdx$/, ''), charger]))
const charges = new Map<string, ContenuMdx>()

export async function chargerContenu(slug: string): Promise<ContenuMdx | null> {
  const deja = charges.get(slug)
  if (deja) return deja
  const charger = parSlug.get(slug)
  if (!charger) return null
  const m = await charger()
  charges.set(slug, m.default)
  return m.default
}

/** Corps déjà chargé (par le loader au pré-rendu, ou avant l'hydratation côté navigateur). */
export const contenuCharge = (slug: string) => charges.get(slug) ?? null

/** Avant d'hydrater une page concept pré-rendue, on charge son texte pour que le rendu soit identique. */
export async function prechargerDepuisUrl(chemin: string) {
  const m = chemin.match(/^\/concepts\/([^/]+)\/?$/)
  if (m) await chargerContenu(decodeURIComponent(m[1]))
}
