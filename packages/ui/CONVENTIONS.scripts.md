# Script conventions for `@zazzdesign/ui`

This document defines how to write and structure Zazz component scripts. Follow these rules when adding or editing `.ts` files in `src/`.

## Scope

Applies to all script files in `src/`. Shared runtime modules live in `src/base/`:

- `dialog-lifecycle.ts`
- `embla.ts`
- `navigation.ts`
- `reveal.ts`
- `signals.ts`
- `utils.ts`

Component scripts are co-located with their CSS and example HTML in `src/ui/<name>/`:

- `carousel/carousel.ts`
- `lightbox/lightbox.ts`
- `password-group/password-group.ts`
- `tabs/tabs.ts`
- `toaster/toaster.ts`

Scripts are authored in **TypeScript** but ship as browser-native **ES modules** — no bundler, no framework. `tsc -p tsconfig.json` emits a readable, unminified `<name>.js` (plus `.d.ts` and maps) next to each `.ts`, comments preserved; the emitted files are gitignored but published to npm and served raw — the docs site serves the tree at `/zazz/src/**` (e.g. `/zazz/src/ui/toaster/toaster.js`). Consumers load or copy the emitted `.js`. `src/index.ts` is the entry module: it `import`s every component script so a page loads behavior with one `<script type="module" src="…/index.js">` tag. When you add a script, add an `import "./ui/<name>/<name>.ts";` line to `src/index.ts`.

The compiler is configured in `tsconfig.json`: strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `rewriteRelativeImportExtensions`, declaration + declarationMap, in-place emit. Type check and run unit tests with `pnpm --filter @zazzdesign/ui test` (`tsc -p tsconfig.test.json` + `vp test run`; `*.test.ts` files are excluded from the build emit and the npm tarball); build with `pnpm --filter @zazzdesign/ui build` (tsc emit + `vp pack` single-file dist bundles). Ambient types for cross-script globals live in `src/globals.d.ts`.

---

## TypeScript conventions

### Philosophy

- **Browser-native modules.** No framework, no bundler — TypeScript in, native ES modules out. `erasableSyntaxOnly` keeps the emitted JS line-for-line close to the source: types erase, nothing else is transformed (one deliberate exception: `using` declarations — see [Scoped resources](#scoped-resources-using)). Cross-script dependencies use `import`; npm runtime dependencies (`signal-polyfill`, the Embla packages) are imported by bare specifier and resolved by the page's import map in browsers (pinned, SRI-checked jsDelivr URLs from `head.ts`) and by `node_modules` in tests/bundlers. No UMD globals, no script-tag-order contracts.
- **HTML-first.** Markup and data attributes drive behavior. Authors configure components in HTML; scripts discover and enhance the DOM.
- **Progressive enhancement.** Feature-detect APIs before use. When unsupported, degrade gracefully (e.g. `navigation.ts` falls back to full page loads).
- **Minimal surface area.** Export a small public API. Keep helpers private with `@private` JSDoc or class private fields (`#method`).

### File structure

Every script follows this layout:

1. `"use strict";` as the first line.
2. `@fileoverview` JSDoc block describing the module.
3. Implementation grouped with `// --- Section name ---` dividers in long files.
4. `import` statements for any sibling modules this script depends on — always with an explicit `.ts` extension (`rewriteRelativeImportExtensions` rewrites them to `.js` in the emit).
5. Auto-initialization block (when applicable).
6. `window` assignment for the public API, then a named `export`, at the bottom.

```typescript
"use strict";

/**
 * @fileoverview Module title.
 * @description What this module does.
 */

import { Dependency } from "../../base/dependency.ts"; // only when this module needs another

// --- Section name ---

function doWork() {}

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // ...
}

// Attach to window for the documented public API, then export for module consumers.
if (typeof window !== "undefined") {
  window.MyExport = MyExport;
}

export { MyExport };
```

### Module exports

Attach a named export object or class to `window` for the documented public API, then `export` it for module consumers (the `index.ts` entry and any sibling script that imports it).

| File                                  | Global                     | Export shape                                                                                                  |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `base/utils.ts`                       | `window.Utils`             | `{ parseValue, parseDataAttributes }`                                                                         |
| `base/signals.ts`                     | `window.Signals`           | `{ state, computed, effect }`                                                                                 |
| `base/reveal.ts`                      | `window.Reveal`            | `Reveal` class                                                                                                |
| `base/dialog-lifecycle.ts`            | _(none)_                   | Emits `zazz:dialog-open` / `zazz:dialog-close` on every `<dialog>` (ADR-0003) — the events are the public API |
| `base/embla.ts`                       | `window.EmblaInit`         | `{ init, initRoot, ... }`                                                                                     |
| `ui/carousel/carousel.ts`             | `window.UiCarouselElement` | `<ui-carousel>` element class                                                                                 |
| `ui/lightbox/lightbox.ts`             | `window.UiLightbox`        | `<ui-lightbox>` element class                                                                                 |
| `ui/password-group/password-group.ts` | `window.UiPassword`        | `<ui-password>` element class                                                                                 |
| `ui/tabs/tabs.ts`                     | `window.UiTabs`            | `<ui-tabs>` element class                                                                                     |
| `ui/toaster/toaster.ts`               | `window.Toaster`           | `Toaster` API + `<ui-toaster>`                                                                                |
| `base/navigation.ts`                  | _(none)_                   | Side-effect only; no export                                                                                   |

Document export objects with `@namespace` JSDoc and `@property` for each key.

### Auto-initialization

Scripts that enhance the page on load use a guarded auto-init block:

```javascript
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
```

- Check both `window` and `document` so the file is safe to evaluate in non-browser contexts.
- Handle `document.readyState === "complete"` by calling `init()` immediately.
- Make initialization **idempotent** — guard with attributes (`data-carousel-init`), flags (`initFn._bound`), or instance checks so re-running is safe.

`Reveal` additionally exposes `Reveal.disableAutoInit()` and `Reveal.getAutoInstance()` for manual control.

### HTML web components

Interactive components ship as **light-DOM custom elements** that augment existing markup (carousel.ts, lightbox.ts, password-group.ts, tabs.ts). They follow the [HTML web components](https://adactio.com/journal/20618) approach — wrap or replace the component's root element, never replace its content.

- **No shadow DOM, no templates.** Children are regular markup; all Zazz CSS applies unchanged.
- **Element names carry the `ui-` prefix** (`ui-carousel`, `ui-lightbox`, `ui-password`, `ui-tabs`, `ui-toaster`), matching the kit-wide dual-form naming (ADR-0001). A tag form exists only where the root would otherwise be a meaningless `<div>`/`<span>` — never wrap or replace a semantic native element ("the most semantic tag wins").
- **Lifecycle, not load events.** Set up in `connectedCallback()`, tear down in `disconnectedCallback()`. Elements work when inserted dynamically — no auto-init block needed.
- **Clean up with `AbortController`.** Bind listeners with `{ signal }` and abort on disconnect; disconnect `MutationObserver`s.
- **Guard registration:** `if (!customElements.get("tag-name")) customElements.define(...)` so double script loads are safe.
- **Custom elements are `display: inline` by default** — add a `display` rule in the component's stylesheet.
- **Degrade gracefully.** Without JS the markup must still render sensibly (a password field stays masked; tabs keep native radio behavior).
- **Element props are `data-*` attributes** (`data-label-show`, `data-label-hide`) — never bare attributes, even though the tag is its own namespace. One prop system across the kit.
- Attach the element class to `window` and `export` it like any other script.

### Reactive state (signals)

Zazz bets on the [TC39 Signals proposal](https://github.com/tc39/proposal-signals) for component state, via `signal-polyfill` wrapped by `base/signals.ts`.

- **`base/signals.ts` is the only file allowed to import `signal-polyfill`.** Components import `state`, `computed`, and `effect` from the wrapper, so an API shift (or native signals shipping) changes one file.
- **Division of labor:** DOM events and observers are _input adapters_ that write into `state`; `computed` holds _pure derived logic_ (the unit-testable part); `effect` is the _output adapter_ that writes back to the DOM. `effect` accepts an `AbortSignal`, so an element's existing controller tears reactive work down with everything else; its returned disposer also implements `Symbol.dispose`, so short-lived effects (tests, scoped work) can be bound with `using`.
- **Not everything is a signal.** Timers, transition choreography, and DOM construction stay imperative; the DOM remains the source of truth for element lists (HTML-first). A component with no derived state (e.g. `tabs.ts`) needs no signals at all.
- Tests live next to the module (`signals.test.ts`); run them with `pnpm --filter @zazzdesign/ui test`.

### Data-attribute configuration

Component scripts read configuration from HTML data attributes rather than JS options objects.

- Use a consistent prefix per component: `data-carousel-*`, `data-reveal-*`.
- Parse attributes with `Utils.parseDataAttributes(node, "data-carousel-")`, which converts kebab-case to camelCase and coerces types via `Utils.parseValue`.
- Document the full attribute reference in the file's `@fileoverview` block.
- Set lifecycle attributes on the DOM (`data-carousel-init`) so scripts can detect already-initialized elements.
- Keep the three attribute families straight (ADR-0002): **config props** (`data-carousel-*`, `data-reveal-*`) and **variant/state props** (`data-variant`, `data-size`, `data-side`, `data-align`, `data-orientation`, `data-position`) are bare-keyed and unprefixed; **interior parts** are `data-slot="{primitive}-{part}"` — a space-separated token list, always matched with `[data-slot~="…"]`. `ui-` prefixes things that _name_ Zazz (tags, classes, component tokens); attribute keys that carry values stay bare.

Boolean flags can be bare attributes (`data-carousel-autoplay`) or explicit values (`data-carousel-keyboard="false"`).

### Dependencies and load order

Scripts declare dependencies with ES `import`s, so the module graph resolves order — the entry module (`index.ts`, loaded as the emitted `index.js`) is the only tag a page loads.

| Script                                | Imports                                      | Notes                                                          |
| ------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `base/utils.ts`                       | —                                            | Provides `window.Utils`                                        |
| `base/signals.ts`                     | `signal-polyfill` (npm)                      | The **only** file allowed to import the polyfill               |
| `base/reveal.ts`                      | —                                            | Standalone                                                     |
| `base/dialog-lifecycle.ts`            | —                                            | Owns `<dialog>` visibility; components subscribe to its events |
| `base/embla.ts`                       | `base/utils.ts`, Embla (npm, via import map) | Imports Embla as ES modules; subscribes to `zazz:dialog-open`  |
| `ui/carousel/carousel.ts`             | `base/embla.ts`                              | `<ui-carousel>` calls `EmblaInit.initRoot`                     |
| `ui/lightbox/lightbox.ts`             | `ui/carousel/carousel.ts`                    | `<ui-lightbox>` coordinates carousel elements                  |
| `ui/password-group/password-group.ts` | `base/signals.ts`                            | Standalone (`<ui-password>`)                                   |
| `ui/tabs/tabs.ts`                     | —                                            | Standalone (`<ui-tabs>`)                                       |
| `ui/toaster/toaster.ts`               | `base/utils.ts`, `base/signals.ts`           | `<ui-toaster>` + `window.Toaster` toast API                    |
| `base/navigation.ts`                  | —                                            | App-level; inert in component preview iframes                  |

When a script needs `Utils`, `import { Utils } from "../../base/utils.ts"` (from a `src/ui/<name>/` folder) — do not duplicate parsing logic. Embla ships as real ES modules imported by bare specifier; the page's import map (generated by `head.ts`, pinned + SRI-checked) resolves them, so the module graph orders everything and pages load exactly one script tag.

### DOM interaction patterns

- **Query within scope.** Accept an optional root element (`initEmblaCarousels(scope)`) so init can target a subtree (e.g. an opened dialog).
- **Early returns for guards.** Check required elements and skip gracefully rather than throwing.
- **Store instances on DOM nodes** when external access is needed: `emblaNode._emblaApi = emblaApi`. Use a leading underscore to signal internal state.
- **Observe DOM changes** with `MutationObserver` when elements are hidden at init time (closed dialogs).
- **Delegate events** at `document` level when triggers can appear anywhere (`initEmblaStartLinks`).
- **Respect focus and input context.** Skip keyboard handlers when focus is in form fields or contenteditable elements.

### Classes vs functions

- Use a **class** when the module manages persistent instance state (`Reveal` with observers and config).
- Use **functions** for stateless init and helpers (`initEmblaCarousels`, `parseValue`).
- Use **private class fields** (`#observers`, `#getObserver`) for encapsulation.
- Use **`const` arrow functions** for callbacks and short helpers; **`function` declarations** for hoisted init functions called before definition in the file.

### Scoped resources (`using`)

Prefer a [`using` declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) (Explicit Resource Management) for **scoped acquire/release** — a resource acquired and released within one function scope, where the release must run at scope exit even when the code in between throws or returns early. Examples in the kit: temporarily unclamping toast heights for a batch measurement (`toaster.ts` `#reindex`), or a test-scoped `effect` (the disposer `effect()` returns implements `Symbol.dispose`, so `using dispose = effect(...)` tears it down at scope end).

```typescript
using _measure = unclampForMeasure(toasts); // restore runs at scope exit, throw or not
const entries = toasts.map((toast) => ({ node: toast, height: toast.offsetHeight }));
```

Rules:

- **TypeScript sources only — never in vanilla JS.** Safari has no native Explicit Resource Management, so `using` must not appear in docs snippets, example HTML, inline `<script>`s, or anything shipped uncompiled. In `.ts` sources it is safe: tsc (target ES2022) compiles `using` to plain try/finally.
- **Add the symbol fallback to every module that touches the protocol.** The compiled helpers (and `[Symbol.dispose]` method definitions) read `Symbol.dispose` at runtime and throw where it doesn't exist. Any file that declares `using` or creates a disposable carries this line after its imports:

  ```typescript
  (Symbol as { dispose: symbol }).dispose ??= Symbol("Symbol.dispose");
  ```

- **`using` is for same-scope cleanup only.** Cleanup that spans callbacks — element lifecycles from `connectedCallback()` to `disconnectedCallback()`, long-lived observers — stays on `AbortController` and explicit `disconnect()`; `using` cannot model it.
- **This is the one deliberate exception to line-for-line emit.** Files containing `using` gain tsc's injected `__addDisposableResource`/`__disposeResources` helpers (~50 lines) in the published `.js`. Reach for it where guaranteed cleanup earns that; don't scatter it decoratively.
- `erasableSyntaxOnly` permits `using` — it is JavaScript syntax, not TypeScript-only syntax. The types come from `"ESNext.Disposable"` in the tsconfig `lib`.

### Syntax and style

- Double quotes for strings.
- Semicolons required.
- Optional chaining (`?.`) and nullish coalescing where they simplify guards.
- `using` for scoped acquire/release in `.ts` sources — never in vanilla-JS snippets (see [Scoped resources](#scoped-resources-using)).
- Types live in TypeScript annotations, not JSDoc braces; ambient types for CDN and cross-script globals stay in `globals.d.ts`.
- **Erasable syntax only** — no enums, namespaces, or parameter properties; nothing that requires tsc to generate code (`erasableSyntaxOnly` enforces this). Use `import type` / `export type` for type-only imports (`verbatimModuleSyntax`).
- Import sibling modules with explicit `.ts` extensions — `rewriteRelativeImportExtensions` emits them as `.js`.
- Run `pnpm --filter @zazzdesign/ui test` after editing to validate types.

---

## JSDoc conventions

JSDoc here is prose documentation, not typing — types live in the TypeScript signatures, and the comments survive the emit (`removeComments: false`), so what you write is what consumers read in the published `.js`. For tags not covered here, see the [JSDoc tag reference](https://jsdoc.app/).

### Required rules

1. **Every JSDoc block must include `@description`.** Do not rely on a bare first line without the tag.
2. **Use JSDoc for all public API documentation** — file headers, classes, functions, interfaces, and export namespaces.
3. **Use inline `//` comments only for implementation notes** — guards, event binding, non-obvious logic. Never duplicate JSDoc content inline.
4. **Tag descriptions use a hyphen separator:** `@param name - Description.` No type braces — the type lives in the signature.
5. **Optionality and defaults live in the signature** (`options: RevealOptions = {}`), not in bracket notation — JSDoc carries only the prose.

### Tag order

Use this order when multiple tags apply:

```
@description
(extended prose, if any)
@param
@returns
@private
@see
@example
```

For file-level blocks, `@fileoverview` comes first, then `@description`, then `@see` / `@example`.

### Required vs optional tags

| Tag             | Required on                           | Notes                                                                |
| --------------- | ------------------------------------- | -------------------------------------------------------------------- |
| `@fileoverview` | Every file                            | Module-level summary                                                 |
| `@description`  | Every JSDoc block                     | One-line summary; extended prose below if needed                     |
| `@param`        | Functions with parameters             | Hyphen description only; the type lives in the signature             |
| `@returns`      | Functions that return a value         | Prose description; omit for `void` functions                         |
| `@private`      | Non-exported helpers                  | Module-scoped functions not on the export object                     |
| `@namespace`    | Export objects (`Utils`, `EmblaInit`) | Document each exported key with `@property` (name + prose, no types) |
| `@see`          | External references                   | MDN, library docs, related APIs                                      |
| `@example`      | Usage demonstrations                  | Runnable code or HTML snippets                                       |
| `@class`        | Classes                               | Optional; use with `@description` on the class block                 |

Config/option object shapes are TypeScript `interface`s, not `@typedef` blocks — give each field a `/** … */` doc comment (see the template below).

### Section dividers

In long files, use thin single-line markers to group related code:

```javascript
// --- Dot navigation ---
```

Do not use banner block comments (`/* ==== ... ==== */`).

### Templates

#### File header

```javascript
/**
 * @fileoverview Short module title.
 * @description What this module does and when to load it.
 *
 * Extended notes, attribute references, or architecture context.
 *
 * @see https://example.com/docs
 *
 * @example
 * <div data-feature="value">...</div>
 */
```

#### Function

```typescript
/**
 * @description One-line summary.
 *
 * Optional extended description.
 *
 * @param name - Parameter description.
 * @returns Return value description.
 * @private
 * @example
 * myFunction(arg);
 */
function myFunction(name: string): number {}
```

#### Class

```typescript
/**
 * @class
 * @description Initializes viewport entry animations.
 *
 * @example
 * const reveal = new Reveal();
 */
class Reveal {
  /**
   * @description Creates a new Reveal instance.
   *
   * @param options - Configuration options.
   */
  constructor(options: RevealOptions = {}) {}
}
```

#### Config interface

```typescript
interface RevealConfig {
  /** Margin around the root for IntersectionObserver. */
  margin: string;
  /** Visibility threshold (0–1) to trigger animations. */
  threshold: number;
}
```

#### Export namespace

```typescript
/**
 * @namespace Utils
 * @description Shared DOM and data-attribute parsing utilities.
 *
 * @property parseValue - Converts string values to typed values.
 * @property parseDataAttributes - Parses prefixed data attributes.
 */
const Utils = { parseValue, parseDataAttributes };
```

### Before and after

#### File header (navigation.ts)

**Before:**

```javascript
// SPA-like navigation without a framework, using the Navigation API.
// https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
```

**After:**

```javascript
/**
 * @fileoverview SPA-like navigation via the Navigation API.
 * @description Intercepts same-origin navigations and swaps `<main>` content
 * without a full page reload.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
```

#### Function (utils.ts)

**Before:**

```javascript
/**
 * Converts string values to their appropriate JavaScript types
 *
 * @param {string} value - The string value to convert
 * @returns {boolean|number|Array|string} - Converted value in appropriate type
 *
 * Examples:
 * parseValue("true") → true (boolean)
 */
```

**After** (types move into the signature):

```typescript
/**
 * @description Converts string values to their appropriate JavaScript types.
 *
 * @param value - The string value to convert.
 * @returns Converted value in the appropriate type.
 *
 * @example
 * parseValue("true"); // true
 * parseValue("42"); // 42
 */
function parseValue(value: string): boolean | number | unknown[] | string {}
```

#### Section divider (embla.ts)

**Before:**

```javascript
/* ===========================================================================
    DOT NAVIGATION HELPER FUNCTIONS
    =========================================================================== */
```

**After:**

```javascript
// --- Dot navigation ---
```

#### Private helper (embla.ts)

**Before:**

```javascript
/**
 * Creates dot buttons based on the number of carousel slides
 */
const addDotBtnsWithClickHandlers = () => { ... };
```

**After:**

```javascript
/**
 * @description Creates dot buttons for each slide and binds click handlers.
 *
 * @private
 */
const addDotBtnsWithClickHandlers = () => { ... };
```
