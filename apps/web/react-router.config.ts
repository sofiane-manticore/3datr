import type { Config } from '@react-router/dev/config'
import { readdirSync, readFileSync } from 'node:fs'
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
    const modules = readdirSync(join(import.meta.dirname, 'src/modules'), { withFileTypes: true })
      .map((f) => (f.isDirectory() ? f.name : f.name.replace(/\.tsx$/, '')))
      .filter((n) => /^[A-Z]/.test(n))
    return [
      '/',
      '/concepts',
      '/gabarit',
      '/labo',
      ...modules.map((m) => `/labo/${m}`),
      ...catalogue.concepts.map((c) => `/concepts/${c.slug}`),
    ]
  },
} satisfies Config
