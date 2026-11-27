import 'katex/dist/katex.min.css'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extraireCitations } from '@3datr/core/liens'
import type { Route } from './+types/gabarit'
import { apercu, donneesConcept, lireCatalogue } from '../lib/catalogue.server'
import { metaPage } from '../lib/meta'
import { PageConcept } from '../concept/PageConcept'
import Exemple from '../exemple/produit-scalaire.mdx'

/**
 * Page de démonstration du gabarit, non indexée : la fiche produit-scalaire
 * avec un en-tête et un texte d'exemple, pour voir les 9 sections remplies.
 * La vraie fiche sera rédigée dans son propre fil ; ce texte pourra lui servir de base.
 */
export function loader() {
  const base = lireCatalogue().concepts.find((c) => c.slug === 'produit-scalaire')!
  const concept = {
    ...base,
    resume: 'Mesure à quel point deux directions pointent dans le même sens.',
    nature: 'fondamental' as const,
    temps: 10,
    nodes: ['Vector Math › Dot Product', 'DotProduct', 'dot()'],
    usages: ['materiaux' as const, 'stylise' as const, 'vfx' as const],
    synonymes: ['dot', 'N dot L', 'DotProduct', 'produit scalaire'],
    effets: ['neige sur le dessus', 'ombrage', 'liseré', "détection d'angle"],
    questions: [
      'neige seulement sur le dessus des objets',
      'savoir si une face regarde la lampe',
      'savoir si un objet est devant ou derrière',
    ],
    description:
      "Le produit scalaire prend deux directions et rend un seul nombre : 1 quand elles pointent exactement dans le même sens, 0 quand elles sont perpendiculaires, −1 quand elles sont opposées. C'est l'outil le plus utilisé des shaders et de Geometry Nodes pour répondre à la question « est-ce que cette face regarde par là ? ».",
  }
  const d = donneesConcept(base.slug, concept)!
  // Les liens [[…]] du texte d'exemple ont besoin de leurs aperçus (pastille, bulle).
  const source = readFileSync(join(process.cwd(), 'src/exemple/produit-scalaire.mdx'), 'utf8')
  for (const s of extraireCitations(source)) {
    const c = lireCatalogue().concepts.find((x) => x.slug === s)
    if (c) d.apercus[s] = apercu(c)
  }
  return { ...d, exemple: true }
}

export function meta() {
  return metaPage({
    titre: 'Gabarit de page concept',
    description: 'Exemple des 9 sections d’une page concept 3DATR.',
    chemin: '/gabarit',
    indexer: false,
  })
}

export default function Gabarit({ loaderData }: Route.ComponentProps) {
  return <PageConcept donnees={loaderData} Contenu={Exemple} />
}
