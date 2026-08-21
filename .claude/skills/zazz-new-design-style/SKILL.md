---
name: zazz-new-design-style
description: >-
  Author a new Zazz design-style overlay from a screenshot or reference of a website. Use whenever
  someone wants to "add a design style", "capture this vibe/look as a style", "turn this screenshot
  into a Zazz style", or otherwise codify a reference site's aesthetic (dark SaaS, editorial, brutalist,
  playful, luxury, etc.) into a reusable overlay under `zazz-pass/design-styles/`. Produces one Markdown
  overlay file in the shape `heritage.md` established — an aesthetic direction + page structure expressed
  in Zazz tokens, never a fork of the design system. Start here before hand-writing a new style file.
---

# Authoring a Zazz design style

A **design style** is a reusable overlay that sits on top of the Zazz design system. It captures one
aesthetic direction — the look of a specific reference site — and expresses it in Zazz's vocabulary
so a generation run can adopt it wholesale. Styles live in
`zazz-pass/design-styles/{name}.md`. [`base.md`](../zazz-pass/design-styles/base.md) is the generic
seed; [`heritage.md`](../zazz-pass/design-styles/heritage.md) is the canonical worked example — **read
it first; every new style mirrors its shape.**

**A style is an overlay, not a fork.** `DESIGN.md` (brand tokens, type scale, archetypes) and
`SKILL.md` (components, cascade, house rules) still govern. A style only sets _direction and rhythm_:
which tokens to lean on, what mood the type/color/imagery carry, and how sections stack. When a style
would contradict a house rule (sentence case, semantic tokens, `data-variant`, no hand-rolled CSS),
the house rule wins — bake that into the file.

## When to use

- The user provides a screenshot (or URL) and wants its look saved as a Zazz style.
- The user names a vibe to codify ("make a brutalist style", "a luxury style like this").
- You're expanding the `design-styles/` library.

Not for building an actual page — that's `zazz-pass`. This skill only _authors the overlay file_.

## Workflow

1. **Load the models.** Read [`heritage.md`](../zazz-pass/design-styles/heritage.md) (the shape to
   mirror), `zazz-pass/DESIGN.md` (color roles, the fluid type scale, the three archetypes, motion),
   and skim `zazz-pass/SKILL.md` (house rules, cascade, `data-*` conventions). Everything you write
   must be sayable in that vocabulary.
2. **Read the screenshot as evidence — extract the DNA.** Work the checklist below and write down
   concrete observations, not vibes. "Near-black `#0a0a0a` surface, one hot orange accent, oversized
   ghosted numerals as decoration" — not "modern and bold".
3. **Translate each observation to Zazz.** Use the cheatsheet below. Every visual trait must land on a
   role token, a `text-*` class, a `.container` band, a utility, or a documented pattern. If something
   has no Zazz expression, either find the closest primitive or drop it — do not invent new CSS or
   new tokens in a style file.
4. **Pick the archetype.** Map the reference to Industrial Distributor / Lifestyle Brand / Editorial
   Studio (see `DESIGN.md`). If the content model doesn't fit (e.g. a SaaS product page), name the
   closest archetype for _atmosphere_ and note the divergence — don't force it.
5. **Name it.** One evocative, kebab-case noun for the file (`midnight.md`, `atelier.md`,
   `brutalist.md`) and a Title-Case H1 `Name — Design Style`. Avoid the brand's own name — styles are
   reusable across brands.
6. **Write the file** following the template below, section for section.
7. **Generalize past the sample brand.** Brand tokens get overwritten per-URL at generation time
   (`DESIGN.md` Brand Customization), so describe the _direction_ ("one hot accent against near-black")
   not the literal hex. Give the concrete reference as an _example_ (`e.g. a hot orange`), never a hard
   rule.

## What to read off the screenshot (DNA checklist)

- **Mode & palette** — light or dark surface? One dominant accent or several? Warm or cool? Saturated
  or muted? Where does the accent appear (CTAs, stats, links only)? → role tokens + which brand step.
- **Type system** — serif or sans headings? Weight (light/regular/black)? Condensed or wide? Is there
  an italic/emphasis move? How big is the hero vs. body — real hierarchy or flat? → `text-*` scale +
  font recommendations with character (name 3–4 real faces, never "system font").
- **Imagery** — photographic or illustrative? Studio cut-outs or in-context/cinematic? Moody or bright?
  Full-bleed or framed? Any grain/duotone/overlay treatment? → `.container` bands + figure radius.
- **Layout rhythm & density** — centered stack or asymmetric? Dense/catalog or airy/gallery? Card-based
  or full-bleed sections? Gutters tight or generous? → band system, `--gap-*`, grid utilities.
- **Decoration & motifs** — the signature move: oversized ghost numerals, ruled dividers, borders on
  everything, badges, tickers, gradient washes, noise. → tokens/utilities that produce it.
- **Motion cues** — implied stagger, scroll reveals, marquees, hover states. → `data-reveal-*`,
  `--spring-easing`.
- **Mood & positioning** — the one sentence a visitor remembers, and _who it's for_. This becomes the
  style's thesis paragraph.

## Screenshot → Zazz cheatsheet

| You see                                 | Write it as                                                              |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Dark UI                                 | `colorMode` lean + role tokens (`--background`/`--foreground` auto-swap) |
| One hot accent on CTAs/stats            | dominant `--primary` (a specific step), foregrounds white                |
| Serif headings / italic emphasis words  | serif heading face + italic true-cuts on virtue nouns (`text-*`)         |
| Black grotesk, tight, huge hero         | `text-display`/`text-h1` moment, heavy weight, geometric sans            |
| Uppercase micro-labels                  | `text-eyebrow` (the only caps; everything else sentence case)            |
| Full-bleed cinematic photo w/ text over | `.container` `bleed`/`full` band, white overlay text                     |
| Bordered cards on dark                  | `--card` + `1px solid var(--border)`, flat surfaces                      |
| Big stat numbers                        | `text-display`/`text-h2` numerals in `--primary`, `text-eyebrow` labels  |
| Oversized ghost numerals / watermark    | large type at low opacity via `--muted`/tint, `grid-area-pile` overlap   |
| Gradient band / colored section         | brand-scale wash (`--primary-600` → `--primary-900`)                     |
| Generous whitespace                     | `--gap-xl` (96px) section rhythm, capped `article`/`lg` text             |
| Staggered load / scroll reveals         | `data-reveal` / `data-reveal-each`, `--spring-easing`                    |
| Left-aligned label + content column     | left-label layout (eyebrow column split by `--border`)                   |

## The style file template

Mirror `heritage.md` exactly. Every style file has these sections:

```markdown
# {Name} — Design Style

<Overlay preamble: gather assets/brand from URLs → update DESIGN.md frontmatter tokens; state that
this file is a style overlay and DESIGN.md/SKILL.md win on conflict. Keep it ~4 lines.>

## The {name} aesthetic

<2–3 short paragraphs: the thesis (who it's for + the one memorable thing), the 1–2 signature moves
that make it read as THIS style and not generic, and which archetype it maps to (with the divergence
noted if the content model doesn't fit).>

## Making it feel {name} (in Zazz terms)

- **<Type move>** — serif/sans, weight, emphasis, 3–4 named faces with character; the caps/eyebrow rule.
- **<Hierarchy>** — the `text-display`/`text-h1` moment vs. calm body; eyebrow labels.
- **<Palette>** — mode, the dominant accent + where it lands, surface tokens, all via role tokens.
- **<Imagery>** — photographic/illustrative, cinematic/studio, framing, any treatment.
- **<Atmosphere>** — depth from tokens (washes, grain, borders); surfaces flat, `--shadow-*` reserved.
- **<Composition>** — band-system tension, asymmetry, `--gap-*` rhythm; the signature decoration/motif.
- **<Motion>** — one orchestrated reveal; `data-reveal-*`, `--spring-easing`.

## Page structure (top to bottom)

<Numbered sections a typical page of this style stacks, each naming real Zazz components/bands
(`.button data-variant=...`, `.input`, `--card`, `<embla-carousel>`, `.container` bands). Header →
hero → … → footer. Match the reference's actual section order.>

## {Signature cues} to weave in

<3–4 bullets of the credibility/mood devices this style relies on (stats, logos, testimonials,
motifs), plus a reminder of the sentence-case house rule.>
```

## House rules to bake into every style

- **Sentence case** everywhere except `text-eyebrow`. Never instruct uppercase buttons/headings.
- **Semantic tokens only** — role tokens (`--primary`, `--muted`, `--border`…), `--gap-*`, `text-*`,
  `--radius-*`. Never hardcode hex, px, or rem in guidance; never name a raw scale step unless a role
  token can't express it.
- **`data-variant`, not `.button-primary`.** Reference components by their real selector + `data-*` API.
- **No net-new CSS or tokens** in a style file — it composes the existing system, it doesn't extend it.
- **Dark mode is free** — role tokens auto-swap; never tell a style to hand-write `.dark` overrides.
- **Don't restate DESIGN.md/SKILL.md** — point to them. A style adds _direction_, not documentation.

## Do / Don't

- **Do** ground every claim in a concrete screenshot observation. **Don't** write generic "modern, clean, bold" filler.
- **Do** describe reusable _direction_ with the reference as an example. **Don't** hardcode the sample brand's hex, copy, or name.
- **Do** name real typefaces with character (3–4). **Don't** default to system/`Inter`-style fonts.
- **Do** map every trait to a Zazz token/utility/pattern. **Don't** invent CSS or tokens to reach a look.
- **Do** mirror `heritage.md`'s section shape. **Don't** freestyle the structure.
