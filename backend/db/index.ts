import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from "path";
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbFile = path.join(__dirname, "/db.json")

export type Restaurant = {
  id: string
  name: string
  category: string
  location: string
  price: string
}

export type User = {
  email: string
  password: string
}

export type DbData = {
  restaurants: Restaurant[]
  users: User[]
}

const adapter = new JSONFile<DbData>(dbFile)
const defaultData: DbData = { restaurants: [], users: [] }

const db = new Low<DbData>(adapter, defaultData)

await db.read()

if (!db.data) {
  db.data = defaultData
  await db.write()
}

export default db
