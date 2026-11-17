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
3. Pick the runners from the `arena runners` line in `~/.agents/pstack-models.md`, by default one seat each on Fable 5.2 at high, Opus 5.5 at high, fast, and Gemini 4 Carbon at high. An `auto`, `inherit-parent`, or `inherit` entry is the parent model, so omit `provider`, `model`, and `reasoning_effort`. Pass those fields only when the `subagent` tool exposes them. If the `subagent` tool rejects a route, use the nearest valid route of the same family or drop the seat, keep at least two runners, and say so. Families are Fable, other Claude, and Gemini, and the longest match wins. Any other route's family is its provider. Spawn more for multiple design directions, and repeat one route when the work is generation-bound, not judgment-sensitive. Pick each subagent's reasoning level per the Subagents section of the **poteto-mode** skill.
4. Give each candidate its own output location. For code, create a git worktree with `bash` (`git worktree add ../<repo>-arena-<n> -b <branch>`) and pass its path as the child's `cwd`. For files that are not repo edits, use `/tmp/arena-<slug>/candidate-<n>/`, per the **separate-before-serializing-shared-state** principle skill. DSH children share this machine, so `cwd` is the isolation boundary.

## Phase B: Fan out

Make all N `subagent` calls in one assistant message. Each prompt has the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected. Passing a worktree path as `cwd` keeps the candidates from overwriting each other.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After all Phase B candidates complete, spawn one read-only judge `subagent` from the `arena cross-judge pool` line in `~/.agents/pstack-models.md`, by default Opus 5.5 at high, fast, then Gemini 4 Carbon at high. The judge is never from the parent's vendor, and Fable counts as Claude for that check, so use the first entry from another vendor. A vendor is the route's provider. An `auto`, `inherit-parent`, or `inherit` entry is the parent model, so it never judges. If you do not know the parent's provider, use the first real route and say that the vendor check did not run. If the `subagent` tool rejects a route, use the nearest valid route of the same family, then the next such entry, or skip the judge, and say so. Tell the judge not to modify files. While you read in Phase D, the judge scores each candidate, by path label, on each rubric criterion and recommends a base.

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
