# Script conventions for `@zazz-ui/core`

This document defines how to write and structure Zazz component scripts. Follow these rules when adding or editing `.ts` files in `src/`.

## Scope

Applies to all script files in `src/`. Shared runtime modules live in `src/base/`:

- `dialog-lifecycle.ts`
- `embla.ts`
- `navigation.ts`
- `reveal.ts`
- `signals.ts`
- `utils.ts`
- `zazz-element.ts`

Component scripts are co-located with their CSS and example HTML in `src/primitives/<name>/`:

- `carousel/carousel.ts`
- `checkbox/checkbox.ts`
- `lightbox/lightbox.ts`
- `password-group/password-group.ts`
- `tabs/tabs.ts`
- `toaster/toaster.ts`

Scripts are authored in **TypeScript** but ship as browser-native **ES modules** without a bundler or framework. `tsc -p tsconfig.json` emits readable, unminified `<name>.js` files (plus `.d.ts` and maps) next to each `.ts`, with comments preserved. The emitted files are gitignored but published to npm and served raw: the docs site serves the `src/` tree at `/zazz/**` (e.g. `/zazz/primitives/toaster/toaster.js`). Consumers load or copy the emitted `.js`. `src/index.ts` is the entry module: it imports every component script so a page loads behavior with one `<script type="module" src=".../index.js">` tag. When you add a script, add an `import "./primitives/<name>/<name>.ts";` line to `src/index.ts`.

The compiler is configured in `tsconfig.json`: strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `rewriteRelativeImportExtensions`, declaration + declarationMap, in-place emit. Type check and run unit tests with `pnpm --filter @zazz-ui/core test` (`tsc -p tsconfig.test.json` + `vp test run`; `*.test.ts` files are excluded from the build emit and the npm tarball); build with `pnpm --filter @zazz-ui/core build` (tsc emit + `vp pack` single-file dist bundles). Ambient types for cross-script globals live in `src/globals.d.ts`.

---

## TypeScript conventions

### Philosophy

- **Browser-native modules.** No framework, no bundler: TypeScript in, native ES modules out. `erasableSyntaxOnly` keeps the emitted JS line-for-line close to the source: types erase, nothing else is transformed (one deliberate exception: `using` declarations; see [Scoped resources](#scoped-resources-using)). Cross-script dependencies use `import`; npm runtime dependencies (`signal-polyfill`, the Embla packages) are imported by bare specifier and resolved by the page import map in browsers (pinned, SRI-checked jsDelivr URLs from `head.ts`) and by `node_modules` in tests/bundlers. No UMD globals, no script-tag-order contracts.
- **HTML-first.** Markup and data attributes drive behavior. Authors configure components in HTML; scripts discover and enhance the DOM.
- **Progressive enhancement.** Feature-detect APIs before use. When unsupported, degrade gracefully (e.g. `navigation.ts` falls back to full page loads).
- **Minimal surface area.** Export a small public API. Keep helpers private with `@private` JSDoc or class private fields (`#method`).

### File structure

Every script follows this layout:

1. `"use strict";` as the first line.
2. `@fileoverview` JSDoc block describing the module.
3. Implementation grouped with `// --- Section name ---` dividers in long files.
4. `import` statements for any sibling modules this script depends on, always with an explicit `.ts` extension (`rewriteRelativeImportExtensions` rewrites them to `.js` in the emit).
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

| File                                  | Global             | Export shape                                                                                                 |
| ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `base/utils.ts`                       | `window.Utils`     | `{ parseValue, parseDataAttributes }`                                                                        |
| `base/signals.ts`                     | `window.Signals`   | `{ state, computed, effect }`                                                                                |
| `base/reveal.ts`                      | `window.Reveal`    | `Reveal` class                                                                                               |
| `base/dialog-lifecycle.ts`            | _(none)_           | Emits `zazz:dialog-open` / `zazz:dialog-close` on every `<dialog>` (ADR-0003); the events are the public API |
| `base/embla.ts`                       | `window.EmblaInit` | `{ init, initRoot, ... }`                                                                                    |
| `base/zazz-element.ts`                | _(none)_           | `ZazzElement` base + `defineZazzElement` + refresh registry (`registerRefresh` / `refreshAll`)               |
| `ui/carousel/carousel.ts`             | _(none)_           | `<ui-carousel>` element class (module export only)                                                           |
| `ui/checkbox/checkbox.ts`             | _(none)_           | `initCheckboxes`, `deriveTriState` (module exports only); signal-derived select-all groups                   |
| `ui/lightbox/lightbox.ts`             | _(none)_           | `<ui-lightbox>` element class (module export only)                                                           |
| `ui/password-group/password-group.ts` | _(none)_           | `<ui-password>` element class (module export only)                                                           |
| `ui/tabs/tabs.ts`                     | _(none)_           | `<ui-tabs>` element class (module export only)                                                               |
| `ui/toaster/toaster.ts`               | `window.Toaster`   | Imperative toast API + `<ui-toaster>` element class                                                          |
| `base/navigation.ts`                  | _(none)_           | Side-effect only; no export                                                                                  |

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
- Make initialization **idempotent**: guard with attributes (`data-carousel-init`), flags (`initFn._bound`), or instance checks so re-running is safe.

`Reveal` additionally exposes `Reveal.disableAutoInit()` and `Reveal.getAutoInstance()` for manual control.

### HTML web components

Interactive components ship as **light-DOM custom elements** that augment existing markup (carousel.ts, lightbox.ts, password-group.ts, tabs.ts). They follow the [HTML web components](https://adactio.com/journal/20618) approach: wrap or replace the component root element, never replace its content.

- **No shadow DOM, no templates.** Children are regular markup; all Zazz CSS applies unchanged.
- **Element names carry the `ui-` prefix** (`ui-carousel`, `ui-lightbox`, `ui-password`, `ui-tabs`, `ui-toaster`), matching the kit-wide dual-form naming (ADR-0001). A tag form exists only where the root would otherwise be a generic `<div>`/`<span>` (never wrap or replace a semantic native element: "the most semantic tag wins").
- **Lifecycle, not load events.** Set up in `connectedCallback()`, tear down in `disconnectedCallback()`. Elements work when inserted dynamically without needing an auto-init block.
- **Clean up with `AbortController`.** Bind listeners with `{ signal }` and abort on disconnect; disconnect `MutationObserver`s.
- **Extend `ZazzElement`** (base/zazz-element.ts): implement `setup(signal)` (bind everything with `{ signal }`) and `teardown()` only for what an abort cannot release. Register with `defineZazzElement("tag-name", Cls)`, which guards double script loads. Only behavioral components register; CSS-only tag forms stay unregistered (ADR-0001).
- **Custom elements are `display: inline` by default**: add a `display` rule in the component stylesheet.
- **Degrade gracefully.** Without JS the markup must still render sensibly (a password field stays masked; tabs keep native radio behavior).
- **Element props are `data-*` attributes** (`data-label-show`, `data-label-hide`), not bare attributes, even though the tag is its own namespace. One prop system across the kit.
- Do not attach element classes to `window`; `export` them for module consumers. `window` is reserved for genuine imperative APIs (`window.Toaster`, `window.Reveal`, `window.EmblaInit`, `window.Utils`, `window.Signals`).

### Reactive state (signals)

Zazz bets on the [TC39 Signals proposal](https://github.com/tc39/proposal-signals) for component state, via `signal-polyfill` wrapped by `base/signals.ts`.

- **`base/signals.ts` is the only file allowed to import `signal-polyfill`.** Components import `state`, `computed`, and `effect` from the wrapper, so an API shift (or native signals shipping) changes one file.
- **Division of labor:** DOM events and observers are _input adapters_ that write into `state`; `computed` holds _pure derived logic_ (the unit-testable part); `effect` is the _output adapter_ that writes back to the DOM. `effect` accepts an `AbortSignal`, so an element's existing controller tears reactive work down with everything else; its returned disposer also implements `Symbol.dispose`, so short-lived effects (tests, scoped work) can be bound with `using`.
- **Not everything is a signal.** Timers, transition choreography, and DOM construction stay imperative; the DOM remains the source of truth for element lists (HTML-first). A component with no derived state (e.g. `tabs.ts`) needs no signals at all.
- Tests live next to the module (`signals.test.ts`); run them with `pnpm --filter @zazz-ui/core test`.

### Data-attribute configuration

Component scripts read configuration from HTML data attributes rather than JS options objects.

- Use a consistent prefix per component: `data-carousel-*`, `data-reveal-*`.
- Parse attributes with `Utils.parseDataAttributes(node, "data-carousel-")`, which converts kebab-case to camelCase and coerces types via `Utils.parseValue`. It returns `Record<string, unknown>`; when a caller needs a typed shape, wrap it once at its own boundary (see `readCarouselOptions` in `base/embla.ts`) rather than asserting at each call site. Parse for a single expected type directly instead (the toaster reads `data-duration` with `Number`).
- Document the full attribute reference in the file's `@fileoverview` block.
- Set lifecycle attributes on the DOM (`data-carousel-init`) so scripts can detect already-initialized elements.
- Keep the three attribute families straight (ADR-0002): **config props** (`data-carousel-*`, `data-reveal-*`) and **variant/state props** (`data-variant`, `data-size`, `data-side`, `data-align`, `data-orientation`, `data-position`) are bare-keyed and unprefixed; **interior parts** are `data-slot="{primitive}-{part}"` (a space-separated token list, always matched with `[data-slot~="..."]`). `ui-` prefixes things that _name_ Zazz (tags, classes, component tokens); attribute keys that carry values stay bare.

Enable carousel plugins with a space-separated token list (`data-carousel-plugins="autoplay"`). Boolean flags can use explicit values (`data-carousel-keyboard="false"`).

### Dependencies and load order

Scripts declare dependencies with ES imports so the module graph resolves order: the entry module (`index.ts`, loaded as the emitted `index.js`) is the only tag a page loads.

| Script                                | Imports                                              | Notes                                                                                   |
| ------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `base/utils.ts`                       | none                                                 | Provides `window.Utils`                                                                 |
| `base/signals.ts`                     | `signal-polyfill` (npm)                              | The **only** file allowed to import the polyfill                                        |
| `base/zazz-element.ts`                | none                                                 | `ZazzElement` base + refresh registry                                                   |
| `base/reveal.ts`                      | `base/zazz-element.ts`                               | Registers a refresh hook                                                                |
| `base/dialog-lifecycle.ts`            | none                                                 | Owns `<dialog>` visibility; components subscribe to its events                          |
| `base/embla.ts`                       | `base/utils.ts`, `base/zazz-element.ts`, Embla (npm) | Imports Embla as ES modules; subscribes to `zazz:dialog-open`; registers a refresh hook |
| `ui/carousel/carousel.ts`             | `base/embla.ts`                                      | `<ui-carousel>` calls `EmblaInit.initRoot`                                              |
| `ui/checkbox/checkbox.ts`             | `base/signals.ts`, `base/zazz-element.ts`            | Derives select-all group state via signals; refresh hook                                |
| `ui/lightbox/lightbox.ts`             | `ui/carousel/carousel.ts`                            | `<ui-lightbox>` coordinates carousel elements                                           |
| `ui/password-group/password-group.ts` | `base/signals.ts`                                    | Standalone (`<ui-password>`)                                                            |
| `ui/tabs/tabs.ts`                     | none                                                 | Standalone (`<ui-tabs>`)                                                                |
| `ui/toaster/toaster.ts`               | `base/utils.ts`, `base/signals.ts`                   | `<ui-toaster>` + `window.Toaster` toast API                                             |
| `base/navigation.ts`                  | `base/zazz-element.ts`                               | App-level; drains the refresh registry after a <main> swap                              |

When a script needs `Utils`, `import { Utils } from "../../base/utils.ts"` (from a `src/primitives/<name>/` folder) rather than duplicating parsing logic. Embla ships as real ES modules imported by bare specifier; the page import map (generated by `head.ts`, pinned + SRI-checked) resolves them, so the module graph orders everything and pages load exactly one script tag.

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

Prefer a [`using` declaration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) (Explicit Resource Management) for **scoped acquire/release**: a resource acquired and released within one function scope, where the release must run at scope exit even when the code in between throws or returns early. Examples in the kit: temporarily unclamping toast heights for a batch measurement (`toaster.ts` `#reindex`), or a test-scoped `effect` (the disposer `effect()` returns implements `Symbol.dispose`, so `using dispose = effect(...)` tears it down at scope end).

```typescript
using _measure = unclampForMeasure(toasts); // restore runs at scope exit, throw or not
const entries = toasts.map((toast) => ({ node: toast, height: toast.offsetHeight }));
```

Rules:

- **TypeScript sources only, never in vanilla JS.** Safari has no native Explicit Resource Management, so `using` must not appear in docs snippets, example HTML, inline `<script>`s, or anything shipped uncompiled. In `.ts` sources it is safe: tsc (target ES2022) compiles `using` to plain try/finally.
- **Add the symbol fallback to every module that touches the protocol.** The compiled helpers (and `[Symbol.dispose]` method definitions) read `Symbol.dispose` at runtime and throw where it does not exist. Any file that declares `using` or creates a disposable carries this line after its imports:

  ```typescript
  (Symbol as { dispose: symbol }).dispose ??= Symbol("Symbol.dispose");
  ```

- **`using` is for same-scope cleanup only.** Cleanup that spans callbacks (element lifecycles from `connectedCallback()` to `disconnectedCallback()`, long-lived observers) stays on `AbortController` and explicit `disconnect()`; `using` cannot model it.
- **This is the one deliberate exception to line-for-line emit.** Files containing `using` gain tsc's injected `__addDisposableResource`/`__disposeResources` helpers (~50 lines) in the published `.js`. Reach for it where guaranteed cleanup earns that; do not scatter it decoratively.
- `erasableSyntaxOnly` permits `using`: it is JavaScript syntax, not TypeScript-only syntax. The types come from `"ESNext.Disposable"` in the tsconfig `lib`.

### Syntax and style

- Double quotes for strings.
- Semicolons required.
- Optional chaining (`?.`) and nullish coalescing where they simplify guards.
- `using` for scoped acquire/release in `.ts` sources, never in vanilla-JS snippets (see [Scoped resources](#scoped-resources-using)).
- Types live in TypeScript annotations, not JSDoc braces; ambient types for CDN and cross-script globals stay in `globals.d.ts`.
- **Erasable syntax only**: no enums, namespaces, or parameter properties; nothing that requires tsc to generate code (`erasableSyntaxOnly` enforces this). Use `import type` / `export type` for type-only imports (`verbatimModuleSyntax`).
- Import sibling modules with explicit `.ts` extensions (`rewriteRelativeImportExtensions` emits them as `.js`).
- Run `pnpm --filter @zazz-ui/core test` after editing to validate types.

---

## JSDoc conventions

JSDoc here is prose documentation, not typing: types live in the TypeScript signatures, and the comments survive the emit (`removeComments: false`), so what you write is what consumers read in the published `.js`. For tags not covered here, see the [JSDoc tag reference](https://jsdoc.app/).

### Required rules

1. **Every JSDoc block must include `@description`.** Do not rely on a bare first line without the tag.
2. **Use JSDoc for all public API documentation**: file headers, classes, functions, interfaces, and export namespaces.
3. **Use inline `//` comments only for implementation notes**: guards, event binding, non-obvious logic. Never duplicate JSDoc content inline.
4. **Tag descriptions use a hyphen separator:** `@param name - Description.` No type braces: the type lives in the signature.
5. **Optionality and defaults live in the signature** (`options: RevealOptions = {}`), not in bracket notation: JSDoc carries only the prose.

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

Config/option object shapes are TypeScript `interface`s, not `@typedef` blocks: give each field a `/** ... */` doc comment (see the template below).

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
  /** Visibility threshold (0 to 1) to trigger animations. */
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
