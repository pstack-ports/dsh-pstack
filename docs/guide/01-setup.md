# Set up pstack

In this page you install the bundle, pick which routes pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the bundle

From a checkout, add it to the profile you use:

```bash
dsh plugin --profile web add /absolute/path/to/dsh-pstack
dsh --profile web
```

From GitHub:

```bash
dsh plugin --profile web add "github:pstack-ports/dsh-pstack"
dsh --profile web
```

`dsh plugin add` edits the profile and installs the package. Restart the profile to load the bundle. `dsh-pstack` appears under Settings → Plugins, and the pstack skills appear in the `/` menu.

If you only want the skills, DSH also discovers `<project>/.agents/skills` and `~/.agents/skills`. Open this repository as the project, or link its skill directories into one of those roots. The [DSH adapter](../harness/dsh.md) covers the install shapes.

## Pick your routes

Run:

```text
/setup-pstack
```

DSH only lets a subagent pick a model when you turn on **Plugins → Subagent → models agents may choose** and add exact provider/model routes. [`/setup-pstack`](../../.agents/skills/setup-pstack/SKILL.md) checks for the `list_subagent_models` tool, reads the allowed routes, asks for a reasoning budget, shows you each role (code delegates, judgment, the review panels), and writes `~/.agents/pstack-models.md`. Every pstack skill reads that file when it spawns a subagent.

With model selection off, every role uses `inherit`, which means the child keeps the parent model. That still gives you independent contexts and the full workflow. Turn model selection on when you want a review panel or a code delegate on a different route.

The budget sets the starting effort. `unlimited` picks the highest effort the route advertises, `large` the next step down, and `medium` and `small` lower it further. The exact effort ids come from `list_subagent_models` for that route.

You only override what you care about. A role with no line in the file keeps `inherit`. To restore a default, delete that role's line. A rerun of `/setup-pstack` keeps any role whose route differs from `inherit`.

## Accept the verification offers, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../.agents/skills/create-verification-skill/SKILL.md).

Say yes and it writes `.agents/skills/verify-<app>/`, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to pstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Then setup offers once to generate a formal verification skill with [`/create-formal-verification-skill`](../../.agents/skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

After setup, start a new chat. The route file is read on the next spawn, and the Subagent depth and capacity settings apply to new delegations.

## Keep the cost in check

pstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/setup-pstack` and pick a smaller reasoning budget or cheaper routes. A strong model in the main chat with cheaper, faster routes in the code roles is a good split.
- Set a role to `inherit` so it runs on the chat's own model.
- Shorten a panel list. Each entry runs one subagent.
- Save `/poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. Its first items are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. DSH attaches a skill to one message, so pick `/poteto-mode` again when you start a new task. For a long run that should keep going without new messages, create a DSH goal with `create_goal` and let the agent work toward the predicate.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
