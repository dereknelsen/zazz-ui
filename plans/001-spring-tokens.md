# 001: Make the default easing a real spring and restore it

- **Commit:** 46e11fe, plus uncommitted edits to `_variables.css` (apply on the working tree, not on a clean checkout)
- **Severity:** HIGH
- **Category:** Easing & duration
- **Estimated scope:** 5 files, ~30 lines, plus regenerated editor data

## Problem

`@supports (transition-property: linear(0, 1))` is false in every engine, because `transition-property` takes property names rather than easing functions. `--spring-easing` therefore never applies, and every default transition runs on the bezier fallback.

The curve behind it is a strong ease-out, not a spring. Its 333ms runs past both budgets from the _Animations on the Web_ course: ~300ms for product UI and 150–250ms for popovers and selects. The fallback bezier does not match it (max error 0.152 against the target spring).

## Where

| File                                    | Lines   | What's there                                 |
| --------------------------------------- | ------- | -------------------------------------------- |
| `packages/core/src/base/_variables.css` | 464–489 | Curve, fallback, duration, `@supports` block |
| `skills/zazz/references/tokens.md`      | 171–172 | Documents `~0.333s`                          |
| `skills/zazz/DESIGN.md`                 | 524     | Documents 0.333s and the old bezier          |
| `skills/zazz/SKILL.md`                  | 211     | Claims the spring overshoots                 |

### Current code

```css
/* packages/core/src/base/_variables.css:479 */
--bezier-easing: cubic-bezier(0.17, 0.84, 0.44, 1);
--spring-duration: 0.333s;

/* falls back to cubic-bezier when linear() easing is unsupported */
--default-transition-timing-function: var(--bezier-easing);

@supports (transition-property: linear(0, 1)) {
  --default-transition-timing-function: var(--spring-easing);
}

--default-transition-duration: var(--spring-duration, 0.333s);
```

## Target

```css
--spring-easing: linear(
  0,
  0.005 1.1%,
  0.02 2.3%,
  0.044 3.6%,
  0.082 5.1%,
  0.16 7.7%,
  0.364 13.8%,
  0.462 16.9%,
  0.556 20.2%,
  0.637 23.4%,
  0.706 26.8%,
  0.766 30.1%,
  0.818 33.8%,
  0.861 37.5%,
  0.899 42%,
  0.93 46.9%,
  0.954 52.3%,
  0.971 58.6%,
  0.983 65.5%,
  0.991 73.8%,
  1
);
--bezier-easing: cubic-bezier(0.32, 0.66, 0.1, 1);
--spring-duration: 0.25s;

--default-transition-timing-function: var(--spring-easing);

@supports not (transition-timing-function: linear(0, 1)) {
  --default-transition-timing-function: var(--bezier-easing);
}

--default-transition-duration: var(--spring-duration);
```

**Why these values:**

- The stops sample `x(t) = 1 - (1 + wt)e^(-wt)` with `w = 9.233`: critically damped, zero bounce, starting from rest, within 0.1% of target at the end. Max error against the exact curve is 0.0021.
- 250ms keeps popovers and selects inside budget and puts tooltips at 125ms through their existing `/ 2`, with no per-primitive edits.
- The bezier is a least-squares fit to the spring (max error 0.033).

| Curve         | Progress at frames 1 / 2 / 3 / 4 / 6 | ms to 50 / 90 / 99% |
| ------------- | ------------------------------------ | ------------------- |
| Before, 333ms | .20 .44 .61 .74 .88                  | 39 / 109 / 216      |
| After, 250ms  | .13 .35 .55 .70 .88                  | 45 / 105 / 180      |

## Conventions to follow

- Timing tokens live in `_variables.css`; primitives derive from `--default-transition-duration` by multiplier. Do not add per-primitive durations.
- `first-style.browser.test.ts` covers the one-frame `0s` hold. It must keep passing.

## Steps

1. Add a browser test that a button's computed `transition-timing-function` starts with `linear(`, and confirm it fails.
2. Apply the target values.
3. Run `vp run core#generate`, then `vp run --no-cache core#build`.
4. Correct the docs listed above.

## Out of scope

- The dialog's 150ms open delay: `command.css` documents it as deliberate "backdrop-first" behavior, and it still matches the new 150ms backdrop.
- A separate color/hover duration tier: not needed. The spring reaches 90% in 105ms, and 150ms `ease` reaches it in 93ms.
- Do not change any primitive's multiplier.

## Verification

**Build**

- [ ] `vp check` and `vp test` pass, including the browser suite.

**Behavior**

- [ ] A `data-ui="button"` computes a `linear(...)` timing function at `0.25s` in Chromium and WebKit.
- [ ] Open and close a popover rapidly: motion retargets instead of restarting.
- [ ] With `prefers-reduced-motion: reduce` emulated, durations compute to `0s`.

**Feel**

- [ ] Record popover, dialog, toaster, accordion, switch and tabs, then scrub frame by frame.
- [ ] Rewatch the recordings the next day.

## Notes

Derek decides from the recordings whether the softer first frames beat the old start.

The spring is declared first, with the bezier under `@supports not`, because `packages/core/scripts/language-data.ts` reads the first definition. The other order makes the docs and the language server name the fallback as the default.
