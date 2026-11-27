import type { Config } from '@react-router/dev/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Site statique pré-rendu : chaque page concept existe en HTML au build,
 * puis React prend la main. Les pages non listées passent par le fallback SPA.
 */
export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  ssr: false,
  async prerender() {
    const catalogue = JSON.parse(readFileSync(join(import.meta.dirname, 'public/data/catalog.json'), 'utf8')) as {
      concepts: { slug: string }[]
    }
    return ['/', '/concepts', '/gabarit', ...catalogue.concepts.map((c) => `/concepts/${c.slug}`)]
  },
} satisfies Config
