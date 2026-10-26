---
name: setup-pstack
description: Configure pstack's per-role model routes and reasoning budgets for DSH, plus the delegation depth a multi-agent run needs. Detects the routes DSH authorizes, writes ~/.agents/pstack-models.md, and checks the Subagent settings. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write `~/.agents/pstack-models.md`, the file every pstack skill reads before it chooses a subagent route. DSH does not auto-apply this file, so skills read it with the `read` tool when it exists.

## Steps

### 1. Detect the routes DSH allows

DSH only lets a subagent pick a model when the user turns on model selection in **Plugins → Subagent → models agents may choose**, and adds exact provider/model routes there. Check for the `list_subagent_models` tool. If it exists:

1. Call it with no arguments to list providers.
2. Call it with each provider to list that provider's models and reasoning efforts.
3. Keep only routes it returns. Treat the returned provider ids, model ids, and effort ids as the only valid values.

If `list_subagent_models` is missing, model selection is off for this session. Tell the user how to turn it on, then offer two choices: enable it and rerun this step, or continue with every role on `inherit` (the parent model). Do not invent route ids.

The alias `inherit` is always valid and means "run this role on the parent chat model and pass no route fields."

### 2. Load current state

The default role table is step 5's shape. If `~/.agents/pstack-models.md` exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from the defaults. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Use `ask_user_question` with these four options. Name the current budget when the file records one. With no file, say `large` is the default.

- `unlimited - highest reasoning effort`
- `large - high reasoning effort`
- `medium - medium reasoning effort`
- `small - low reasoning effort`

**(b) Apply it.** Set the effort token of every non-`inherit` route to the highest available effort at or below the budget target. Effort ladders differ per model, so use the ids `list_subagent_models` reports for that exact route. If the route has no matching effort, use its nearest lower effort. If the route has no efforts at all, leave it bare. `inherit` does not change.

**(c) Pick two base routes.** Ask which detected route code delegates should use and which route judgment and prose should use. Offer `inherit` and every detected route. The defaults are `inherit` for both, which means "let the parent model do it". Panels use the two base routes as their starting seats.

**(d) Show the roles and confirm.** Show every role with its route or list of routes. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles. For panel roles (`arena runners`, `architect runners`, `interrogate reviewers`) the value is a list, and one subagent runs per entry, so the list length sets the count. `arena cross-judge pool` is also a list, and Arena selects one value from it that differs from the parent's route when possible. `swarm workers` is the default route for every worker unless a race or comparison assigns another route per arm.

### 4. Check the delegation limits

Open **Plugins → Subagent** and tell the user the two settings that decide whether pstack's larger workflows can run:

- `maxDepth` defaults to `1`. `/poteto-mode` delegates one level, which fits. `/orchestrate` nests a coordinator, sub-coordinators, and workers to depth 3. Raise it to at least 3 before an orchestrate run.
- `maxActiveSubagents` defaults to `8`. A swarm, autopilot queue, or orchestrate run often needs more live children. Raise it to the size of the run you expect.

Do not change these yourself. Report the current values if the settings page shows them, and say which runs need a change.

### 5. Write the rule

Write `~/.agents/pstack-models.md` with a `# budget` line, a short format note, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to `inherit`.
# Format: role: provider/model[@effort], or inherit. Panel roles are comma-separated lists.
# DSH only applies a route when the subagent tool exposes provider, model, and reasoning_effort.
# budget: large
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
hardest tasks: inherit
how explorer: inherit
how explainer: inherit
why investigators: inherit
why synthesizer: inherit
reflect tooling: inherit
reflect judgment, divergent, synthesizer: inherit
arena runners: inherit
arena cross-judge pool: inherit
swarm workers: inherit
architect runners: inherit
interrogate reviewers: inherit
```

### 6. Confirm

Tell the user the rule was written. Say that pstack skills read it when they spawn subagents, that a new value applies on the next spawn, and that a missing file or a missing line means `inherit`. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, read `../create-verification-skill/SKILL.md` from this skill's directory and follow it. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, read `../create-formal-verification-skill/SKILL.md` from this skill's directory and follow it. On no, move on without pushing.
