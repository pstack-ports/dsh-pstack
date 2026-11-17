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

The aliases `inherit`, `inherit-parent`, and `auto` are always valid and mean "run this role on the parent chat model and pass no route fields."

Map a skill default onto a detected route by family and effort. Opus 5.5, Fable 5.2, and Gemini 4 Carbon are the families the defaults name. Use a detected route only when its provider and model are that family. If none is detected, the role is `inherit`. Never write a route you have not confirmed.

### 2. Load current state

The default role-to-model mapping is the file shape shown in step 5 below. If `~/.agents/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `hardest tasks`, `architect runners`, `reflect tooling`, or `why investigators`, is from a retired role. Drop it.

A file without the `# defaults: 3` line comes from an older setup. That setup wrote a line for every role, so some of its values are old defaults, not choices. Before step 3, replace these values:

- An `arena cross-judge pool` list of exactly one Fable entry, one Opus entry, and one Gemini entry, in any order, takes the role's step 5 list. Fable and Opus are one vendor, so the Fable entry could judge only where the Opus entry also could. The same replacement applies to a list that is exactly three `inherit` entries, which was that panel written while model selection was off.
- A `# budget: unlimited` line becomes `large`, because no role runs above `xhigh`.
- If the file has no `# defaults: 2` line either, an old route is one whose model name starts with grok. An old route in `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, or `swarm workers` takes the role's step 5 default. In a panel role (`arena runners`, `arena cross-judge pool`, `interrogate reviewers`), a list of exactly one Opus entry and one old route, in either order, takes the role's step 5 list. In any other list, each old route becomes the detected Opus 5.5 route at high, fast, or `inherit` when that route is not detected.

Every other value is the user's choice and stays, including an old route in any other role and every `inherit`, `inherit-parent`, or `auto` value. Tell the user which values you replaced.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Use `ask_user_question` rather than free text. Offer these three options with these exact labels, and name the current budget when the file records one. With no file, say that `large` matches the skill defaults.

- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit`, `inherit-parent`, `auto`). Families are the ones Phase A of the **arena** skill defines, so Fable is its own family. Each role has a target effort, which is its default's effort moved by the budget. `large` keeps it, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `xhigh` > `high` > `medium` > `low`, using the efforts `list_subagent_models` reports for that exact route. No role runs above `xhigh`, and a target at the bottom of the ladder stays there. Most defaults are at `xhigh`, and each budget label names where those land. Set the effort of every real route in the role, panel entries included, to the role's target. If the result is not a detected effort, use the same family's detected route with the highest effort at or below the target, else mark the role as needing a choice. `inherit`, `inherit-parent`, and `auto` do not change. Opus 5.5 always runs its fast variant when that route is detected. Fable 5.2 and Gemini have no fast variant, so never write one. Gemini tops out at `high`, so a Gemini entry runs at `high` when its role's target is `xhigh`.

The skill defaults, before the budget moves them:

- `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, and `judgment and prose`: Opus 5.5 at xhigh, fast.
- `arena runners` and `interrogate reviewers`: Fable 5.2 at high, Opus 5.5 at high, fast, and Gemini 4 Carbon at high.
- `arena cross-judge pool`: Opus 5.5 at high, fast, then Gemini 4 Carbon at high.
- `swarm workers`: Opus 5.5 at high, fast.

**(c) Show the roles and confirm.** Show every role with its route, marking any real route not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected routes at `xhigh` or below plus `inherit`, `inherit-parent`, and `auto` (all three mean: this role runs on the parent chat model) as the options. Use `ask_user_question`. For panel roles (arena runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values from a vendor other than the parent's, in list order, so order it by preference. Fable and the other Claude models are one vendor. An `inherit`, `inherit-parent`, or `auto` value never judges. `swarm workers` is the default route for every worker unless a race or comparison assigns another route per arm.

### 4. Check the delegation limits

Open **Plugins → Subagent** and tell the user the two settings that decide whether pstack's larger workflows can run:

- `maxDepth` defaults to `1`. `/poteto-mode` delegates one level, which fits. A run that nests workers under owners, such as autopilot, needs `maxDepth` above 1.
- `maxActiveSubagents` defaults to `8`. A swarm or autopilot queue often needs more live children. Raise it to the size of the run you expect.

Do not change these yourself. Report the current values if the settings page shows them, and say which runs need a change.

### 5. Validate

Every real route written must be in the detected set and at `xhigh` or below. `inherit`, `inherit-parent`, and `auto` always pass. If a chosen real route is not available, stop and ask again.

### 6. Write the rule

Write `~/.agents/pstack-models.md` with the `# defaults: 3` line, a `# budget` line with the chosen label and the effort that label names, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape, shown with `inherit` where model selection is off or no family route was detected:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# Format: role: provider/model[@effort], or inherit. Panel roles are comma-separated lists.
# `inherit`, `inherit-parent`, or `auto` as a value: the role runs on the parent chat model (omit provider, model, and reasoning_effort). Alias entries in a panel list still count toward its fan-out.
# DSH only applies a route when the subagent tool exposes provider, model, and reasoning_effort.
# No role runs above xhigh.
# defaults: 3
# budget: large (xhigh)
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
arena runners: inherit, inherit, inherit
arena cross-judge pool: inherit, inherit
swarm workers: inherit
interrogate reviewers: inherit, inherit, inherit
```

When a detected route matches a skill default, write that `provider/model` and effort in place of `inherit` on that seat.

### 7. Confirm

Tell the user the file was written. Say that pstack skills read it when they spawn subagents, that a new value applies on the next spawn, and that a missing file or a missing line means the skill default. Re-running this skill updates it.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, read `../create-verification-skill/SKILL.md` from this skill's directory and follow it. On no, move on without pushing.

### 9. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, read `../create-formal-verification-skill/SKILL.md` from this skill's directory and follow it. On no, move on without pushing.
