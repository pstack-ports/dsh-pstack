---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

## Start

Call `todo_write` with one item per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Pick the worker route from the `swarm workers` line in `~/.agents/pstack-models.md`. Read `~/.agents/pstack-models.md` when it exists. Use the `swarm workers` line for the route, or `inherit` when the file or line is missing. If the `subagent` tool exposes `provider`, `model`, and `reasoning_effort`, pass that route and effort. If it does not, omit them and the child inherits the parent's model. Spawn one `subagent` per entry, all in one assistant message so they run concurrently. If DSH rejects a route, fall back to `inherit` and say so. For a route race, name each arm's route up front.
4. Give each worker its own writable output when it writes. For repo edits, create a git worktree per writer with `bash` and pass its path as `cwd`. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Make all N worker `subagent` calls in one assistant message, each with the step 3 route when the tool exposes route fields. DSH runs every child on this machine. Use a git worktree per writer and pass its path as `cwd`; use the parent's `cwd` only when the worker needs state that lives in this checkout, and say why in the brief.

When a worker must start from a non-default pushed branch, fetch it first and create the worktree from that ref.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

## Phase D: Report

Return one consolidated in-chat report with a result table, issue one-liners, gaps or dropouts, and the race rule when used.
