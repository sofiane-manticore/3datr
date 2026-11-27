import { useEffect, useState } from 'react'

type Health = { status: string; mongo: string }
type ResumeCatalogue = { concepts: unknown[]; domaines: unknown[]; parcours: unknown[] }

export function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [catalogue, setCatalogue] = useState<ResumeCatalogue | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'down', mongo: 'unknown' }))
    fetch('/data/catalog.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setCatalogue)
      .catch(() => setCatalogue(null))
  }, [])

  return (
    <main className="page">
      <h1>3DATR</h1>
      <p className="lead">
        Les maths et les techniques des artistes 3D, expliquées avec un module interactif pour chaque concept.
      </p>
      <p className="soon">Bientôt en ligne : vecteurs, shaders, Geometry Nodes, bruits, UV et bien plus.</p>
      {catalogue && (
        <p className="soon">
          {catalogue.concepts.length} concepts en préparation dans {catalogue.domaines.length} domaines et{' '}
          {catalogue.parcours.length} parcours.
        </p>
      )}
      <p className="status">
        API : {health ? health.status : '…'} · Base : {health ? health.mongo : '…'}
      </p>
    </main>
  )
}
