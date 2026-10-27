#!/usr/bin/env node
// Boot a profile that already ran `dsh plugin --profile <name> add <checkout>`
// and fail unless dsh-pstack's skill provider lists the required skills.
// There is no dsh flag that prints the skill catalog; `dsh --help` only offers
// plugin (pnpm) and --dump-config. This uses the public profile-boot export.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const profile = process.env.DSH_PROFILE ?? 'ci'
const required = ['poteto-mode', 'setup-pstack', 'deslop', 'control-cli', 'control-ui']

function dshPackageRoot() {
  const bin = execFileSync('sh', ['-c', 'command -v dsh'], { encoding: 'utf8' }).trim()
  if (bin === '') throw new Error('dsh is not on PATH')
  // npm links bin/dsh -> <package>/lib/bin.js
  return dirname(dirname(realpathSync(bin)))
}

if (process.env.DSH_HOME === undefined || process.env.DSH_HOME.trim() === '') {
  throw new Error('DSH_HOME must point at the home used for `dsh plugin add`')
}
if (process.env.DSH_AGENTS_HOME === undefined || process.env.DSH_AGENTS_HOME.trim() === '') {
  process.env.DSH_AGENTS_HOME = mkdtempSync(join(tmpdir(), 'dsh-agents-'))
}

const listCwd = mkdtempSync(join(tmpdir(), 'dsh-list-'))
const dshPkg = dshPackageRoot()
const { runProfile } = await import(pathToFileURL(join(dshPkg, 'lib/profile-boot.js')).href)
const { loadLayeredEnv } = await import(pathToFileURL(join(dshPkg, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')).href)

let code = 0
let shutdown
try {
  const booted = await runProfile({
    environment: loadLayeredEnv('dsh', listCwd),
    profile,
    patchFiles: [],
    args: [],
  })
  shutdown = booted.shutdown
  const bundles = booted.ctx.get('profileContext')?.startedBundles ?? []
  console.log(`started bundles: ${bundles.join(', ')}`)
  if (!bundles.includes('dsh-pstack')) {
    console.error('profile did not mount dsh-pstack')
    code = 1
  }
  if (typeof booted.ctx.skills?.list !== 'function') {
    console.error('profile booted without a skill registry')
    code = 1
  } else {
    const skills = await booted.ctx.skills.list({ cwd: listCwd })
    const pstack = skills.filter((skill) => skill.provider === 'pstack').map((skill) => skill.name).sort()
    console.log(`pstack skills (${pstack.length}):`)
    for (const name of pstack) console.log(name)
    const missing = required.filter((name) => !pstack.includes(name))
    if (missing.length > 0) {
      console.error(`missing required pstack skills: ${missing.join(', ')}`)
      code = 1
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  code = 1
} finally {
  if (shutdown !== undefined) {
    try {
      await shutdown.shutdown(code)
    } catch (error) {
      console.error(error instanceof Error ? error.stack ?? error.message : error)
      code = 1
    }
  }
}
process.exit(code)
