# Interior parts are `data-slot`, not BEM element classes

Interior parts of a primitive are identified by a single generic attribute with a component-prefixed value — `data-slot="dialog-header"`, `data-slot="carousel-viewport"` — replacing both BEM element classes (`.dialog__header`) and the carousel's component-keyed role attributes (`data-carousel="viewport"`). Classes now only ever name primitive roots.

The component-prefixed value keeps selectors flat (`[data-slot="dialog-header"]`) and unambiguous under nesting (a card's header inside a dialog can never match the dialog's header rules), needs no `@scope` machinery, and is verbatim shadcn's v4 convention — one attribute to learn, familiar to the ecosystem Zazz courts.

## Decisions

- Value grammar: `data-slot="{primitive}-{part}"`.
- Primitive roots are **not** stamped: the tag form or class form is the root identity; `data-slot` is strictly interior. (`ui-carousel` stops stamping `data-carousel="root"`.)
- Glossary term is **slot** (shadcn's word), not "part" (Base UI), "fragment", or "segment".
- Unaffected attribute families stay bare-keyed: CSS variant/state props (`data-variant`, `data-size`, `data-side`, `data-align`, `data-orientation`, `data-position`) and JS config props (`data-carousel-*`, `data-reveal-*`) keep their existing grammar, un-prefixed. Rule of thumb: `ui-` prefixes things that _name_ Zazz (tags, classes, component tokens); attribute keys that carry _values_ stay bare.

## Considered options

- Bare values (`data-slot="header"`) with descendant/`@scope` scoping: rejected — nested primitives make descendant selectors ambiguous, and `@scope` adds a support-policy dependency to solve a self-inflicted problem.
- Component-keyed attributes (`data-tooltip="content"`): rejected — bare keys collide with common consumer idioms (`data-tooltip="text"`), and prefixing them (`data-ui-tooltip`) mints ~35 verbose attribute names.

## Consequences

- All `__part` classes across the kit dissolve into slots; the carousel role attribute migrates (`data-carousel="viewport"` → `data-slot="carousel-viewport"`).
- CSS that styled by native attribute first (e.g. `.tooltip > :where([interestfor], .tooltip__trigger)`) keeps the native attribute as the primary selector; the slot is the fallback hook.
