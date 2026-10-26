# pstack in DeepSeek Harness

pstack still uses the names it inherited from Cursor. DSH provides the same capabilities under different tools, so read this file once per session and map each Cursor name with the tables below. `<pstack>` means the directory that holds `.agents/skills/`.

If a Cursor field has no row, drop it. Never pass a field the tool schema rejects.

## Tools

| Cursor | DSH |
| --- | --- |
| `Task` | `subagent` for a fresh child, `subagent_fork` when the child needs this conversation, `workflow` for a large fan-out with structured results. |
| `AskQuestion` | `ask_user_question`. |
| Open a todolist | `todo_write`. Update item status as you work. |
| Run another pstack skill (`/name` or "the **name** skill") | If the skill is model-invocable, call the `skill` tool with its name. Most pstack skills set `disable-model-invocation: true`, so the model cannot load them that way. Read `<pstack>/<name>/SKILL.md` and follow it. When you tell the user to type it, write `/name`; DSH's `/` menu lists every user-invocable skill. |
| `read_file`, `view_file` | `read`. |
| `write_file`, `write_to_file` | `write`. |
| `edit_file`, `replace_file_content`, `multi_replace_file_content` | `edit`. |
| `run_command` | `bash` with `description`, `command`, and optional `workdir`. |
| `grep_search` | `grep`. |
| `find_by_name`, `list_dir` | `glob`, or `bash` with `ls`. |
| `search_web` | `web_search` with a `queries` array. |
| `read_url_content` | `web_fetch`. |
| `manage_task` | `todo_write`. |
| `manage_subagents` | `list_agents`, `send_message`, `interrupt_agent`. |
| `schedule` | `schedule_create`, `schedule_list`, `schedule_update`, `schedule_delete`. |
| `generate_image` | No direct DSH tool. Use a project tool or say the step is unsupported. |
| `notebook_edit` | `edit`. |

A pstack skill that names another pstack skill by name (`how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `reflect`, `unslop`, `no-comments`, `technical-writing`, `tdd`, and the principles) means: read that skill's `SKILL.md` from the same `.agents/skills` root and follow it.

## Subagent fields

| Cursor | DSH |
| --- | --- |
| `subagent_type: generalPurpose` | `subagent`. |
| `poteto-agent` | Put the body of `.agents/skills/poteto-mode/references/poteto-agent.md` at the top of the `subagent` prompt. |
| `comment-sicko` | Put the body of `.agents/skills/no-comments/references/comment-sicko.md` at the top of the `subagent` prompt. |
| `readonly: true` | No read-only subagent mode. Say "do not modify files or remotes" in the prompt, and check `git status` afterward. |
| `readonly: false` | The default. The child inherits the parent's preset and MCP tools. |
| `environment: "cloud"` | Create a git worktree with `bash` and pass its path as `cwd`. DSH children run on this machine. |
| `environment: "local"` | Omit `cwd` so the child inherits the parent's working directory. |
| `cloud_base_branch: <b>` | Fetch `<b>` and create the worktree from that ref. |
| `run_in_background: true` | Omit. Delegation is asynchronous; the call returns a child id and the result arrives in a completion notice. |
| `resume` | `send_message` to a resident child. Prefer a fresh `subagent` with consolidated scope. |
| `file_attachments` | List the paths in the prompt. |
| `model: <slug>` | Pass `provider`, `model`, and `reasoning_effort` only when the `subagent` tool exposes them. Otherwise omit them. |
| `subagent_type: "research"` | A `subagent` whose prompt says it is read-only and must not write. |

`maxDepth` defaults to `1`, so a child cannot delegate further. Raise it in **Plugins → Subagent** for orchestrate, which nests to depth 3. `maxActiveSubagents` defaults to `8`; raise it for a large swarm.

## Models and routes

Cursor's `~/.cursor/rules/pstack-models.mdc` does not exist in DSH. The route file is `~/.agents/pstack-models.md`, and DSH does not auto-load it. Read it with the `read` tool when it exists.

| Cursor | DSH |
| --- | --- |
| A model slug such as `claude-opus-5-5-xhigh` or `grok-4.7-xhigh-fast` | A `provider/model` route plus an optional `reasoning_effort`, if the `subagent` tool exposes those fields. |
| `auto`, `inherit-parent`, `inherit` | Omit `provider`, `model`, and `reasoning_effort`. The child inherits the parent model. |
| The `pstack-models.md` rule | `~/.agents/pstack-models.md`, read on demand by each skill. |
| A role value that is a list | One `subagent` per entry. The list length is the panel size. |

DSH only accepts a route when the user turns on **Plugins → Subagent → models agent may choose** and adds exact routes there. With model selection off, the `subagent` tool has no route fields, every role behaves as `inherit`, and pstack still gets independent contexts and the full workflow. Use `list_subagent_models` to discover the allowed routes and their efforts when it is available.

## setup-pstack

DSH's setup skill differs from Cursor's in three ways:

- **Detect.** Use `list_subagent_models` if it exists. If it does not, say model selection is off and offer to continue with `inherit` for every role.
- **Write.** Write `~/.agents/pstack-models.md` as plain Markdown. DSH does not apply it automatically, so a skill must read it before a spawn.
- **Limits.** Check `maxDepth` and `maxActiveSubagents` in Plugins → Subagent. Raise `maxDepth` to at least 3 for orchestrate, and size `maxActiveSubagents` for the swarm or queue.

## Paths

| Cursor | DSH |
| --- | --- |
| `.agents/skills/`, `~/.agents/skills/` | `.agents/skills/` in the project, `~/.agents/skills/` for the user, `~/.dsh/skills/` for DSH-specific skills. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | An installed bundle under the profile's `node_modules`, declared by `package.json` and `cordis.patch.yml`. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md` files, which DSH loads automatically. The pstack route file is separate and read on demand. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | Session logs under `$DSH_HOME/sessions/<project-slug>/<session-id>/session*.jsonl.zstd`. Use `.agents/skills/poteto-mode/scripts/session-log.sh` to list, search, or decompress one. The project slug is the cwd with its leading slash removed, every `/` replaced by `-`, wrapped in `--`. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `https://github.com/pstack-ports/dsh-pstack/blob/main/<path>`. |

## Cursor-only features

DSH has no Cursor Automations, Bugbot, cloud agents, custom modes, `/loop`, or `/create-skill`. When a step needs one, put one line in your reply, `Skipped in DSH: <step>. <reason>.`, then continue. Do not stop, ask, or retry.

| Cursor | DSH |
| --- | --- |
| Custom Modes | DSH attaches a skill to one message. Start each new task with `/poteto-mode`, or create a goal for a long run. |
| `/loop` | `create_goal` for the run, and `schedule_create` for a periodic tick. |
| `/create-skill` | The [authoring playbook](../../.agents/skills/poteto-mode/playbooks/authoring-a-skill.md). |
| Cursor Automations: routines, `update_state`, `api2.cursor.sh` webhooks, routine wakes, `SendToUser` secret requests | `schedule_create` plus `subagent`, or the local server in [`/make-bot-ui`](../../.agents/skills/make-bot-ui/SKILL.md). |
| Bugbot | Review-bot comments on a PR are ordinary review threads. Triage them with the forge command the step gives. |
| Cursor cloud agents | A git worktree passed as `cwd`. Skip a step that needs the cloud dashboard or a separate VM. |
| A built-in PR tool | Use the forge command the step gives, such as `gh pr create`. That is not a skip, so write no line. |
