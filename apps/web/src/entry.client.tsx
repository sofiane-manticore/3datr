import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'
import { prechargerDepuisUrl } from './lib/contenus'

// Le texte MDX d'une page concept est chargé avant l'hydratation, pour retrouver
// exactement le HTML pré-rendu. Les navigations suivantes passent par clientLoader.
await prechargerDepuisUrl(window.location.pathname)

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  )
})
