/**
 * Pure skill-tree reader for dsh-pstack.
 *
 * Kept free of harness imports so `scripts/validate.mjs` can exercise it
 * without a DSH installation.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

export const SKILLS_ROOT = fileURLToPath(new URL('../.agents/skills/', import.meta.url))
export const BUNDLED_SKILL_RANK = 600

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
export const SUPPORTED_FRONTMATTER_KEYS = new Set([
  'name',
  'description',
  'whenToUse',
  'metadata',
  'disable-model-invocation',
  'user-invocable',
])

export function isSkillName(value) {
  return typeof value === 'string' && value.length <= 64 && NAME_PATTERN.test(value)
}

function boolValue(value, fallback, where) {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 'yes', 'on', '1'].includes(normalized)) return true
    if (['false', 'no', 'off', '0'].includes(normalized)) return false
  }
  throw new Error(`${where}: invocation value must be a boolean, got ${JSON.stringify(value)}`)
}

export function splitSkill(raw, where) {
  const match = FRONTMATTER.exec(raw)
  if (match === null) throw new Error(`${where}: missing YAML frontmatter`)
  const data = parseYaml(match[1])
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${where}: frontmatter must be a YAML mapping`)
  }
  return { data, body: raw.slice(match[0].length).trim() }
}

function candidateOf(directory, where, providerName) {
  const raw = readFileSync(where, 'utf8')
  const { data } = splitSkill(raw, where)
  for (const key of Object.keys(data)) {
    if (!SUPPORTED_FRONTMATTER_KEYS.has(key)) {
      throw new Error(`${where}: unsupported frontmatter key "${key}"`)
    }
  }
  const skillName = typeof data.name === 'string' ? data.name.trim() : ''
  if (!isSkillName(skillName)) {
    throw new Error(`${where}: invalid skill name ${JSON.stringify(data.name)}`)
  }
  if (skillName !== directory) {
    throw new Error(`${where}: frontmatter name "${skillName}" does not match directory "${directory}"`)
  }
  const description = typeof data.description === 'string' ? data.description.trim() : ''
  if (description === '') throw new Error(`${where}: missing description`)
  const modelInvocable = !boolValue(data['disable-model-invocation'], false, where)
  const userInvocable = boolValue(data['user-invocable'], true, where)
  const skillDirectory = join(SKILLS_ROOT, directory)
  const metadata = data.metadata !== null && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
    ? data.metadata
    : undefined
  const whenToUse = typeof data.whenToUse === 'string' ? data.whenToUse.trim() : undefined
  return {
    name: skillName,
    description,
    ...(whenToUse === undefined ? {} : { whenToUse }),
    ...(metadata === undefined ? {} : { metadata }),
    invocation: { modelInvocable, userInvocable },
    provider: providerName,
    source: 'bundled',
    rank: BUNDLED_SKILL_RANK,
    resourceBase: { kind: 'directory', path: skillDirectory },
    locator: where,
  }
}

/** Read and validate every skill directory in the bundle. */
export function readCandidates(providerName = 'pstack') {
  const candidates = []
  for (const entry of readdirSync(SKILLS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const where = join(SKILLS_ROOT, entry.name, 'SKILL.md')
    try {
      candidates.push(candidateOf(entry.name, where, providerName))
    } catch (error) {
      console.warn(`[pstack] skipping ${entry.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return candidates.sort((left, right) => left.name.localeCompare(right.name))
}
