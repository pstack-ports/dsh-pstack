/**
 * dsh-pstack: the pstack skill bundle for DeepSeek Harness.
 *
 * Skills live in `.agents/skills/` so the same tree is discoverable as a
 * project skill root when this repository is opened directly, and served by
 * this provider when the package is installed as a profile bundle.
 */
import { readFile } from 'node:fs/promises'
import { BUNDLED_SKILL_RANK } from '@deepseek-ai/dsh-skill'
import z from '@deepseek-ai/schemastery'
import { readCandidates, splitSkill } from './parse.js'

/** Cordis plugin identity; the profile row id is set by cordis.patch.yml. */
export const name = 'pstack'

/** The skill registry is a hard dependency. */
export const inject = ['skills']

export const Config = z.object({
  /** Provider name in the skill registry; change only to dodge a collision. */
  providerName: z.string().min(1).default('pstack'),
})

/** Register the bundle's skills with the harness skill registry. */
export function apply(ctx, config = {}) {
  const providerName = config.providerName ?? 'pstack'
  const provider = {
    name: providerName,
    list: () => Promise.resolve(readCandidates(providerName).map((candidate) => ({
      ...candidate,
      rank: BUNDLED_SKILL_RANK,
    }))),
    async get(candidate, options) {
      const raw = await readFile(candidate.locator, {
        encoding: 'utf8',
        signal: options?.signal,
      })
      const { body } = splitSkill(raw, candidate.locator)
      const { rank: _rank, locator: _locator, ...summary } = candidate
      return { ...summary, content: body }
    },
  }

  ctx.effect(function* () {
    yield ctx.skills.registerProvider(() => provider)
  })
}
