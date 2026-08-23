# Keep `base/utils.ts` as a public surface; type it at the call boundary

`Utils` (`parseValue`, `parseDataAttributes`) stays a module with a `window.Utils` global and its own docs page. Callers that need typed results wrap it locally — `embla.ts` has `readCarouselOptions<T>()` — instead of the kit folding the parser into its one heavy consumer.

## Context

The architecture review (2026-08-21, candidate #8) proposed deleting `base/utils.ts`: 88 lines, two functions, three delivery mechanisms (ES export, `window.Utils`, ambient declare) and only two internal consumers — a shallow module whose interface is as complex as its implementation. Its prescription was to move `parseDataAttributes` into `embla.ts` as a typed `readEmblaOptions`, turn the toaster's one `parseValue` call into a number parse, and delete the module, the global, and the ambient interface.

## Decision

The review's _defects_ are real and are fixed; its _remedy_ is not adopted.

Fixed: the four scattered `as …OptionsType` casts in `embla.ts` now go through one documented boundary (`readCarouselOptions<T>`); the toaster parses its `data-duration` as a number directly instead of running it through the polymorphic parser and narrowing after; the dead bare `declare const Utils` is gone (both consumers import it — only `Window.Utils` was load-bearing).

Kept: the module, the `window.Utils` global, and the docs page.

## Why the module stays

- **The deletion test fails.** Deleting `utils.ts` does not leave knowledge nowhere new — it concentrates data-attribute parsing inside `embla.ts`, where the _next_ component that wants attribute config cannot reach it without importing carousel internals. It has one internal consumer today only because 30 of 35 primitives are CSS-only.
- **It is on-thesis, not incidental.** The kit's philosophy is HTML-first: markup and data attributes drive behaviour, and `CONVENTIONS.scripts.md` instructs component authors to parse config with `Utils.parseDataAttributes(node, prefix)`. A consumer writing a component in that idiom needs the same parser to get the same coercion rules.
- **It is already published and documented** (`/docs/components/utils`). Removing it is a breaking API change for a published package, justified only if the surface were wrong to expose — and the point above says it isn't.

## Consequences

- The `parseValue` union return (`boolean | number | unknown[] | string`) is inherent to a polymorphic attribute parser and stays. Consumers that want one type should parse for that type directly, as the toaster now does.
- Each consumer owns its own typed boundary. If a second component grows attribute config, it wraps `parseDataAttributes` the way `embla.ts` does rather than widening `Utils`.
- Anyone re-reading the review should treat candidate #8 as closed by this record, not outstanding.
