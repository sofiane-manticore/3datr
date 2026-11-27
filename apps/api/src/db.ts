import { MongoClient, type Db } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

export async function connectMongo(url: string | undefined): Promise<Db | null> {
  if (!url) return null
  client = new MongoClient(url, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  db = client.db(process.env.MONGO_DB ?? '3datr')
  return db
}

export async function pingMongo(): Promise<'ok' | 'down' | 'not-configured'> {
  if (!db) return 'not-configured'
  try {
    await db.command({ ping: 1 })
    return 'ok'
  } catch {
    return 'down'
  }
}

export async function closeMongo() {
  await client?.close()
}
