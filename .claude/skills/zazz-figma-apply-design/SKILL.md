---
name: zazz-figma-apply-design
description: >-
  Adopt a finished Figma design into the Zazz variable system: update the file's variables to
  match the selected design, then remap every hardcoded value in that design to the variables.
  Use whenever someone selects a designed frame/page and asks to "sync variables to this
  design", "tokenize this design", "adopt this design into the system", "map hardcoded values
  to variables", or "make the variables match this". The design's look is the source of truth —
  variables change to match it, then the design binds to them. Load alongside figma-use for
  Plugin API mechanics.
---

# Zazz — adopt a design into the variable system

Given a selected design (frame or page), do two passes **in this order**:

1. **Update variables to match the design** — the design's actual colors, typefaces, spacing, and radii become the new variable values.
2. **Remap the design to the variables** — rebind every hardcoded fill, stroke, text property, radius, gap, and padding to the variable that now resolves to it.

Because variables are updated first, the rebind pass is visually lossless — **the design must look pixel-identical after both passes.** Never restyle, restructure, or "improve" the design.

## Variable inventory (what to update)

Update ONLY these groups. Read the file's actual variable names before editing — trust the file over this table if they differ.

| Group                                        | Variables                                                                                         | Kind                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `Theme/base` (Light/Dark)                    | background, foreground, border, border-foreground, card, card-foreground, input, input-foreground | Aliases → `Grayscale` steps         |
| `Theme/brand` (Light/Dark)                   | primary, secondary, tertiary + their `*-foreground`s                                              | Aliases → `Corporate` steps / white |
| `Corporate/primary` `/secondary` `/tertiary` | 50–950 scale, 11 steps each                                                                       | Raw hex                             |
| `Grayscale/neutral`                          | white, 50–950, black (13)                                                                         | Raw hex                             |
| `Typography/font-family` (Desktop/Mobile)    | font-heading, font-body, font-mono                                                                | Strings                             |
| `Spacing/semantic` (Desktop/Mobile)          | the semantic gap set                                                                              | Aliases → step scale                |
| `Radius/semantic` (Desktop/Mobile)           | radius-none, xs, sm, md, lg, xl (aliases → `scale/step-*`), radius-full (9999)                    | Aliases                             |
| `Radius/primitives`                          | radius-button, radius-input, radius-badge, radius-card                                            | Aliases → `Radius/semantic`         |

**Never touch** unless explicitly asked: `Theme/overlay`, `Theme/status`, `Grayscale/shade`, `Grayscale/tint`, `Typography` font-size / font-weight / letter-spacing / paragraph-spacing, the `Spacing` step scale, and `Layout`. These are structural.

## Pass 1 — update variables

**Manifest first.** Look for a text layer named **`zazz:variables`** next to the design frame — the design AI leaves one listing every intended variable update, one per line as `Collection/group/name [mode]: value` (raw values as hex/px/string, alias values as the target variable's name; no mode bracket = all modes). When present, apply it as the primary source — it replaces most of the extraction below. Spot-check a few lines against the design's actual values; only fall back to full extraction for gaps or lines that contradict what the design shows. Don't rebind the manifest layer itself in Pass 2, and leave it on the canvas when done.

**Extract (no manifest, or filling gaps).** Walk the selected design and collect every raw value in use: fills, strokes, text colors, font families, corner radii, auto-layout gaps and padding. Cluster near-duplicates (colors within a small delta, sizes within ~2px) — clusters are the design's real palette and scales; stray one-offs are noise to snap later.

**Edit at the right tier.** Raw hex goes only into `Corporate` and `Grayscale/neutral`. `Theme`, `Spacing/semantic`, and `Radius` change by **re-pointing aliases** — never overwrite an alias with a raw value, and never flatten the primitive → semantic → scale chain.

- **Corporate scales** — the design's dominant accent seeds `primary`, its supporting accent `secondary`, a third `tertiary` (derive one from the palette if the design has no third). Regenerate each 50–950 scale (tints.dev-style) positioned so the design's exact hex lands on its bound step — 600 for primary/secondary, 500 for tertiary in a light design (500/500/400 in a dark design). The design's colors must round-trip exactly, not approximately.
- **Grayscale/neutral** — rebuild 50–950 from the design's neutral cast (its grays usually carry a hue tint; keep it). `white` and `black` never change.
- **Theme/base** — re-point each role's alias per mode to the neutral step the design actually uses (e.g. a warm design might move `background` from neutral-50 to a different step). Keep every surface/foreground pair honest.
- **Theme/brand** — keep the standard step bindings (light 600 / dark 500; tertiary 500/400) unless the design's usage clearly demands a different step. Foregrounds stay white unless the design contradicts.
- **Typography/font-family** — set font-heading, font-body, font-mono to the design's exact families, in **both** Desktop and Mobile modes.
- **Spacing/semantic** — usually unchanged; the design should already sit on the step scale. Re-point a semantic gap only if the design uses a consistently different rhythm — never for one stray value.
- **Radius/semantic + primitives** — match the design's roundness: re-point semantic radii to the scale steps the design uses, then re-point each primitive (radius-button, radius-input, radius-badge, radius-card) to the semantic radius matching what that component actually shows in the design.

**Mode rule.** The design shows one theme mode — set that mode's values directly, then derive the other by the system's rules: base surfaces swap (light surfaces ↔ near-black neutrals), brand steps go **lighter** in dark mode. For Desktop/Mobile collections, set the mode matching the design's frame width and keep the other mode's existing ratio to it.

## Pass 2 — remap the design

**Swap in library components first.** The file's **❖ Primitives** page has built components for buttons, badges, avatars, form fields, cards, and dialogs. Before rebinding raw values, replace every hand-drawn equivalent in the design with an instance of the matching component: pick the variant and size that match what the design shows, apply text/icon overrides, and keep the exact position and dimensions. A rectangle-with-label that looks like a button must become a Button instance — never leave a hand-built copy of a component that exists in the library. If a drawn element deviates from every variant in ways an instance override can't reproduce, leave it and report it. (Updated variables restyle the components automatically, so instances will match the design's look.)

Then walk every remaining node and replace each hardcoded value with a variable or style binding:

- **Color** — bind fills, strokes, and text colors to the **most semantic** `Theme` role that resolves to the value (`primary`, `card`, `muted-foreground`…). Fall back to a `Corporate`/`Grayscale` step only when no role resolves. Always keep surface/foreground pairs together.
- **Radius** — component shapes (buttons, inputs, badges, cards) bind to their `Radius/primitives` variable; everything else binds to `Radius/semantic`.
- **Spacing** — auto-layout gaps and padding bind to `Spacing/semantic`.
- **Type** — apply the matching `typography/*` **text style** to every text layer: `headings/` text-display–text-h6 and text-eyebrow, `body/` text-xl–text-xs, `bold/` strong-xl–strong-xs for emphasized body text, `primitives/` text-button and text-badge inside those components. Match by size/weight/leading; snap near-misses to the closest style. No text layer is left without a text style.
- **Shadows** — apply the matching `shadows/*` **effect style** (shadow-none through shadow-xl) to every drop shadow; snap hand-tuned shadows to the closest style. Never leave a raw effect where a style fits.
- **Snapping** — a value within tolerance of a token (~2px numeric, near-identical color) is a rounding artifact: snap the layer to the token and bind it. A value far from every token gets bound to the nearest reasonable token **only if visually indistinguishable**; otherwise leave it hardcoded and report it — never silently distort the design.
- Rebind **every** instance, including deep inside component instances and nested frames. Missed nodes are the most common failure of this task — sweep exhaustively, don't sample.

## Verification checklist

Run after both passes. Fix any failure and re-check — do not finish while an item fails.

- [ ] **Pixel-identical** — the design looks unchanged; compare before/after screenshots of the selection.
- [ ] **Round-trip** — the design's key colors, fonts, and radii resolve exactly from the updated variables (bound steps equal the design's hexes).
- [ ] **No hardcoded values** — a full re-sweep of the selection finds zero unbound fills, strokes, text colors, radii, gaps, or padding, except values explicitly reported as unmappable.
- [ ] **Library components used** — every button, badge, avatar, form field, card, and dialog in the design is an instance from the ❖ Primitives page; no hand-drawn equivalents remain except ones explicitly reported as unmatchable.
- [ ] **Styles applied** — every text layer has a `typography/*` text style and every drop shadow uses a `shadows/*` effect style; no raw type or effect values where a style fits.
- [ ] **Semantic bindings** — layers bind to Theme roles and semantic/primitive tokens, not raw scale steps, wherever a role resolves.
- [ ] **Chains intact** — Theme still aliases Corporate/Grayscale, Radius primitives still alias semantic, semantic still aliases the scale; no alias was flattened to a raw value.
- [ ] **Both modes resolve** — toggle the theme mode: the design remains coherent (surfaces swap, text stays readable); Desktop and Mobile modes both have sane values.
- [ ] **Scope respected** — only the listed groups changed; overlay, status, shade/tint, type metrics, step scales, and Layout are untouched.
- [ ] **Manifest honored** — if a `zazz:variables` layer exists, every line was applied or explicitly reported as contradicting the design; the layer itself is untouched and unbound.
- [ ] **Report** — summarize variables changed (old → new), values snapped, and anything left unmapped.
