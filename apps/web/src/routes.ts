import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/accueil.tsx'),
  route('concepts', 'routes/liste.tsx'),
  route('concepts/:slug', 'routes/concept.tsx'),
  route('gabarit', 'routes/gabarit.tsx'),
] satisfies RouteConfig
