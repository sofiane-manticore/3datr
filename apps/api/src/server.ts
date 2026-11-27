import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { existsSync, statSync } from 'node:fs'
import { join, normalize, resolve, sep } from 'node:path'
import { connectMongo, pingMongo, closeMongo } from './db.js'

const port = Number(process.env.PORT ?? 3000)
const webDist = resolve(process.env.WEB_DIST ?? 'apps/web/dist/client')

const app = Fastify({ logger: true })

try {
  await connectMongo(process.env.MONGO_URL)
} catch (err) {
  app.log.error({ err }, 'MongoDB connection failed, API starts without database')
}

app.get('/api/health', async () => ({ status: 'ok', mongo: await pingMongo() }))

if (existsSync(webDist)) {
  // Pages pré-rendues : /concepts/<slug> → concepts/<slug>/index.html.
  // Le reste (URL inconnue) reçoit le fallback SPA avec un statut 404.
  const fallback = existsSync(join(webDist, '__spa-fallback.html')) ? '__spa-fallback.html' : 'index.html'
  const pagePrerendue = (url: string) => {
    let chemin: string
    try {
      chemin = decodeURIComponent(url.split('?')[0]).replace(/\/+$/, '')
    } catch {
      return null
    }
    const rel = normalize(join(chemin, 'index.html')).replace(/^[\\/]+/, '')
    const absolu = join(webDist, rel)
    if (!absolu.startsWith(webDist + sep)) return null
    return existsSync(absolu) && statSync(absolu).isFile() ? rel : null
  }

  await app.register(fastifyStatic, {
    root: webDist,
    redirect: false,
    setHeaders(res, chemin) {
      // Les fichiers d'assets portent une empreinte : cache long. Le HTML et les .data : toujours revalider.
      if (chemin.includes(`${sep}assets${sep}`)) res.setHeader('cache-control', 'public, max-age=31536000, immutable')
      else res.setHeader('cache-control', 'public, max-age=0, must-revalidate')
    },
  })
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not found' })
    if (req.method !== 'GET' && req.method !== 'HEAD') return reply.code(404).send()
    const page = pagePrerendue(req.url)
    if (page) return reply.type('text/html').sendFile(page)
    return reply.code(404).type('text/html').sendFile(fallback)
  })
}

const shutdown = async () => {
  await app.close()
  await closeMongo()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

await app.listen({ port, host: '0.0.0.0' })
