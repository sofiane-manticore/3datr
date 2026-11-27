import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { connectMongo, pingMongo, closeMongo } from './db.js'

const port = Number(process.env.PORT ?? 3000)
const webDist = resolve(process.env.WEB_DIST ?? 'apps/web/dist')

const app = Fastify({ logger: true })

try {
  await connectMongo(process.env.MONGO_URL)
} catch (err) {
  app.log.error({ err }, 'MongoDB connection failed, API starts without database')
}

app.get('/api/health', async () => ({ status: 'ok', mongo: await pingMongo() }))

if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist })
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'not found' })
    return reply.sendFile('index.html')
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
