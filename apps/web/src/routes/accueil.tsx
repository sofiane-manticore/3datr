import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Route } from './+types/accueil'
import { apercu, lireCatalogue } from '../lib/catalogue.server'
import { Anneaux, PastilleDomaine } from '../concept/Pastilles'

/**
 * Accueil provisoire : le sommaire des concepts par domaine et chapitre.
 * La carte en constellation et la recherche prendront cette place (étapes 6 et 7).
 */
export function loader() {
  const cat = lireCatalogue()
  const parSlug = new Map(cat.concepts.map((c) => [c.slug, c]))
  return {
    total: cat.concepts.length,
    publies: cat.concepts.filter((c) => c.statut === 'publie').length,
    parcours: cat.parcours.length,
    domaines: cat.domaines.map((d) => ({
      slug: d.slug,
      titre: d.titre,
      couleur: d.couleur,
      chapitres: d.chapitres.map((ch) => ({
        slug: ch.slug,
        titre: ch.titre,
        concepts: ch.concepts.map((s) => apercu(parSlug.get(s)!, cat)),
      })),
    })),
  }
}

export default function Accueil({ loaderData }: Route.ComponentProps) {
  const { total, publies, domaines, parcours } = loaderData
  return (
    <main className="mx-auto max-w-6xl px-4 pt-12 sm:pt-16">
      <section className="max-w-3xl">
        <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
          Les maths et les techniques des artistes 3D, à manipuler.
        </h1>
        <p className="mt-5 text-lg text-doux text-pretty">
          Vecteurs, shaders, Geometry Nodes, bruits, UV, programmation : chaque concept est expliqué simplement, relié aux
          nodes de Blender et d'Unreal, et accompagné d'un module interactif pour se l'approprier.
        </p>
        <p className="mt-4 text-sm text-doux">
          {total} concepts en préparation dans {domaines.length} domaines et {parcours} parcours
          {publies > 0 ? `, dont ${publies} déjà rédigés` : ''}. <EtatApi />
        </p>
      </section>

      <div className="mt-14 space-y-14">
        {domaines.map((d) => (
          <section key={d.slug} aria-labelledby={`domaine-${d.slug}`}>
            <h2 id={`domaine-${d.slug}`} className="flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl">
              <PastilleDomaine couleur={d.couleur} className="size-3" />
              {d.titre}
            </h2>
            <div className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {d.chapitres.map((ch) => (
                <div key={ch.slug}>
                  <h3 className="text-xs font-semibold tracking-wider text-doux uppercase">{ch.titre}</h3>
                  <ul className="mt-2 space-y-0.5">
                    {ch.concepts.map((c) => (
                      <li key={c.slug}>
                        <Link
                          to={`/concepts/${c.slug}`}
                          prefetch="intent"
                          className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-surface"
                        >
                          <span className={c.statut === 'brouillon' ? 'text-texte/80' : 'font-medium'}>{c.titre}</span>
                          <Anneaux niveau={c.niveau} className="shrink-0 text-doux" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

/** Petit témoin de l'API et de la base, utile tant que le site se construit. */
function EtatApi() {
  const [etat, setEtat] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((h: { status: string; mongo: string }) => setEtat(h.status === 'ok' && h.mongo === 'ok' ? 'API et base en ligne.' : `API : ${h.status}, base : ${h.mongo}.`))
      .catch(() => setEtat(null))
  }, [])
  return etat ? <span>{etat}</span> : null
}
