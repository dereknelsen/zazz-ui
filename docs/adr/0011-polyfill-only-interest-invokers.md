# Polyfill only Interest Invokers; drop the Popover and Invoker Commands polyfills

The head contract ships exactly one feature polyfill: `invokers@2.2.2/dist/esm/production/interest.js`, for Interest Invokers (`interestfor`). The Popover API and Invoker Commands (`command`/`commandfor`) are no longer polyfilled.

## Context

Since 0.1.0 the head loaded two polyfills: `@oddbird/popover-polyfill` and `invokers`' `compatible` build. Neither was recorded in an ADR, and both had drifted out of step with the platform — and with what the kit actually needs.

Measured against the repo's browser-support floor (latest Chrome, Firefox, and Safari, two versions back — as of 2026-09 roughly Chrome 153, Firefox 156, Safari 26.2, iOS Safari 26.4):

| API                    | Chrome | Firefox       | Safari | iOS Safari     | Below the floor?             |
| ---------------------- | ------ | ------------- | ------ | -------------- | ---------------------------- |
| Popover API            | 114    | 125           | 17.0   | 18.3           | no — Baseline since Jan 2025 |
| Invoker Commands       | 135    | 144           | 26.2   | 26.2           | no — Baseline since Jan 2026 |
| Interest Invokers      | 142    | ✗             | ✗      | ✗              | **yes — Chromium only**      |
| CSS anchor positioning | 151    | 147 (partial) | 27     | 26.0 (partial) | yes, but `@supports`-gated   |

Two findings drove the change:

1. **Both polyfills covered APIs that no longer need covering.** The popover polyfill self-gates (`"popover" in HTMLElement.prototype && "showPopover" in HTMLElement.prototype`) and so no-ops on every browser in the support window — 11 KB and a request to accomplish nothing. Its real cost was the `.\:popover-open` class hack it forced into 18 selectors and guards across 12 source files, since `:popover-open` cannot be polyfilled as a pseudo-selector.

2. **The one API that _is_ below the floor was never polyfilled at all.** The pinned `invokers` `compatible` build (217 KB) contains 63 occurrences of `commandfor` and **zero** of `interestfor`. `interestfor` is the tooltip's only trigger and the hover/focus-open path for menu, menubar, and navigation-menu — so tooltips were silently Chromium-only, while 217 KB shipped to polyfill `command`/`commandfor`, which every supported engine implements natively. The `interest` entrypoint in the same already-pinned package (15 KB) is what was wanted.

Anchor positioning is also below the floor, but no viable polyfill fits the CDN policy (ADR-0005 requires a pinned static file with an `sha384` hash); the components gate it behind `@supports` and fall back to UA-centered popovers, per the support policy's graceful-fallback clause.

## Decision

- `POLYFILLS` in `src/head.ts` holds one entry: the `invokers` `interest` build, loaded as a module tag ahead of `index.js`. Module scripts defer and execute in document order, so no `defer` attribute is needed.
- Remove `@oddbird/popover-polyfill` from the head, and strip `.\:popover-open` from every selector and `matches()` guard. `command.css` keeps `:where(:popover-open, [open])` — that branch is about the dialog form of the panel, not the polyfill.
- `head.test.ts` asserts the polyfill set is exactly the `interest` entrypoint and that the rendered head contains neither `popover-polyfill` nor `compatible.js`. The `not.toContain("compatible")` assertion is the point: `compatible` is the plausible-looking wrong file, and picking it is the bug this ADR fixes.
- Raise the recorded browser floor accordingly: the Popover API and Invoker Commands are now assumed native. This is a breaking change under the 0.x policy on two counts (polyfill-set change and browser-floor raise), so it ships as 0.4.0.

## Consequences

- Tooltips, and the hover-open path on menu/menubar/navigation-menu, start working in Firefox and Safari for the first time.
- Page weight drops ~213 KB across the two polyfill requests (228 KB → 15 KB), and the head goes from two polyfill tags to one.
- Browsers older than the floor lose popover behavior entirely rather than degrading: a closed `[popover]` keeps the UA's `display: none` and never opens. That is the accepted trade for the floor, not a regression against it.
- When `interestfor` reaches Firefox and Safari, this polyfill goes too and the kit ships none — worth re-checking at each release rather than carrying it indefinitely. It self-gates in the meantime: the module's top-level `applyInterestInvokers()` call checks for a native `interestForElement` property descriptor and returns without installing when it finds one, so Chromium keeps its own implementation and pays only the 15 KB request.
- `invokers` stays out of `package.json` dependencies: nothing in the kit's module graph imports it, so it needs no import-map entry — only the pinned script tag and its `sha384` hash.
