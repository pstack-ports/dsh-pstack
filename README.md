# pstack

i'm [poteto](https://x.com/poteto). i'm not a president or ceo, but i've worked with millions of lines of code at Meta, Netflix, and Cursor. i'm also on the react core team where i help build and maintain react compiler.

there's a growing sense that ai writes too much slop code. i agree. i don't want to ship like a team of twenty slop artists. throughput without quality is not a goal i aspire to. if you want to go fast, go deep first. 

**pstack is my answer.** these are the same skills i use every day to ship high quality code at Cursor. this is the DeepSeek Harness port, and it turns DSH into a real engineering team. the goal is not to maximize loc, in fact it's the opposite. pstack helps you write less, but higher quality code.

**pstack gives you fearless parallelism.** when you can go deep on one agent and trust it to write good, verifiable code, you can truly parallelize with confidence. start multiple agents up with `poteto-mode` and trust that they'll apply rigorous engineering principles to their work.

**DSH gives you the best of all worlds.** every frontier model has its strengths and weaknesses. use any model with pstack. when you turn on DSH subagent model selection, many of my skills use multi-route workflows to take advantage of each model's unique strengths.

fork it. improve it. make it yours. PRs are welcome! 

## install

this repository is a DSH plugin bundle, and the same skills work as plain Agent Skills.

### as a DSH plugin

```bash
dsh plugin --profile web add /absolute/path/to/dsh-pstack
dsh --profile web
```

from a git checkout or GitHub:

```bash
dsh plugin --profile web add "github:pstack-ports/dsh-pstack"
dsh --profile web
```

`dsh plugin add` installs the package, and because it declares `dsh.bundle`, the same command appends `dsh-pstack` to the profile's bundle list. restart the profile to load the bundle. after that, `dsh-pstack` appears under Settings → Plugins, and every pstack skill appears in the `/` menu. only `/setup-pstack`, `/deslop`, `/control-cli`, and `/control-ui` are model-invocable. the other skills are user-invoked, or read by `/poteto-mode` when a step needs one.

### as project or user skills

DSH discovers skills under `<project>/.agents/skills` and `~/.agents/skills`. open this repository as the project, or link the skill directories into a root DSH already scans:

```bash
mkdir -p "$HOME/.agents/skills"
for skill in .agents/skills/*/; do
  ln -sfn "$PWD/$skill" "$HOME/.agents/skills/$(basename "$skill")"
done
```

do not copy a parent directory that contains all the skills. DSH discovers a skill one level deep, as `<root>/<name>/SKILL.md`.

## compatibility

DSH mounts a bundle only when the plugin's `@deepseek-ai/dsh*` peer requirements match the running runtime. this package peers on `@deepseek-ai/dsh-skill@^0.2.1-rc.2`, so it loads on 0.2.1-rc.2 and later 0.2.x builds. on 0.3 and later it is skipped — the whole layer, not part of it — until a newer pstack ships:

```
dsh: skipping profile bundle "dsh-pstack": Plugin dsh-pstack@0.15.33 is incompatible with dsh 0.3.0: requirements {"@deepseek-ai/dsh-skill":"^0.2.1-rc.2"}. Running it may cause crashes or data loss. ...
```

the problem is the version pair, not the install. upgrade pstack, or approve that exact pair and restart:

```bash
dsh plugin --profile web allow-version dsh-pstack@0.15.33 --dsh-version 0.3.0 --accept-risk
dsh plugin --profile web version-exemptions
```

`allow-version` stores the pair in `$DSH_HOME/profiles/<profile>/compatibility.json` and covers only that pair; the plugin manager offers the same grant in its UI.

two things that look like bugs but are not:

- DSH reads `package.json` — `dsh.bundle.patch`, `icon`, and `engines.dsh` when present. it does not read `plugin.json`; that manifest is for other agent-plugin ecosystems.
- the `@deepseek-ai/*` peers come from the DSH installation, not from this package, so install it with `dsh plugin add`. a standalone `npm install` will not resolve them.

## get started

two steps:

1. run [`/setup-pstack`](./.agents/skills/setup-pstack/SKILL.md). it detects the routes DSH allows, asks for a reasoning budget, writes `~/.agents/pstack-models.md`, and checks the Subagent settings.
2. use [`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) whenever you're doing anything that requires rigor.

new here? the [pstack guide](./docs/guide/README.md) walks you through a first real task, from setup and prompting through verification and overnight runs. stuck, or unsure which skill fits? ask [`/poteto-help`](./.agents/skills/poteto-help/SKILL.md).

that's it. the other skills are situational, and the mode skill uses them for you as needed. out of the box every role inherits the parent model. turn on **Plugins → Subagent → models agents may choose**, add the exact routes you want, and rerun [`/setup-pstack`](./.agents/skills/setup-pstack/SKILL.md) to split code, judgment, and the review panels across them.

## usage

use [`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) at the start of a task. it reads your request, picks from a set of playbooks, and runs the other skills as the steps need them.

pick `/poteto-mode` from the `/` menu before you type your task, so DSH attaches the skill to the message.

### just use [`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md)

this skill is the main shortcut. i use it whenever i need the agent to do rigorous engineering work. it comes with twenty-three playbooks:

```
/poteto-mode this pr has a subtle bug where the scroll drifts every 750ms even when idle. repro
first, then fix and verify.
```

```
/poteto-mode i'm going to bed. land the stack even if ci flakes. i want everything merged by
morning.
```

<details>
<summary>the twenty-three playbooks</summary>

| playbook | for |
|---|---|
| [investigation](./.agents/skills/poteto-mode/playbooks/investigation.md) | a read-only question. how does x work, why was y built this way, are we sure. |
| [bug fix](./.agents/skills/poteto-mode/playbooks/bug-fix.md) | reproduce a defect, root-cause it, and fix with runtime evidence. |
| [perf](./.agents/skills/poteto-mode/playbooks/perf-issue.md) | trace a measured slowness and improve it against a baseline. |
| [hillclimb](./.agents/skills/poteto-mode/playbooks/hillclimb.md) | sustained, scientific improvement of one metric against a target, looping hypotheses with before/after measurement and one commit per accepted win. |
| [runtime forensics](./.agents/skills/poteto-mode/playbooks/runtime-forensics.md) | diagnose a live symptom (leak, idle-cpu spin, glitch) from instrumentation. |
| [trace forensics](./.agents/skills/poteto-mode/playbooks/trace-forensics.md) | diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot). |
| [feature](./.agents/skills/poteto-mode/playbooks/feature.md) | new or changed behavior, built from a named data shape. |
| [refactoring](./.agents/skills/poteto-mode/playbooks/refactoring.md) | a behavior-preserving change to structure or shape. |
| [prototype](./.agents/skills/poteto-mode/playbooks/prototype.md) | a throwaway sketch to make a design or behavioral decision cheaply, or to settle an empirical fork by observing it. |
| [visual parity](./.agents/skills/poteto-mode/playbooks/visual-parity.md) | pixel-exact ui equivalence between two implementations. |
| [authoring a skill](./.agents/skills/poteto-mode/playbooks/authoring-a-skill.md) | writing or editing a SKILL.md. |
| [eval](./.agents/skills/poteto-mode/playbooks/eval.md) | test how a skill or prompt change affects agent behavior, blinded. |
| [babysit](./.agents/skills/poteto-mode/playbooks/babysit.md) | drive a pr or a stack to merge-ready: conflicts, review threads, ci. |
| [shipping](./.agents/skills/poteto-mode/playbooks/shipping.md) | independently verify a green stack, then land the contiguous verified run bottom-up through github by default or origin when available. |
| [autonomous run](./.agents/skills/poteto-mode/playbooks/autonomous-run.md) | drive a long task to completion without stopping. |
| [orchestrate](./.agents/skills/poteto-mode/playbooks/orchestrate.md) | a standing project handed to one coordinator chat: multi-day, many stacked prs, fleets of subagents. |
| [autopilot-full](./.agents/skills/poteto-mode/playbooks/autopilot-full.md) | run independent prs to merged with one owner per pr. a swarm verifies each code-ready head, and every later change to the patch gets a fresh check. |
| [autopilot-stack](./.agents/skills/poteto-mode/playbooks/autopilot-stack.md) | build and verify one linear base-branch stack for the operator to review and land. |
| [session pickup](./.agents/skills/poteto-mode/playbooks/session-pickup.md) | resume or take over a prior agent's in-flight work. |
| [pause safely](./.agents/skills/poteto-mode/playbooks/pause-safely.md) | suspend in-flight work cleanly so it can be resumed later. |
| [multi-phase plan](./.agents/skills/poteto-mode/playbooks/multi-phase-plan.md) | work that spans phases or stacked PRs. |
| [worktree cleanup](./.agents/skills/poteto-mode/playbooks/worktree-cleanup.md) | reclaim disk by pruning merged or abandoned worktrees and stale ios simulators, safety-gated. |
| [opening a pr](./.agents/skills/poteto-mode/playbooks/opening-a-pr.md) | open a ready pr from small ordered commits with a conventional commits title and a briefing-style body. invoked at the end of every other playbook. |

</details>



when invoked it:

1. matches your task to a [playbook](./.agents/skills/poteto-mode/playbooks/) and calls `todo_write` with its steps as the first items, copied in verbatim.
2. routes to the other skills as the steps fire.
3. writes unslopped replies framed for the consumer and the maintainer.

the full rules and playbooks live in [`.agents/skills/poteto-mode/SKILL.md`](./.agents/skills/poteto-mode/SKILL.md).

DSH attaches a skill to one message. pick `/poteto-mode` at the start of each new task; the mode matches a fresh playbook when the subject changes.

[`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) works extremely well with a DSH goal. create one with `create_goal`, add `schedule_create` for a periodic tick, and let pstack work for many hours without sacrificing rigor.

## skills

[`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) runs most of these for you when a step needs them (`how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `unslop`, `no-comments`, `technical-writing`, `tdd`, and the principles). the table below is for when you want one directly:

```
/how do we cancel runs? do we have an n+1 when we look up every run to cancel?
```

```
/interrogate review this pr.
```

<details>
<summary>all skills</summary>

| skill | use it when |
|---|---|
| [`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) | default entry point for any non-trivial task. |
| [`/poteto-help`](./.agents/skills/poteto-help/SKILL.md) | you're new to pstack, or unsure which skill, playbook, or principle fits. finds out what you're trying to do, answers that part, and hands you a prompt to type. runs only when you type `/poteto-help`. |
| [`/in-your-own-words`](./.agents/skills/in-your-own-words/SKILL.md) | you want the agent to play back your goal and the problem before it starts. runs only when you type `/in-your-own-words`. |
| [`/sharpen`](./.agents/skills/sharpen/SKILL.md) | you want a prompt made deeper, not bigger, before you send it: what a top professional would do that you didn't ask for, the raw material they'd start from, their methods and tools, and an outside check that the result is right. hands back the rewritten prompt and leaves your choices open. doesn't do the task. runs only when you type `/sharpen`. |
| [`/how`](./.agents/skills/how/SKILL.md) | you want a walkthrough of how a subsystem works. |
| [`/why`](./.agents/skills/why/SKILL.md) | you want to know why something was built this way. discovers available MCPs at run time and queries each evidence category in parallel (source control, issue tracker, long-form docs, real-time chat, infra observability, error tracking, analytics warehouse). |
| [`/recall`](./.agents/skills/recall/SKILL.md) | you're starting or resuming work and want your recent context on a topic rebuilt from your own chat history and the shared record, handed back as a tight current-state brief. |
| [`/ketchup`](./.agents/skills/ketchup/SKILL.md) | you want what changed in this chat since your last message, in plain words and small visuals, with every item waiting on you listed and decidable from the reply alone, even when that makes the reply long. |
| [`/ketchup-video`](./.agents/skills/ketchup-video/SKILL.md) | you want the `/ketchup` catch-up as a short silent video of slides, with the calls waiting on you as text under it. |
| [`/blast-radius`](./.agents/skills/blast-radius/SKILL.md) | you have a small-looking change and want to know what else it could break, with the one fact it's safe because of proven by running code, not asserted. |
| [`/architect`](./.agents/skills/architect/SKILL.md) | you're about to write code that crosses a function boundary and want the caller's usage, types, and module shape settled first. |
| [`/arena`](./.agents/skills/arena/SKILL.md) | you want N parallel attempts at the same thing, then to grab the best parts of each. |
| [`/swarm`](./.agents/skills/swarm/SKILL.md) | you want N parallel workers across different slices or races, then one aggregated report. |
| [`/interrogate`](./.agents/skills/interrogate/SKILL.md) | you have a diff and want independent reviewers to try to break it, on different routes when configured, including a strict code-quality lens. |
| [`/automate-me`](./.agents/skills/automate-me/SKILL.md) | you want your own `-mode` skill, drafted from how you've actually worked. |
| [`/make-bot-ui`](./.agents/skills/make-bot-ui/SKILL.md) | you want a page or dashboard whose buttons wake a DSH headless run through a local server, including the credential handoff and Tailscale. |
| [`/setup-pstack`](./.agents/skills/setup-pstack/SKILL.md) | you want to pick which routes pstack uses per role and how deep delegation may nest. detects DSH's allowed routes and writes `~/.agents/pstack-models.md`. |
| [`/reflect`](./.agents/skills/reflect/SKILL.md) | a long task landed and you want the recipe captured as a skill edit. |
| [`/correct`](./.agents/skills/correct/SKILL.md) | you keep correcting agents for the same mistakes. mines history for mistake classes, fixes each at the highest level that works (architecture, then types, lint, and ci, then tests, with docs last), and keeps a table pairing each rule with what enforces it. |
| [`/teach`](./.agents/skills/teach/SKILL.md) | you want to actually understand a change or subsystem, not just have it summarized. runs how + why and weaves one plain explanation, built up diagram by diagram. |
| [`/tdd`](./.agents/skills/tdd/SKILL.md) | you're fixing a bug and there's a cheap local test path. write the failing test first, then the fix. |
| [`/benchmark-checklist`](./.agents/skills/benchmark-checklist/SKILL.md) | you ran a benchmark or measured a speedup or regression. vets the number (limiter, tuning, errors, repeat runs, end-to-end relevance) before you report or act on it. |
| [`/no-comments`](./.agents/skills/no-comments/SKILL.md) | strip comments before review; spawns Comment Sicko, fixes accepted findings, offers encodings for claimed constraints. |
| [`/typescript-best-practices`](./.agents/skills/typescript-best-practices/SKILL.md) | you're reading or editing typescript. grounds the type-system-discipline principle in syntax. |
| [`/figure-it-out`](./.agents/skills/figure-it-out/SKILL.md) | no bundled playbook fits. designs a rigorous, auditable playbook for the task. |
| [`/show-me-your-work`](./.agents/skills/show-me-your-work/SKILL.md) | you want a reviewable decision trail. logs decisions to a tsv you can commit. |
| [`/create-verification-skill`](./.agents/skills/create-verification-skill/SKILL.md) | your project has no scripted way to prove app behavior. generates a project-local verify skill with a feature map, for any language or platform. |
| [`/maintain-verification-skill`](./.agents/skills/maintain-verification-skill/SKILL.md) | your verify skill's feature map has drifted from the app. source wave + one live pass, at most one PR of proven corrections. |
| [`/create-formal-verification-skill`](./.agents/skills/create-formal-verification-skill/SKILL.md) | tests can't reach the case that breaks a race, retry, state machine, parser, or unsafe code. verifies one property with the tool that fits and generates a project-local skill to recheck it on every change. |
| [`/maintain-formal-verification-skill`](./.agents/skills/maintain-formal-verification-skill/SKILL.md) | code your formal verification covers has changed since it was last checked. updates the model, harness, or properties to match the code, reruns, and says whether each failure is drift in the verification or a bug in the code. |
| [`/statechart`](./.agents/skills/statechart/SKILL.md) | someone who owns the behavior needs to see it, not read a spec. draws what the user sees as a mermaid statechart generated from a tla+ model, marks each state works, still wrong, or fixed by your open pr, and draws each bug tlc finds as a numbered path. also turns an agreed chart into a tla+ skeleton, or audits the code against an existing spec. |
| [`/unslop`](./.agents/skills/unslop/SKILL.md) | you're cleaning up writing. removes AI tells. |
| [`/deslop`](./.agents/skills/deslop/SKILL.md) | remove AI-generated code slop and clean up code style. |
| [`/control-cli`](./.agents/skills/control-cli/SKILL.md) | build or adapt a local harness to drive, inspect, and profile an interactive CLI or TUI. |
| [`/control-ui`](./.agents/skills/control-ui/SKILL.md) | build or adapt a local browser/CDP harness to drive and inspect a web, IDE, or Electron UI. |
| [`/bro`](./.agents/skills/bro/SKILL.md) | you want the last message restated in plain human language, no jargon. |
| [`/technical-writing`](./.agents/skills/technical-writing/SKILL.md) | layered doc standard (Diátaxis + Google developer style + STE + Global English) for docs, RFCs, readmes, PR descriptions, commit messages. |

</details>



### examples

mostly i type [`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) at the start of a task and let it route to a playbook. the other skills fire as the steps need them. a few i reach for directly.


<details>
<summary>all the examples</summary>

```
bug fix:           /poteto-mode this pr has a subtle bug where the scroll drifts every 750ms even
                   when idle. repro first, then fix and verify.
perf:              /poteto-mode a big list takes a second or two to load even though we virtualize.
                   run a cpu trace and tell me why.
feature:           /poteto-mode build a small feature behind a feature flag. verify it really works.
prototype:         /poteto-mode build two prototypes of the markdown renderer so we can compare.
                   spawn an agent for each.
multi-phase:       /poteto-mode open source these skills as a plugin. nothing internal leaks, work
                   in a temp dir, show me the dependency graph first.
overnight run:     /poteto-mode i'm going to bed. land the stack even if ci flakes. i want
                   everything merged by morning.
babysit:           /poteto-mode check on pr 123. anything outstanding?
visual parity:     /poteto-mode the row spacing is too tall when this flag is on. the second image
                   is correct. repro and fix until it matches.
figure it out:     /poteto-mode i'm stepping away. migrate every caller from the synchronous store
                   to the new async one, keeping behavior identical. i want to trust it was done
                   right when i'm back.
how:               /how do we cancel runs? do we have an n+1 when we look up every run to cancel?
why:               /why is this feature flag not on yet?
architect:         design this instrumentation to be high signal with no false positives. /architect
                   this first.
arena:             /arena take my prompt to the arena verbatim. i want to compare their proposals
                   with yours.
swarm:             /swarm check every package under packages/ against its check.sh. one worker per
                   package. one report.
interrogate:       /interrogate review this pr.
tdd:               /tdd implement
unslop:            can we unslop and tighten the new changes?
reflect:           /reflect that took too long. capture what we learned so the next run doesn't
                   repeat it.
correct:           /correct
show-me-your-work: /show-me-your-work keep a decision trail i can review when i'm back.
automate-me:       /automate-me
help:              /poteto-help which skill should i use to review this branch?
```

</details>

## the `poteto-agent` and Comment Sicko prompts

[`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) runs in the chat that receives it. that chat owns the playbook, the todo list, and every subagent spawn.

pstack ships [the `poteto-agent` prompt](./.agents/skills/poteto-mode/references/poteto-agent.md) as the wrapper for delegates spawned during a run. read it and put its body at the top of the `subagent` prompt. it tells the child to read `poteto-mode` in full, including its inline principles index, before doing any work. substituting a bare subagent prompt skips that read and drifts. do not spawn a `poteto-agent` to run the playbook itself.

[`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) and the `poteto-agent` prompt route through the same wrapper.

pstack also ships [Comment Sicko](./.agents/skills/no-comments/references/comment-sicko.md), a read-only comment reviewer. put its body at the top of a read-only `subagent` prompt, or use [`/no-comments`](./.agents/skills/no-comments/SKILL.md), which does that for you.

DSH children inherit the parent's preset and MCP tools. they share this machine, so isolation comes from a git worktree passed as `cwd`. a child takes a different model only when DSH model selection is on and the `subagent` tool exposes `provider`, `model`, and `reasoning_effort`; otherwise it inherits the parent model.

## principles

twenty-four short skills, one principle each. `poteto-mode` indexes them inline and reads that index at task start. the standalone files are there so other skills can reference a principle by name, and so the index can point at the full rule for each.

<details>
<summary>all twenty-four principles</summary>

| principle | group | rule |
|---|---|---|
| [laziness-protocol](./.agents/skills/principle-laziness-protocol/SKILL.md) | core | Bias toward deletion and the smallest change that solves the problem. |
| [foundational-thinking](./.agents/skills/principle-foundational-thinking/SKILL.md) | core | Apply before writing logic: choosing core types and data structures, sequencing scaffold-vs-feature work, asking what concurrent actors share. Get the data structures right so downstream code becomes obvious. |
| [redesign-from-first-principles](./.agents/skills/principle-redesign-from-first-principles/SKILL.md) | core | Redesign as if the requirement had been a foundational assumption from day one, instead of bolting it on. |
| [attack-the-premise](./.agents/skills/principle-attack-the-premise/SKILL.md) | core | Apply when two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it. |
| [subtract-before-you-add](./.agents/skills/principle-subtract-before-you-add/SKILL.md) | core | Remove dead weight, redundant validators, and stub references first, then build on the simpler base. |
| [minimize-reader-load](./.agents/skills/principle-minimize-reader-load/SKILL.md) | core | Count layers between question and answer, and hidden state in the reader's head; collapse one-caller wrappers and shrink mutable scope. |
| [outcome-oriented-execution](./.agents/skills/principle-outcome-oriented-execution/SKILL.md) | core | Apply during planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture; don't preserve smooth intermediate states with throwaway compatibility code. |
| [experience-first](./.agents/skills/principle-experience-first/SKILL.md) | core | Choose user delight over implementation convenience; ship fewer polished features over more rough ones. |
| [exhaust-the-design-space](./.agents/skills/principle-exhaust-the-design-space/SKILL.md) | core | Build 2-3 competing prototypes and compare side by side before committing. |
| [build-the-lever](./.agents/skills/principle-build-the-lever/SKILL.md) | core | Apply to any non-trivial work, not just bulk work: edits, migrations, analyses, checks. Build the tool that does it or proves it (codemod, script, generator, or a skill your subagents follow) instead of working by hand. The tool is the artifact a reviewer can rerun. |
| [model-the-domain](./.agents/skills/principle-model-the-domain/SKILL.md) | architecture | Encode the domain in a structure instead of scattered conditionals. |
| [boundary-discipline](./.agents/skills/principle-boundary-discipline/SKILL.md) | architecture | Concentrate guards at system boundaries (CLI, config, network, external APIs); trust internal types and keep business logic in pure functions. |
| [type-system-discipline](./.agents/skills/principle-type-system-discipline/SKILL.md) | architecture | Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries, exhaust variants, derive from authoritative schemas. |
| [make-operations-idempotent](./.agents/skills/principle-make-operations-idempotent/SKILL.md) | architecture | Converge to the same end state regardless of partial prior runs. |
| [migrate-callers-then-delete-legacy-apis](./.agents/skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md) | architecture | Migrate callers and delete the old API in the same wave instead of preserving compatibility layers. |
| [separate-before-serializing-shared-state](./.agents/skills/principle-separate-before-serializing-shared-state/SKILL.md) | architecture | Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant. |
| [prove-it-works](./.agents/skills/principle-prove-it-works/SKILL.md) | verification | Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'. |
| [fix-root-causes](./.agents/skills/principle-fix-root-causes/SKILL.md) | verification | Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate. |
| [sequence-verifiable-units](./.agents/skills/principle-sequence-verifiable-units/SKILL.md) | verification | Apply to multi-step work (sweeps, migrations, runs of similar edits) and to how you stack commits and PRs. Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence proves itself to a reviewer. |
| [test-behavior-not-implementation](./.agents/skills/principle-test-behavior-not-implementation/SKILL.md) | verification | Apply when you write, change, or keep a test. Assert what the code's users can observe, so the test fails when that behavior breaks and keeps passing when only the internals change. |
| [explain-the-number](./.agents/skills/principle-explain-the-number/SKILL.md) | verification | Apply before you trust, report, or act on a number you measured: a speedup, a regression, a throughput, a latency, or an eval result. Find what limits it, and rule out that it measured something other than the work you think. |
| [guard-the-context-window](./.agents/skills/principle-guard-the-context-window/SKILL.md) | delegation | Route bulk to subagents; keep summaries in the main thread, not raw payloads. |
| [never-block-on-the-human](./.agents/skills/principle-never-block-on-the-human/SKILL.md) | delegation | Proceed, present the result, let the human course-correct after the fact; reserve confirmation for irreversible actions. |
| [encode-lessons-in-structure](./.agents/skills/principle-encode-lessons-in-structure/SKILL.md) | meta | Encode the rule as a lint, metadata flag, runtime check, or script instead of more text. |

</details>

## not shipped here

a few things `poteto-mode` references but doesn't bundle:

- `/create-skill` and `/loop` have no direct DSH equivalent. use the [authoring playbook](./.agents/skills/poteto-mode/playbooks/authoring-a-skill.md) for skill edits, and a DSH goal (`create_goal`) for repeated work. DSH also has no built-in `/autopilot` that watches a PR. inside `poteto-mode`, pr-status requests go to the [babysit playbook](./.agents/skills/poteto-mode/playbooks/babysit.md).

## why are there no planning skills?

DSH already has a great plan mode which works great with pstack. but personally, i don't believe in planning. the best spec is code. if you do want to make a plan, [`/poteto-mode`](./.agents/skills/poteto-mode/SKILL.md) covers it, but it's not a default.

## make it yours

`poteto-mode` is my style. you may not want exactly that.

type [`/automate-me`](./.agents/skills/automate-me/SKILL.md). it mines your recent transcripts, drafts a `<your-name>-mode` skill from how you've actually worked, and routes through pstack underneath. you keep pstack as the base and end up with your own routing skill alongside `poteto-mode`.

models are configurable too. type [`/setup-pstack`](./.agents/skills/setup-pstack/SKILL.md). it reads the routes DSH authorizes and writes `~/.agents/pstack-models.md`, mapping each role (code, judgment, the review panels) to a route and effort. every skill reads that file when it spawns a subagent and falls back to `inherit` when the file or line is absent, so you override only what you want.

when a default changes, a rule written before the change still pins the old route. delete those role lines, or delete the file, then run `/setup-pstack` again. a rerun keeps any role whose route differs from the default.

## automations

pstack also ships a dormant [benny automation pack](./automations/benny/). benny triages slack issue reports, then reproduces and fixes confirmed bugs with real ui evidence. its files are not registered as slash skills.

to set it up, point DSH at [`FOR_AGENTS.md`](./automations/benny/FOR_AGENTS.md). setup copies the pack into the target repository at `.agents/automations/benny/`, enables pstack there for shared skills, and keeps user configuration outside the copied pack.

benny was written for Cursor routines. DSH has no hosted routine runner, so the pack ships as reference instructions. drive it with `schedule_create` and `subagent`, or adapt the prompts to your own CI. the DSH port does not register benny's skills in the slash menu.

## license

MIT
