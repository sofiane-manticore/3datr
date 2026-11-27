import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Catalogue, ConceptCompile, Graphe } from '@3datr/core'
import type { Apercu, DonneesConcept } from './types'

let cache: Catalogue | null = null

/** catalog.json compilé par `pnpm contenu:compiler`. Lu au build (pré-rendu) uniquement. */
export function lireCatalogue(): Catalogue {
  cache ??= JSON.parse(readFileSync(join(process.cwd(), 'public/data/catalog.json'), 'utf8')) as Catalogue
  return cache
}

let cacheGraphe: Graphe | null = null

/** graph.json : positions des concepts sur la carte et liens typés. */
export function lireGraphe(): Graphe {
  cacheGraphe ??= JSON.parse(readFileSync(join(process.cwd(), 'public/data/graph.json'), 'utf8')) as Graphe
  return cacheGraphe
}

export function apercu(c: ConceptCompile, cat = lireCatalogue()): Apercu {
  const d = cat.domaines.find((x) => x.slug === c.domaine)
  return {
    slug: c.slug,
    titre: c.titre,
    ...(c.resume ? { resume: c.resume } : {}),
    niveau: c.niveau,
    statut: c.statut,
    domaine: c.domaine,
    couleur: d?.couleur ?? '#888888',
  }
}

/** Assemble tout ce dont la page d'un concept a besoin, ou null s'il n'existe pas. */
export function donneesConcept(slug: string, concept?: ConceptCompile): DonneesConcept | null {
  const cat = lireCatalogue()
  const c = concept ?? cat.concepts.find((x) => x.slug === slug)
  if (!c) return null
  const domaine = cat.domaines.find((d) => d.slug === c.domaine)!
  const chapitre = domaine.chapitres.find((ch) => ch.slug === c.chapitre) ?? null

  const lies = new Set([
    ...c.prerequis,
    ...c.suites,
    ...c.requisPar,
    ...c.alternativesTous,
    ...c.cites,
    ...c.citePar,
  ])
  const apercus: Record<string, Apercu> = {}
  for (const s of lies) {
    const x = cat.concepts.find((y) => y.slug === s)
    if (x) apercus[s] = apercu(x, cat)
  }
  const ordre = chapitre?.concepts ?? []
  const i = ordre.indexOf(c.slug)
  const precedent = i > 0 ? ordre[i - 1] : null
  const suivant = i >= 0 && i < ordre.length - 1 ? ordre[i + 1] : null
  for (const s of [precedent, suivant]) {
    const x = s && cat.concepts.find((y) => y.slug === s)
    if (x) apercus[x.slug] = apercu(x, cat)
  }

  return {
    concept: c,
    domaine: { slug: domaine.slug, titre: domaine.titre, couleur: domaine.couleur },
    chapitre: chapitre ? { slug: chapitre.slug, titre: chapitre.titre } : null,
    apercus,
    parcours: cat.parcours
      .filter((p) => p.concepts.includes(c.slug))
      .map((p) => ({ slug: p.slug, titre: p.titre, position: p.concepts.indexOf(c.slug) + 1, total: p.concepts.length })),
    precedent,
    suivant,
  }
}
