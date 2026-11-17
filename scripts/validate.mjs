#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { SKILLS_ROOT, readCandidates, splitSkill } from '../lib/parse.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SKILLS_DIR = join(ROOT, '.agents', 'skills')
const problems = []
const fail = (message) => problems.push(message)

function walk(directory, visit) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path, visit)
    else if (entry.isFile()) visit(path)
  }
}

function frontmatterOf(file) {
  const raw = readFileSync(file, 'utf8')
  const { data, body } = splitSkill(raw, file)
  return { data, body, raw }
}

// 1. Every skill directory is valid and matches its frontmatter.
const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
if (skillDirs.length === 0) fail('no skill directories found')
const candidates = readCandidates()
if (candidates.length !== skillDirs.length) {
  fail(`provider read ${candidates.length} skills, disk has ${skillDirs.length} directories`)
}
for (const directory of skillDirs) {
  const file = join(SKILLS_DIR, directory, 'SKILL.md')
  if (!existsSync(file)) {
    fail(`${relative(ROOT, file)} is missing`)
    continue
  }
  const { body } = frontmatterOf(file)
  if (body.trim() === '') fail(`${relative(ROOT, file)} has an empty body`)
}

// 2. poteto-mode indexes every principle skill and every playbook.
const poteto = readFileSync(join(SKILLS_DIR, 'poteto-mode', 'SKILL.md'), 'utf8')
const principlesSection = poteto.split('## Principles')[1]?.split('## Autonomy')[0] ?? ''
const playbooksSection = poteto.split('## Playbooks')[1] ?? ''
const toKebab = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')

const indexedPrinciples = new Set()
for (const line of principlesSection.split(/\r?\n/)) {
  const match = line.match(/^- \*\*([^*]+?)\.?\*\*(?: \(\*\*(principle-[a-z0-9-]+)\*\*\))?/)
  if (match) indexedPrinciples.add(match[2] ?? `principle-${toKebab(match[1])}`)
}
const diskPrinciples = new Set(skillDirs.filter((name) => name.startsWith('principle-')))
for (const principle of indexedPrinciples) {
  if (!diskPrinciples.has(principle)) fail(`poteto-mode references missing principle "${principle}"`)
}
for (const principle of diskPrinciples) {
  if (!indexedPrinciples.has(principle)) fail(`.agents/skills/${principle} is not indexed in poteto-mode`)
}

const indexedPlaybooks = new Set()
for (const line of playbooksSection.split(/\r?\n/)) {
  const match = line.match(/^- \*\*([^*]+?)\.\*\*(?:.*?File: `playbooks\/([^`]+)`)?/)
  if (match) indexedPlaybooks.add(match[2] ?? `${toKebab(match[1])}.md`)
  const list = line.match(/^([A-Z][^.]*(?:,[^.]*)+)\.$/)
  if (list) {
    for (const title of list[1].split(',')) {
      const name = title.trim()
      if (name !== '') indexedPlaybooks.add(`${toKebab(name)}.md`)
    }
  }
}
const diskPlaybooks = new Set(readdirSync(join(SKILLS_DIR, 'poteto-mode', 'playbooks'))
  .filter((file) => file.endsWith('.md')))
for (const playbook of indexedPlaybooks) {
  if (!diskPlaybooks.has(playbook)) fail(`poteto-mode references missing playbook "playbooks/${playbook}"`)
}
for (const playbook of diskPlaybooks) {
  if (!indexedPlaybooks.has(playbook)) fail(`.agents/skills/poteto-mode/playbooks/${playbook} is not indexed in poteto-mode`)
}

// 3. The bundle manifest and patch agree.
const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
for (const field of ['name', 'version', 'description']) {
  if (typeof manifest[field] !== 'string' || manifest[field].trim() === '') {
    fail(`package.json is missing string field "${field}"`)
  }
}
if (manifest.dsh?.bundle?.patch !== './cordis.patch.yml') {
  fail('package.json must declare dsh.bundle.patch = ./cordis.patch.yml')
}
for (const required of ['lib', '.agents', 'cordis.patch.yml', 'plugin.json', 'AGENTS.md', 'COMPATIBILITY.md', 'README.md', 'LICENSE']) {
  if (!(manifest.files ?? []).includes(required)) fail(`package.json files must include "${required}"`)
}
const plugin = JSON.parse(readFileSync(join(ROOT, 'plugin.json'), 'utf8'))
for (const field of ['name', 'version', 'description']) {
  if (plugin[field] !== manifest[field] && field !== 'name') {
    fail(`plugin.json ${field} must match package.json`)
  }
}
if (!/^https:\/\/github\.com\/pstack-ports\/dsh-pstack/u.test(plugin.homepage ?? '')) {
  fail('plugin.json homepage must point at pstack-ports/dsh-pstack')
}
const patchFile = join(ROOT, 'cordis.patch.yml')
if (!existsSync(patchFile)) fail('cordis.patch.yml is missing')
else {
  const patch = parseYaml(readFileSync(patchFile, 'utf8'))
  const rows = Array.isArray(patch) ? patch.flatMap((layer) => layer?.insert ?? []) : []
  const row = rows.find((entry) => entry?.id === 'pstack')
  if (!row) fail('cordis.patch.yml must insert a row with id "pstack"')
  else if (row.name !== manifest.name) {
    fail(`cordis.patch.yml row name "${row.name}" must equal package name "${manifest.name}"`)
  }
}

const MAX_ICON_BYTES = 256 * 1024
const ICON_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp'])

function iconProblem(icon) {
  if (typeof icon !== 'string' || icon.trim() === '') {
    return 'package.json must declare a non-empty "icon" path so DSH can render the plugin row'
  }
  if (isAbsolute(icon) || win32.isAbsolute(icon) || /^[A-Za-z][A-Za-z\d+.-]*:/u.test(icon)) {
    return `package.json icon "${icon}" must be a relative file path`
  }
  const declared = join(ROOT, icon)
  if (!existsSync(declared)) return `package.json icon "${icon}" does not exist`
  const file = realpathSync(declared)
  const local = relative(realpathSync(ROOT), file)
  if (local === '..' || local.startsWith(`..${sep}`) || isAbsolute(local)) {
    return `package.json icon "${icon}" must remain inside the package`
  }
  const extension = extname(file).toLowerCase()
  if (!ICON_EXTENSIONS.has(extension)) {
    return `package.json icon "${icon}" must be SVG, PNG, JPEG, or WebP`
  }
  const stat = statSync(file)
  if (!stat.isFile()) return `package.json icon "${icon}" must be a regular file`
  if (stat.size > MAX_ICON_BYTES) {
    return `package.json icon "${icon}" is ${stat.size} bytes and exceeds 256 KiB (${MAX_ICON_BYTES} bytes); DSH will reject it. Re-encode the image.`
  }
  const bytes = readFileSync(file)
  if (bytes.length > MAX_ICON_BYTES) {
    return `package.json icon "${icon}" is ${bytes.length} bytes and exceeds 256 KiB (${MAX_ICON_BYTES} bytes); DSH will reject it. Re-encode the image.`
  }
  const head = bytes.subarray(0, 512)
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  let valid = false
  if (extension === '.png') {
    valid = head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  } else if (extension === '.jpg' || extension === '.jpeg') {
    valid = isJpeg
  } else if (extension === '.webp') {
    valid = head.subarray(0, 4).toString('ascii') === 'RIFF'
      && head.subarray(8, 12).toString('ascii') === 'WEBP'
  } else {
    valid = /<svg[\s>]/u.test(bytes.toString('utf8'))
  }
  if (!valid) {
    return `package.json icon "${icon}" does not contain ${extension.slice(1).toUpperCase()} data`
  }
  const packed = relative(ROOT, file).split(sep).join('/')
  const covered = (manifest.files ?? []).some((entry) => {
    const path = entry.replace(/^\.\//u, '').replace(/\/$/u, '')
    return packed === path || packed.startsWith(`${path}/`)
  })
  if (!covered) return `package.json files must include icon "${icon}"`
  return undefined
}

const iconFailure = iconProblem(manifest.icon)
if (iconFailure !== undefined) fail(iconFailure)

// 4. Relative Markdown links resolve.
function checkLinks(file) {
  const raw = readFileSync(file, 'utf8')
  for (const match of raw.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)) {
    const target = match[1]
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/iu.test(target)) continue
    // synthesizer-prompt.md uses `(url)` as a citation placeholder, not a file.
    if (target === 'url') continue
    const pathPart = decodeURIComponent(target.split('#')[0].split('?')[0])
    if (pathPart === '') continue
    const resolved = resolve(dirname(file), pathPart)
    if (!existsSync(resolved)) {
      fail(`${relative(ROOT, file)}: broken link ${target}`)
    }
  }
}
for (const file of [join(ROOT, 'README.md'), join(ROOT, 'COMPATIBILITY.md')]) checkLinks(file)
walk(join(ROOT, 'docs'), (file) => {
  if (file.endsWith('.md')) checkLinks(file)
})
walk(SKILLS_DIR, (file) => {
  if (file.endsWith('.md')) checkLinks(file)
})

// 5. No Cursor- or Antigravity-only runtime tokens remain in skill bodies.
const forbidden = [
  /subagent_type/u,
  /AskQuestion/u,
  /~\/\.cursor\b/u,
  /\.cursor\/skills/u,
  /cursor-team-kit/u,
  /~\/\.gemini\b/u,
  /invoke_subagent/u,
  /\bTypeName\b/u,
  /\bgrok-[a-z0-9-]+/u,
  /\bclaude-opus-[a-z0-9-]+/u,
  /\bcomposer-[a-z0-9-]+/u,
]
walk(SKILLS_DIR, (file) => {
  if (!file.endsWith('.md')) return
  const raw = readFileSync(file, 'utf8')
  for (const pattern of forbidden) {
    if (pattern.test(raw)) fail(`${relative(ROOT, file)}: leftover ${pattern}`)
  }
})

// 6. Every SKILL.md is loadable through the provider's pure reader.
for (const candidate of candidates) {
  if (!statSync(candidate.locator).isFile()) fail(`${candidate.locator} is not a file`)
  const { body } = splitSkill(readFileSync(candidate.locator, 'utf8'), candidate.locator)
  if (body.length === 0) fail(`${candidate.name} has an empty body`)
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`ERROR: ${problem}`)
  process.exit(1)
}
console.log(`Validated ${candidates.length} skills, ${diskPlaybooks.size} playbooks, ${indexedPrinciples.size} principles, the DSH bundle manifest, and the plugin icon.`)
