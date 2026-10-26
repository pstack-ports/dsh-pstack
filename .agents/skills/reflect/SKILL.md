---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's log. DSH stores sessions under `$DSH_HOME/sessions/<project-slug>/<session-id>/session*.jsonl.zstd`. Resolve the helper from this skill's parent directory: `../poteto-mode/scripts/session-log.sh`. With no argument it reads the current session. Do not read sessions from another project's slug; that crosses workspace boundaries and reads private chats from unrelated projects.

```bash
../poteto-mode/scripts/session-log.sh --list 10
```

Take the current session id from `$DSH_SESSION_ID` or the log with today's timestamp. Read it with `../poteto-mode/scripts/session-log.sh <id>`. The log is JSONL and may be compressed; the helper decompresses it. If no log is available, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three `subagent` calls. Reviewers inherit the parent's MCP tools, which they need to look up the tickets, chat threads, and observability traces the transcript references. Tell each reviewer not to modify files, skills, or commits.

Reviewers use the `reflect judgment, divergent, synthesizer` line for Judgment and Divergent, and `reflect tooling` for Tooling; the synthesizer uses `reflect judgment, divergent, synthesizer`. Read `~/.agents/pstack-models.md` when it exists; a missing file or line means `inherit`. If the `subagent` tool exposes `provider`, `model`, and `reasoning_effort`, pass the route and effort; otherwise omit them and the child inherits the parent model. Make all three reviewer calls in one assistant message. If DSH rejects a route, fall back to `inherit` and say so.

| Lens | Role line | Default route | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `inherit` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `inherit` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `inherit` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the session id or digest where marked. Reviewers return findings in their completion notice.

## 3. Synthesize

One `subagent` call with the `reflect judgment, divergent, synthesizer` route, `inherit` by default. It inherits MCP access and spot-verifies citations. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Never edit a skill inside an installed bundle. Before approval, show its destination, `.agents/skills/<skill>/` or `~/.agents/skills/<skill>/`. After approval, copy the skill folder there and edit the copy. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): follow the **authoring-a-skill** playbook at `../poteto-mode/playbooks/authoring-a-skill.md` and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): tune the frontmatter description with the same playbook's description guidance.
- `new skill via authoring playbook: <kebab-name>`: create the skill with that playbook. Do not invent the shape ad hoc.

Run `node scripts/validate.mjs` from the pstack repository on every touched pstack skill before declaring done. For another repo, validate its frontmatter and links by hand.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
