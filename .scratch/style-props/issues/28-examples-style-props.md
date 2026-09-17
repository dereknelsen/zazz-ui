# 28 — Hand-convert examples to style props

Type: task
Status: claimed
Blocked by: 17, 27
Size: M

## Context

Read first: [/SPEC.md](../../../SPEC.md), [spec.md](../spec.md) (frozen names + amendments), `docs/agents/issue-tracker.md`. Kit = `packages/core` (@zazz-ui/core), CLI = `packages/cli`. Follow `packages/core/CONVENTIONS.styles.md` / `CONVENTIONS.scripts.md`. Run `vp check` and the package's `vp test` before finishing.

## Files

- `packages/core/examples/{layout,responsive,products}.html`
- `packages/core/src/primitives/utilities/{padding,gap,width,size}.html`

## Task

Use the `zazz` skill. Where an example currently expresses an open value with a one-off inline style or an awkward class, convert it to a style prop (`style="--gap: 4; --grid-cols: 3; --grid-cols-md: 4"`); leave semantic classes (`p-md`, `gap-md`) where they fit — /SPEC.md §1 "value shape decides". Add a short style-prop demo to each of the four utility fragments (they are what the docs preview). Regenerate heads. Verify rendering with agent-browser at 600/900/1300px; nothing should look different except where you intentionally used a new capability — note those in the Answer.

## Answer

## Comments
