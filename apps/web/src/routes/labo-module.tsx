import 'katex/dist/katex.min.css'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { data, Link } from 'react-router'
import type { Route } from './+types/labo-module'
import { brique } from '../briques/catalogue'
import type { MetaModule } from '../briques/types'
import { AttenteModule, ErreurModule } from '../concept/EmplacementModule'
import { metaPage } from '../lib/meta'
import { chargeurModule, nomsModules } from '../lib/modules'

export function loader({ params }: Route.LoaderArgs) {
  if (!nomsModules().includes(params.id)) throw data('Module introuvable', { status: 404 })
  return { id: params.id }
}

export function meta({ params }: Route.MetaArgs) {
  return metaPage({ titre: `${params.id} · Labo`, description: `Module interactif ${params.id}, testé isolément.`, chemin: `/labo/${params.id}`, indexer: false })
}

export default function LaboModule({ loaderData }: Route.ComponentProps) {
  const { id } = loaderData
  const charger = chargeurModule(id)!
  const Module = useMemo(() => lazy(charger), [charger])
  const [m, setM] = useState<MetaModule | null>(null)
  const [monte, setMonte] = useState(false)
  useEffect(() => {
    setMonte(true)
    charger().then((x) => setM(x.default.meta))
  }, [charger])

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 pb-10 sm:pt-12">
      <nav className="text-sm text-doux" aria-label="Fil d’Ariane">
        <Link to="/labo" className="hover:text-texte">
          Labo
        </Link>
        {m && <span> / {brique(m.brique).titre}</span>}
      </nav>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{m?.titre ?? id}</h1>
      {m?.description && <p className="mt-2 text-doux">{m.description}</p>}
      <div className="mt-6">
        {monte ? (
          <ErreurModule>
            <Suspense fallback={<AttenteModule />}>
              <Module />
            </Suspense>
          </ErreurModule>
        ) : (
          <AttenteModule />
        )}
      </div>
      <p className="mt-4 font-mono text-xs text-doux">
        apps/web/src/modules/{id}.tsx · brique {m?.brique ?? '…'}
      </p>
    </main>
  )
}
