# benny

benny gives you two DSH workflows for slack issue reports. one triages each report. the other reproduces confirmed bugs and may prepare a small draft fix.

the files in this directory are dormant setup and automation sources. they do not appear as slash skills.

## set it up

1. point DSH at [`FOR_AGENTS.md`](./FOR_AGENTS.md) and name the target repository.
2. let setup merge this whole directory into the target at `.agents/automations/benny/`. it must preserve destination-only files and review conflicts instead of overwriting local edits.
3. make pstack available to the target repository. install the `dsh-pstack` bundle in the profile that runs the jobs, or link the shared skills under the target's `.agents/skills/`.

4. keep user-owned configuration outside the copied pack, for example in `.agents/benny/`. adapt [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./.agents/skills/reproduce-and-fix-issues/references/feature-map.example.md).
5. commit `.agents/automations/benny/` and any secret-free configuration before enabling either job.
6. schedule each job with `schedule_create`, or run its prompt through `dsh headless` from your CI. DSH has no Slack event trigger, so the triage job polls the configured channel. send a harmless test report and verify every source-channel post stays in the original thread.
