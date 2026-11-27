import { data } from 'react-router'
import 'katex/dist/katex.min.css'
import type { Route } from './+types/concept'
import { donneesConcept } from '../lib/catalogue.server'
import { chargerContenu, contenuCharge } from '../lib/contenus'
import { metaPage } from '../lib/meta'
import { PageConcept } from '../concept/PageConcept'

/** Exécuté au build pour chaque concept (pré-rendu) ; le résultat est servi en .data. */
export async function loader({ params }: Route.LoaderArgs) {
  const d = donneesConcept(params.slug)
  if (!d) throw data('Concept introuvable', { status: 404 })
  await chargerContenu(params.slug)
  return d
}

/** Navigation dans le navigateur : données pré-calculées et texte MDX en parallèle. */
export async function clientLoader({ serverLoader, params }: Route.ClientLoaderArgs) {
  const [d] = await Promise.all([serverLoader(), chargerContenu(params.slug)])
  return d
}

export function meta({ data: d }: Route.MetaArgs) {
  if (!d) return [{ title: 'Concept introuvable · 3DATR' }]
  const c = d.concept
  return metaPage({
    titre: c.titre,
    description: c.resume ?? `${c.titre} : ${d.domaine.titre}. Fiche 3DATR avec module interactif.`,
    chemin: `/concepts/${c.slug}`,
    indexer: c.statut === 'publie',
  })
}

export default function Concept({ loaderData }: Route.ComponentProps) {
  return <PageConcept key={loaderData.concept.slug} donnees={loaderData} Contenu={contenuCharge(loaderData.concept.slug)} />
}
