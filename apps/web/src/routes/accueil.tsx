import type { Route } from './+types/accueil'
import { lireGraphe } from '../lib/catalogue.server'
import { Constellation } from '../carte/Constellation'

export const handle = { pleinEcran: true }

/** Au build : seulement ce que la carte dessine (positions calculées par `pnpm contenu:compiler`). */
export function loader() {
  const g = lireGraphe()
  return {
    domaines: g.domaines,
    noeuds: g.noeuds,
    liens: g.liens,
  }
}

export default function Accueil({ loaderData }: Route.ComponentProps) {
  return (
    <main className="h-[calc(100dvh-3.5rem)]">
      <h1 className="sr-only">3DATR : la constellation des concepts des artistes 3D</h1>
      <Constellation donnees={loaderData} />
    </main>
  )
}
