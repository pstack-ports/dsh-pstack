# dsh-pstack

This repository is the DeepSeek Harness port of pstack 0.15.32. The skills are the upstream pstack content, adapted to DSH tool names, subagent semantics, and session logs. `deslop`, `control-cli`, and `control-ui` are the exception: copied verbatim from cursor-team-kit 1.2.0 (MIT, Eric Zakariasson), and not adapted.

## Layout

- `.agents/skills/<name>/SKILL.md` holds every skill. DSH discovers this directory as a project skill root; `lib/index.js` serves the same tree when the package is installed as a profile bundle.
- `lib/` is the bundle's skill provider. `lib/parse.js` is the pure frontmatter reader used by tests.
- `cordis.patch.yml` inserts the `pstack` row into a profile. `package.json` declares the bundle through `dsh.bundle.patch`.
- `docs/guide/` is the user guide. `docs/harness/dsh.md` maps the Cursor names the upstream content inherited.
- `automations/benny/` is a dormant Slack triage and repro pack. It is not registered as a skill.

## Change rules

- Edit `.agents/skills`, `lib`, or `docs` directly. There is no generated copy.
- Keep skill frontmatter to `name`, `description`, `whenToUse`, `metadata`, `disable-model-invocation`, and `user-invocable`. `name` must match the directory.
- Use DSH names: `subagent`, `subagent_fork`, `workflow`, `send_message`, `list_agents`, `todo_write`, `ask_user_question`, `read`, `write`, `edit`, `bash`, `grep`, `glob`, `web_search`, `web_fetch`, `create_goal`, `schedule_create`.
- Do not reintroduce Cursor or Antigravity fields such as `subagent_type`, `environment`, `Workspace`, `TypeName`, `model` slugs, `~/.cursor`, or `~/.gemini`.
- Route guidance lives in `~/.agents/pstack-models.md`. A missing file or line means `inherit`. Pass `provider`, `model`, and `reasoning_effort` only when the `subagent` tool exposes them.
- DSH subagents share this machine. Isolate writers with a git worktree passed as `cwd`.

## Validate

```bash
npm install --omit=peer
npm test
```

`npm test` checks skill frontmatter, the poteto-mode principle and playbook indexes, relative Markdown links, the bundle manifest, and leftover Cursor/Antigravity tokens. CI also runs the shell and TypeScript script checks under `.agents/skills/poteto-mode/scripts`. The slow statechart integration suite runs in a separate scheduled job.
