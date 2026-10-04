import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const MIGRATIONS = join(HERE, '../../migrations')
const FASE2 = readdirSync(MIGRATIONS)
  .filter((f) => /^2026100313|^2026100314|^2026100315|^2026100316|^2026100317|^2026100318|^2026100319|^2026100320|^2026100321|^20261004100000/.test(f))
  .sort()

export async function buildDb() {
  const db = new PGlite()
  await db.exec(readFileSync(join(HERE, 'base.sql'), 'utf8'))
  const failures = []
  for (const file of FASE2) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'))
      console.log('OK   ', file)
    } catch (e) {
      failures.push({ file, message: e.message })
      console.log('ERROR', file, '->', e.message)
      break
    }
  }
  return { db, failures }
}

if (process.argv[1] && process.argv[1].endsWith('apply.mjs')) {
  const { failures } = await buildDb()
  console.log(failures.length ? 'RESULTADO: falla' : 'RESULTADO: todas las migraciones aplicaron')
}
