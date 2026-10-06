# Zazz owns no classes: identity is `data-ui`, every attribute Zazz reads is `data-ui-*`

Status: accepted (2026-09-25). Amends [ADR-0001](./0001-dual-form-primitives.md) (class form → attribute form) and [ADR-0002](./0002-data-slot-parts.md) (`data-slot` → `data-ui-slot`; bare-key rule withdrawn).

The class form of a primitive becomes an attribute form: `<button data-ui="button">`, `<div data-ui="tooltip">`. Every attribute that Zazz CSS or JS reads is namespaced `data-ui-*`. Zazz never reads or writes the `class` attribute; it belongs to the consumer. Tag form is unchanged and keeps ADR-0001's rule: `<ui-tooltip>` only where the root would otherwise be a generic element, never a wrapped or replaced semantic native.

## Context

- In the target legacy systems, customer JavaScript rewrites `className` and strips unknown classes in favor of legacy ones; the maintainer cannot edit that code. A class added by Zazz does not reliably survive. Data attributes do.
- ADR-0002's rule of thumb ("attribute keys that carry values stay bare") assumed bare `data-size` would not collide. It collides in ecommerce, where `data-size` is a product option.
- The kit already pays the attribute-selector cost: 420 `[data-slot~=…]` selectors against 84 `data-variant` and 19 `data-size`. Identity adds one more attribute bucket, not a new category.
- Primitive identities stack in practice (`dialog alert-dialog`, `dialog mobile-menu`, `input otp-input`), so identity must be a token list.

## Decision

- **`data-ui`** is a space-separated token list matched with `[data-ui~="…"]`. Selector aliasing becomes `:where(ui-tooltip, [data-ui~="tooltip"])`. A specialization rides on its base; unrelated primitives never share an element.
- **Switches** (valueless rule sets: `sr-only`, `pile`) are tokens in the same list (`data-ui="badge sr-only"`), not boolean attributes.
- **Namespaced CSS-read attributes**: `data-ui-slot`, `data-ui-variant`, `data-ui-size`, `data-ui-text`, `data-ui-state`, `data-ui-side`, `data-ui-align`, `data-ui-orientation`, `data-ui-position`, `data-ui-theme`, `data-ui-layout`.
- **JS config keys keep the primitive name**: `data-ui-{primitive}-{key}` (`data-ui-carousel-loop`, `data-ui-reveal-duration`). Behaviors attach to arbitrary elements (reveal targets, command triggers, a thumbs slot carrying carousel config), so a root can host two behaviors; keeping the name is the only shape where `data-ui-carousel-duration` and `data-ui-reveal-duration` coexist and the parser stays a prefix match.
- **Kit JS never writes a class.** Toaster and multiselect stamp `dataset.ui`; carousel `is-active` becomes `data-ui-state="active"`; reveal `in-viewport` becomes `data-ui-state="in-view"`; the theme toggle writes `data-ui-theme="dark"` on `<html>` with no `.dark` alias.
- ADR-0001 decision 1 narrows: the `ui-` prefix applies to tags and tokens; there are no Zazz classes to prefix.

## Considered options

- **Keep `class="ui-button"`**: rejected on the evidence above; the prefix solved collisions, not stripping.
- **`is-*` / `fx-*` prefixes for switches and effects**: rejected. `is-*` means JS-toggled state everywhere else, which Zazz deliberately expresses with native and `data-ui-state` attributes; `fx-` would split effects across two prefixes on day one (`ui-reveal` exists).
- **Boolean switch attributes** (`data-ui-sr-only`): better `toggleAttribute` ergonomics, but a second attribute shape for two switches; a small `toggleUi()` helper covers the runtime case.
- **Dropping the primitive name from config keys** (`data-ui-loop`): rejected; see Decision.
- **Honoring `.dark` as a read-only alias** for pasted shadcn themes: rejected in favor of one consistent attribute.

## Consequences

- One-time breaking rename across all primitives, examples, docs, the five class-writing JS sites, and `parseDataAttributes` prefixes.
- Every identity selector must use `~=`; worth a lint alongside the dual-form convention.
- One HTML custom-data file can enumerate `data-ui` values (primitives and switches) and every `data-ui-*` attribute for editor autocomplete, which classes could not offer without a build.
- After this and ADR-0012, everything Zazz puts in markup is a `ui-*` tag, a `data-ui*` attribute, or a `--` prop.

## Amendment (2026-09-28): scoped presets

The validation pass showed that a shared preset attribute is ambiguous when tokens stack (`data-ui="layout prose" data-ui-size="xl"`: whose size?). The namespace is therefore two-level:

- **Identity** stays `data-ui="<name> …"`, a token list matched with `~=`. Any tokens may share an element; a specialization rides on its base, switches and typography roles stack on anything.
- **Everything a primitive owns is `data-<name>-<key>`**: `data-button-variant="primary"`, `data-layout-size="xl"`, `data-scroll-fade-axis="y"`, `data-tabs-state="active"` (token list), and JS config keys keep their existing shape (`data-carousel-loop`, `data-reveal-duration`). Slots become `data-<name>-slot="<part>"`; a part shared by two primitives carries two attributes (`data-lightbox-slot="slide" data-carousel-slot="slide"`).
- **Globals that belong to no primitive stay `data-ui-*`**: `data-ui-theme`. Typography roles are identity tokens (`data-ui="text-h2"`, `data-ui="text-xl"`) rather than an attribute, so `data-ui-text` is withdrawn.
- The rule "if Zazz reads it, it starts with `data-ui`" becomes "it is `data-ui`, `data-ui-*`, or `data-<primitive>-*`"; the earlier `data-ui-slot`, `data-ui-variant`, `data-ui-size`, `data-ui-state`, and `data-ui-{primitive}-{key}` spellings are withdrawn before they ship.

## Amendment 2 (2026-09-28): identity-compounded selectors

Dropping the `data-ui-` prefix from primitive-owned attributes reopened collisions with third-party libraries that use the same shape (Flowbite's `data-carousel-item`, `data-tabs-toggle`). Two rules close it: every `data-<name>-*` selector compounds with the identity (`[data-ui~="button"][data-button-variant="primary"]`; slots as descendants of `:where(ui-dialog, [data-ui~="dialog"])`), and `parseDataAttributes` runs only on elements carrying the identity. A same-shaped attribute on an element without the identity matches nothing.
