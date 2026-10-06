// Verifica que las pantallas y componentes usen los tokens del tema (colores, tipografía, iconos).
// La línea base (design-baseline.json) solo puede bajar: cada archivo migrado reduce su conteo.
// Uso: node scripts/design-check.mjs          → falla si algún archivo aumentó sus valores fijos
//      node scripts/design-check.mjs --write  → guarda los conteos actuales como nueva línea base

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCAN_DIRS = ['src/screens', 'src/components']
const EXCLUDE = ['src/components/illustrations/undraw']
const BASELINE = join(ROOT, 'scripts', 'design-baseline.json')

const RULES = [
  { name: 'color', re: /#[0-9a-fA-F]{3,8}\b|rgba?\(/g },
  { name: 'fontSize', re: /fontSize:\s*\d/g },
  { name: 'fontWeight', re: /fontWeight:\s*'\d+'/g },
  { name: 'iconoIonicons', re: /-outline'|-sharp'|ionicons/g },
]

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    const rel = relative(ROOT, full).replace(/\\/g, '/')
    if (EXCLUDE.some((e) => rel.startsWith(e))) continue
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(rel)
  }
  return out
}

function countFile(text) {
  const counts = {}
  for (const rule of RULES) {
    const matches = text.match(rule.re)
    counts[rule.name] = matches ? matches.length : 0
  }
  return counts
}

const files = (await Promise.all(SCAN_DIRS.map((d) => walk(join(ROOT, d))))).flat()
const current = {}
for (const rel of files) {
  const text = await readFile(join(ROOT, rel), 'utf8')
  const counts = countFile(text)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total > 0) current[rel] = { total, ...counts }
}

if (process.argv.includes('--write')) {
  await writeFile(BASELINE, JSON.stringify(current, null, 2) + '\n')
  console.log(`Línea base guardada: ${Object.keys(current).length} archivos con valores fijos.`)
  process.exit(0)
}

let baseline = {}
try {
  baseline = JSON.parse(await readFile(BASELINE, 'utf8'))
} catch {
  console.error('No existe scripts/design-baseline.json. Ejecuta con --write una vez.')
  process.exit(1)
}

const regressions = []
for (const [rel, cur] of Object.entries(current)) {
  const base = baseline[rel]
  if (!base) {
    regressions.push(`${rel}: archivo nuevo con ${cur.total} valores fijos (usa tokens del tema)`)
    continue
  }
  for (const rule of RULES) {
    if (cur[rule.name] > (base[rule.name] ?? 0)) {
      regressions.push(`${rel}: ${rule.name} ${base[rule.name] ?? 0} → ${cur[rule.name]}`)
    }
  }
}

const totals = Object.values(current).reduce((acc, c) => {
  for (const r of RULES) acc[r.name] = (acc[r.name] ?? 0) + c[r.name]
  return acc
}, {})
console.log(`Valores fijos pendientes: ${JSON.stringify(totals)} en ${Object.keys(current).length} archivos.`)

if (regressions.length) {
  console.error('\nSe agregaron valores fijos (colores, tamaños o grosores) fuera del tema:')
  for (const r of regressions) console.error(`  - ${r}`)
  process.exit(1)
}
console.log('Sin regresiones de diseño.')
