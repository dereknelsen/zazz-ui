---
name: zazz-legacy-baseline
description: >-
  Install Zazz into a legacy app whose existing CSS must keep working: layer the old stylesheets,
  find the gaps where the old CSS leans on browser defaults the Zazz reset changes, and write a
  scoped `legacy/baseline.css` that closes them. Use when adding Zazz to an older site (Bootstrap
  2/3, jQuery-era, server-rendered templates such as ASP, PHP, or JSP), when legacy pages break after
  Zazz loads, or when someone asks what belongs in `baseline.css`.
---

# Legacy baseline

The Zazz reset sits in the lowest cascade layer. Layering the old CSS above it settles every
property the old CSS sets. A **gap** is a property the old CSS never sets because it relied on a
browser default, which the reset has since changed. Layers can't close gaps. The baseline closes
them: a small stylesheet, scoped to unconverted pages, that hands each gap back to the browser
default or to an explicit value.

The baseline is evidence-driven. Old stylesheets drift from the framework they started as, so a
gap is real only when the CSS that ships and the markup the templates emit show it. Every line
in the baseline names its evidence.

[RESET-GROUPS.md](RESET-GROUPS.md) is the catalog: each reset group, the symptom it causes, how to
detect it, and the baseline lines that close it. It reflects Zazz 0.5.3.

## Steps

### 1. Inventory the CSS that ships

List every stylesheet a legacy page loads, in load order: `<link>` tags in the shared page
templates and includes, `<style>` blocks, `@import` chains, and CSS that scripts inject at run
time (Font Awesome 5's SVG mode, jQuery plugins, widget loaders). Mark each one as _file_
(it can be layered) or _injected_ (it stays unlayered and beats every layer, the kit's included).

Done when every stylesheet a representative page receives in the browser's network panel
appears in the list.

### 2. Layer it

Write the entry stylesheet: the kit first, then `legacy/baseline.css` into its own sublayer
`legacy.imports.baseline`, then each legacy file into `legacy.imports` (use `legacy.components`
for component CSS that should outrank the framework). A `<link>` can't carry a layer, so the page templates load the entry file in place
of the old `<link>` tags.

```css
@import "./zazz/index.css";
@import "./legacy/baseline.css" layer(legacy.imports.baseline);
@import "./legacy/bootstrap.css" layer(legacy.imports);
@import "./legacy/site.css" layer(legacy.imports);
```

Done when every _file_ stylesheet loads through the entry and the only unlayered CSS left is
the _injected_ list from step 1.

### 3. Audit every reset group

Before auditing, compare the catalog with the vendored kit: `@layer reset` blocks in
`zazz/base/_reset.css`, `zazz/base/_typography.css`, and the primitive stylesheets. A reset rule
the catalog doesn't cover is a new group; audit it the same way.

For each group in [RESET-GROUPS.md](RESET-GROUPS.md), run its detection against the legacy CSS
_and_ the templates (`.asp`, `.inc`, `.php`, `.jsp`, `.html`, or whatever the server renders),
then record a verdict:

- **gap**: the legacy CSS leaves the property unset for elements the pages use. Cite one
  `file:line` from the templates showing such an element and the grep showing the CSS never
  sets it.
- **covered**: the legacy CSS sets the property for every case the pages use. Cite the rule.
- **unused**: the pages never render the element. Cite the empty grep.
- **adopt**: the reset's value is an improvement the team wants (Zazz-drawn checkboxes on
  legacy forms, say). This verdict is the user's call; ask.

Done when every group has a verdict and a citation.

### 4. Write the baseline

Start from this shell and add only the lines for groups marked **gap**, each with a comment
naming its evidence:

```css
/* legacy/baseline.css: closes gaps between the legacy CSS and the Zazz reset.
   Delete a line once no legacy page needs it. */
@scope (html[data-legacy]) to ([data-ui], ui-layout) {
}
```

- The sublayer is what lets legacy CSS win: rules placed directly in `legacy.imports` outrank
  every sublayer of it, whatever their specificity. In `legacy.imports` itself, the scoped
  baseline would beat an unscoped legacy rule of equal specificity (a Bootstrap 3
  `* { box-sizing: border-box }`, say) on scope proximity.
- Wrap each whole selector in `:where()` so it adds no specificity inside the baseline either.
- The shared page template writes `data-legacy` on `<html>`. A converted page drops it.
- Add any other tag-form element that roots a converted region to the `to (…)` list.
- `revert` returns the browser default. HTML presentational attributes (`cellpadding`,
  `border`, `<img height>`) are author styles, so `revert` can't restore them; the catalog's
  attribute groups write explicit values, one rule per distinct attribute value in the templates.

Done when every **gap** verdict has a line and every line traces to a **gap** verdict.

### 5. Verify in the browser

Open a representative set of legacy pages: the shared shell, a form-heavy page, a table-heavy
report, a content page with lists and images, and any page with a carousel or modal. Compare
each against production without Zazz. For each difference, either add a baseline line (back to
step 3 for that group) or list it for the user.

Done when every visible difference is either closed or listed.

### 6. Report

Hand back the verdict table (group, verdict, citation), the finished `baseline.css`, the open
differences from step 5, and the `[hidden]` risks: elements in the templates that carry the
`hidden` attribute and are shown by script (`.show()`, `.toggle()`, `.fadeIn()`, `style.display`).
The reset's `!important` keeps those elements hidden, and no layer can override it; the fix is
to drop the attribute from that markup.
