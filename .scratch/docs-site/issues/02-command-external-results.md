# 02 Phase 1: `<ui-command>` with an external result source

Status: resolved
Type: task
Blocked by: 01

The docs search renders Pagefind results into the command palette. The typeahead engine ranked only what `items()` returned when a signal changed and hid anything command-score rejected, so results matched on body text would vanish and items injected after a keystroke were never ranked or highlighted.

## Comments

- 2026-10-06: red — `src/primitives/command/command.test.ts` (happy-dom; four cases: default filtering still hides, `data-command-filter="none"` keeps every item in document order with the first auto-highlighted, items that arrive after the query are ranked/highlighted/announced, and the default filter re-filters on item changes). Finding: happy-dom runs `connectedCallback` while `innerHTML` is still parsing children, so the test parses detached and appends; the browser harness (`mount`) is unaffected.
- 2026-10-06: green — `src/base/typeahead.ts`: `filtersItems` (`data-<prefix>-filter="none"` reads `config("filter")`, so every family member has it), `itemsVersion` signal bumped by a childList `MutationObserver` on the list (disconnected on the setup signal's abort; the effect's own writes are attributes, so no self-trigger), auto-highlight resets to 0 on item changes, and an unfiltered list skips inline `order`. `command.ts` `@fileoverview` lists the attribute; CHANGELOG `### command` entry.
- 2026-10-06: not done — `editor/zazz.html-data.json` does not list `data-command-filter`, but it also lacks `data-command-sort` and `-min-length`: the generator only sees literal `data-<prefix>-*` strings, and these are read through `config()`. Out of scope here; worth a generator follow-up.
- 2026-10-06: reviewer pass folded in: the observer ignores mutations that add or remove no item (a text swap inside an item, a result counter next to the list), so arrow-key position survives them; one `ordersByScore` flag; `@description` on the getter; the `-filter` option listed in the autocomplete, combobox, and engine headers; CHANGELOG entry moved family-wide under `### base`. The new keyboard test exposed a pre-existing bug: Enter dispatched `zazz:command-select` twice because the synthetic `click()` re-entered `commit`; fixed with a re-entry guard. Core suite green: 84 files / 689 tests (Chromium). Used by the docs search in ticket 06.
- 2026-10-06: resolved.
