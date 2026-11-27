import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BRIQUES } from '../briques/catalogue'
import type { MetaModule } from '../briques/types'
import { metaPage } from '../lib/meta'
import { chargeurModule, nomsModules } from '../lib/modules'

export function meta() {
  return metaPage({
    titre: 'Labo des modules',
    description: 'Les six briques des modules interactifs de 3DATR et tous les modules, à tester isolément.',
    chemin: '/labo',
    indexer: false,
  })
}

/** Les métadonnées viennent des modules eux-mêmes : on les charge dans le navigateur. */
export function useMetasModules() {
  const [metas, setMetas] = useState<MetaModule[] | null>(null)
  useEffect(() => {
    let actif = true
    Promise.all(nomsModules().map((n) => chargeurModule(n)!().then((m) => m.default.meta)))
      .then((l) => actif && setMetas(l))
      .catch(() => actif && setMetas([]))
    return () => {
      actif = false
    }
  }, [])
  return metas
}

export default function Labo() {
  const metas = useMetasModules()
  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 pb-10 sm:pt-14">
      <p className="text-sm text-doux">Labo</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Les briques des modules</h1>
      <p className="mt-3 max-w-2xl text-doux">
        Chaque module interactif d’une fiche est construit sur l’une de ces six briques. Ici on les essaie une par une, hors de toute page concept. Les réglages d’un module sont
        gardés dans l’adresse de la page : copier le lien partage la configuration.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {BRIQUES.map((b, i) => {
          const mods = metas?.filter((m) => m.brique === b.id)
          return (
            <section key={b.id} className="rounded-xl border border-bord bg-surface p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-doux">{i + 1}</span>
                <h2 className="font-semibold">{b.titre}</h2>
              </div>
              <p className="mt-2 text-sm text-doux">{b.description}</p>
              <p className="mt-2 text-xs text-doux">
                Pour : <span className="text-texte">{b.pour}</span>
              </p>
              <ul className="mt-4 space-y-1">
                {mods === undefined && <li className="text-sm text-doux">Chargement des modules…</li>}
                {mods?.length === 0 && <li className="text-sm text-doux">Aucun module pour l’instant.</li>}
                {mods?.map((m) => (
                  <li key={m.id}>
                    <Link to={`/labo/${m.id}`} className="group flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-surface-2">
                      <span className="font-medium group-hover:text-accent">{m.titre}</span>
                      <span className="shrink-0 font-mono text-xs text-doux">{m.id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}
