---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

# Arena

Call `todo_write` with one item per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Pick the runners from the `arena runners` line in `~/.agents/pstack-models.md`. With no file or line, use two `inherit` seats and say the panel has no route diversity. If the `subagent` tool exposes `provider`, `model`, and `reasoning_effort`, pass each runner's route and effort; otherwise omit them. Spawn one `subagent` per entry in one assistant message. If DSH rejects a route, fall back to `inherit` and say so. If dropped seats leave fewer than two runners, add runners until there are two, or one when the line has one entry. Run each added runner on a remaining runner's route, or on `inherit` when none remain, and say so. Spawn more runners when the arena covers multiple design directions. Use the same route N times when the work is generation-bound rather than judgment-sensitive.
4. Give each candidate its own output location. For code, create a git worktree with `bash` (`git worktree add ../<repo>-arena-<n> -b <branch>`) and pass its path as the child's `cwd`. For files that are not repo edits, use `/tmp/arena-<slug>/candidate-<n>/`, per the **separate-before-serializing-shared-state** principle skill. DSH children share this machine, so `cwd` is the isolation boundary.

## Phase B: Fan out

Make all N `subagent` calls in one assistant message. Each prompt has the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected. Passing a worktree path as `cwd` keeps the candidates from overwriting each other.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, choose one route from the `arena cross-judge pool` line in `~/.agents/pstack-models.md`. Try only entries that differ from the parent's route, in pool order. An `inherit` entry is the parent model, so it never judges. If the `subagent` tool rejects a route, move to the next entry. If no different route runs, skip the judge, pick the base alone in Phase D, and say so. When a judge runs, spawn one judge `subagent` with a read-only prompt and that route. It sees the rubric and the candidates by path label, scores each criterion, and recommends a base with rationale. It runs in parallel with your reading in Phase D. Don't spawn it while candidates are still writing.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when Phase C ran one. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict or that Phase C skipped the judge, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
