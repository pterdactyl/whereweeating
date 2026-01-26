import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

type Restaurant = {
  name?: string
  category?: string
  location?: string
  price?: string
}

type DbJson = {
  restaurants?: Restaurant[]
  users?: any[]
}

function clean(v: unknown) {
  return typeof v === 'string' ? v.trim() : null
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')

  const supabase = createClient(url, key)

  // Adjust if your db.json is elsewhere:
  const dbPath = path.resolve(process.cwd(), '../backend/db//db.json') // if running from /backend
  // const dbPath = path.resolve(process.cwd(), './db.json') // if running from repo root

  const raw = fs.readFileSync(dbPath, 'utf8')
  const data: DbJson = JSON.parse(raw)

  const rows = (data.restaurants ?? [])
    .map(r => ({
      name: clean(r.name),
      category: clean(r.category),
      location: clean(r.location),
      price: clean(r.price),
    }))
    .filter(r => r.name) // must have a name

  console.log(`Found ${rows.length} restaurants to migrate from ${dbPath}`)

  // Insert in chunks (safe for large arrays)
  const chunkSize = 300
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)

    // Use upsert to avoid duplicates if you created the unique index
    const { error } = await supabase
      .from('restaurants')
      .upsert(chunk, { onConflict: 'name,location' })

    if (error) throw error
    console.log(`Upserted ${Math.min(i + chunkSize, rows.length)}/${rows.length}`)
  }

  console.log('✅ Migration complete')
}

main().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
