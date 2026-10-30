---
name: install-zazz-in-legacy-app
description: >-
  Plan and carry out adding the Zazz design system (@zazz-ui/core) to a legacy app whose existing
  CSS and pages must keep working: interview the user one round of decisions at a time, then layer
  the old stylesheets, find where the old CSS leans on browser defaults the Zazz reset changes, and
  write a scoped `legacy/baseline.css` that closes those gaps. Use when adding Zazz to an older site
  (Bootstrap 2/3, jQuery-era, server-rendered templates such as ASP, PHP, JSP, Razor, or ERB), when
  legacy pages break after Zazz loads, or when someone asks what belongs in `baseline.css`.
---

# Install Zazz in a legacy app

A legacy install has two halves. Phase 1 settles the plan by interview: how Zazz gets onto the
page, which pages convert first, and how the old CSS and scripts coexist with it. Phase 2 makes
the old pages look the same as before with Zazz loaded, with evidence for every line it adds.

For Zazz itself (markup, tokens, install modes, the CLI), use the `zazz` skill or
`https://zazz.sh/llms.txt`.

## Phase 1: the interview

Interview the user until you both understand the install the same way. The method comes from
Matt Pocock's grilling skill: map the install as a **design tree**, where every decision
branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are
settled: the questions you can ask now without guessing at answers you haven't heard. Ask the
whole frontier in one round, number each question, and give your recommended answer. Then wait.

```text
❓ **Q1** - **<question title>**: <the question, with the choices and what each implies>

➡️ <your recommended answer, and why, citing what you found in the codebase>

---

❓ **Q2** - …
```

Word each question so "yes" accepts your recommendation. Each round of answers moves the
frontier: recompute it and ask the next round. A question that depends on another question
still open this round belongs to a later round.

**Facts are your job; decisions are the user's.** Before and during the interview, send
sub-agents to read the codebase, and never ask the user something you could look up. Don't block
on a running search: only the questions downstream of it wait. Gather up front:

- The stylesheets a page loads, in order: `<link>` tags in the shared templates and includes,
  `<style>` blocks, `@import` chains, and CSS that scripts inject at run time (Font Awesome 5's
  SVG mode, jQuery plugins, widget loaders).
- The server template language and where the shared page shell (head, header, footer) lives.
- How scripts load: a bundler, a task runner, or plain `<script>` tags; jQuery and plugin versions.
- Content Security Policy headers or meta tags, and whether inline `style` attributes are allowed.
- Custom properties the legacy CSS sets on `:root`, especially names Zazz also uses as utilities
  (`--radius`, `--gap`, `--p`, `--bg`, `--w`).
- Elements that carry the `hidden` attribute and are shown by script (`.show()`, `.toggle()`,
  `.fadeIn()`, `style.display`).
- Global resets or `*` rules in the legacy CSS, and the framework it started from.

### The design tree

Start from these branches and add any the codebase raises.

1. **Delivery.** How Zazz reaches the page.
   - CLI vendored (`npx zazz-ui init`): the default for an app the team will keep customizing.
     Don't pass `--legacy`; Phase 2 writes the entry stylesheet with the baseline sublayer, and
     `--legacy` would import the same files a second time.
   - CDN (jsDelivr, exact version, SRI): no Node in the deploy path. The legacy CSS still needs an
     entry stylesheet to get its layers.
   - npm with a bundler: when the app already bundles its CSS. The entry can
     `@import "@zazz-ui/core/index.css"` like the CLI's `./zazz/index.css`.
   - Prerequisite facts: build tooling, Node availability, whether the deploy can serve new
     static files.
2. **Rollout scope.** Which pages convert first, and how unconverted pages are marked. The shared
   shell writes `data-legacy` on `<html>` for unconverted pages; a converted page drops it.
   A converted region inside a legacy page starts at a `data-ui` element or `<ui-layout>`,
   which is where the baseline's scope stops.
3. **Layering.** The entry stylesheet's order: the kit, then the baseline, then the legacy files
   in `legacy.imports` (or `legacy.components` for component CSS that should outrank the kit's
   components). Which CSS stays unlayered because a script injects it; unlayered CSS beats every
   layer, the kit's included.
4. **Scripts.** Zazz's module script and import map next to the existing jQuery and bundles, and
   whether any legacy script conflicts with native `<dialog>`, `popover`, or `command`/`commandfor`.
5. **Security.** If a CSP is in place: `style-src-attr 'unsafe-inline'` for the kit's style
   utilities (or a plan to use presets and stylesheet hooks only), `script-src` for the module and
   the CDN host, SRI on CDN tags. See `https://zazz.sh/docs/install/security/`.
6. **Conflicts.** For each colliding custom property, rename it in the legacy stylesheet: Zazz
   registers its utility names as non-inheriting, so a legacy `--radius` set on `:root` stops
   reaching descendants. For each script-shown `[hidden]` element, drop the attribute from that
   markup, because the reset's `[hidden] { display: none !important }` can't be overridden.
7. **Editor.** For the VS Code extension, add the template language to `zazz.languages`
   (`"asp"`, `"razor"`, `"erb"`, `"php"`, …) so Zazz diagnostics work inside templates.
8. **Verification set.** The representative pages to compare against production: the shared
   shell, a form-heavy page, a table-heavy report, a content page with lists and images, and any
   page with a carousel or modal.

The interview is done when the frontier is empty: every branch visited, nothing silently
assumed. Summarize the decisions as a short install plan and **don't change any files until the
user confirms it.**

## Phase 2: the baseline

The Zazz reset sits in the lowest cascade layer. Layering the old CSS above it settles every
property the old CSS sets. A **gap** is a property the old CSS never sets because it relied on a
browser default that the reset has since changed. Layers can't close gaps. The baseline does: a
small stylesheet, scoped to unconverted pages, that hands each gap back to the browser default
or to an explicit value.

Old stylesheets drift from the framework they started from, so don't audit from the
framework's docs. A gap is real only when the CSS that ships and the markup the templates emit
both show it. Every line in the baseline names its evidence.

[RESET-GROUPS.md](RESET-GROUPS.md) is the catalog: each reset group, the symptom it causes, how
to detect it, and the baseline lines that close it.

### 1. Inventory the CSS that ships

Start from the interview's stylesheet list. Mark each one as _file_ (it can be layered) or
_injected_ (it stays unlayered). Done when every stylesheet a representative page receives in
the browser's network panel is on the list.

### 2. Layer it

Write the entry stylesheet: the kit first, then `legacy/baseline.css` in its own sublayer
`legacy.imports.baseline`, then each legacy file in `legacy.imports`. A `<link>` can't carry a
layer, so the page templates load the entry file in place of the old `<link>` tags. With the CLI:

```css
@import "./zazz/index.css";
@import "./legacy/baseline.css" layer(legacy.imports.baseline);
@import "./legacy/bootstrap.css" layer(legacy.imports);
@import "./legacy/site.css" layer(legacy.imports);
```

With the CDN, keep the kit's `<link>` from the installation page first in the head and put only
the baseline and legacy imports in the entry file. Done when every _file_ stylesheet loads
through the entry and the only unlayered CSS left is the _injected_ list.

### 3. Audit every reset group

First compare the catalog with the kit you installed: the `@layer reset` blocks in
`base/_reset.css`, `base/_typography.css`, and the primitive stylesheets (under `zazz/` when
vendored, `node_modules/@zazz-ui/core/src/` from npm, or
`https://cdn.jsdelivr.net/npm/@zazz-ui/core@<version>/src/` for the CDN). A reset rule the
catalog doesn't cover is a new group; audit it the same way.

For each group in [RESET-GROUPS.md](RESET-GROUPS.md), run its detection against the legacy CSS
_and_ the templates (`.asp`, `.inc`, `.php`, `.jsp`, `.cshtml`, `.erb`, `.html`, or whatever the
server renders), then record a verdict:

- **gap**: the legacy CSS leaves the property unset for elements the pages use. Cite one
  `file:line` from the templates showing such an element and the grep showing the CSS never
  sets it.
- **covered**: the legacy CSS sets the property for every case the pages use. Cite the rule.
- **unused**: the pages never render the element. Cite the empty grep.
- **adopt**: the reset's value is an improvement the team wants (Zazz-drawn checkboxes on legacy
  forms, say). This verdict is the user's call; ask, in the interview format above.

Done when every group has a verdict and a citation.

### 4. Write the baseline

Start from this shell and add only the lines for groups marked **gap**, each with a comment
naming its evidence:

```css
/* legacy/baseline.css: closes gaps between the legacy CSS and the Zazz reset.
   Delete a line once no legacy page needs it. */
@scope (html[data-legacy]) to ([data-ui]:not(html), ui-layout) {
}
```

- The sublayer is what lets legacy CSS win: rules placed directly in `legacy.imports` outrank
  every sublayer of it, whatever their specificity. If the baseline sat in `legacy.imports`
  itself, its `@scope` rules would beat an unscoped legacy rule of equal specificity
  (Bootstrap 3's `* { box-sizing: border-box }`, say) on scope proximity, and the legacy CSS
  would lose.
- Wrap each whole selector in `:where()` so it adds no specificity inside the baseline either.
- Add any other tag-form element that roots a converted region to the `to (…)` list. The
  `:not(html)` matters: the theme script writes `theme-dark` or `theme-light` into
  `<html data-ui>`, and without it the root could match its own limit and the baseline would
  apply nowhere.
- `revert` returns the browser default. HTML presentational attributes (`cellpadding`, `border`,
  `<img height>`) are author styles, so `revert` can't restore them; the catalog's attribute
  groups write explicit values, one rule per distinct attribute value in the templates.

Done when every **gap** verdict has a line and every line traces to a **gap** verdict.

### 5. Verify in the browser

Open the verification set from the interview and compare each page against production without
Zazz. For each difference, either add a baseline line (back to step 3 for that group) or list
it for the user. Done when every visible difference is either closed or listed.

### 6. Report

Hand back the install plan as agreed, the verdict table (group, verdict, citation), the
finished `baseline.css`, the open differences from step 5, and any `[hidden]` elements still
shown by script.
