# 002: Run the spinner at constant speed

- **Commit:** 46e11fe, plus uncommitted working-tree edits
- **Severity:** HIGH
- **Category:** Easing & duration
- **Estimated scope:** 2 files, ~10 lines

## Problem

`data-ui="spin"` uses `--default-transition-timing-function`, so each turn lurches forward and then stalls: on the spring curve at a 1s iteration, 99% of the turn is done by about 720ms. A spinner is constant motion, and constant motion takes `linear`.

## Where

| File                                              | Lines | What's there                              |
| ------------------------------------------------- | ----- | ----------------------------------------- |
| `packages/core/src/base/_switches.css`            | 82–89 | Comment and `spin` rule                   |
| `packages/core/src/base/switches.browser.test.ts` | 47–65 | Pins all four loops to the default easing |

### Current code

```css
/* packages/core/src/base/_switches.css:88 */
animation: ui-spin 1s var(--default-transition-timing-function) infinite;
```

## Target

```css
animation: ui-spin 1s linear infinite;
```

**Why this value:** a spinner has no start or end to ease toward. 1s stays as it is.

## Steps

1. Change the test so `spin` expects `linear` and `ping`, `pulse` and `bounce` keep the default easing. Confirm it fails.
2. Apply the target and update the comment.

## Out of scope

- `ping`, `pulse` and `bounce` timing.

## Verification

**Build**

- [ ] `vp test` passes, including `switches.browser.test.ts`.

**Behavior**

- [ ] With `prefers-reduced-motion: reduce` emulated, the spinner stops.

**Feel**

- [ ] The rotation shows no pulse at the end of a turn.
