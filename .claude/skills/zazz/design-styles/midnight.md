# Midnight — Design Style

First, gather all assets, brand colors and content from any provided urls, then update the
frontmatter tokens in `DESIGN.md` to match (see its **Brand Customization** callout) — including
setting the dark surface as the default mode. This file is a **style overlay**: it sets an aesthetic
direction and page structure — DESIGN.md and SKILL.md still govern tokens, components, and house
rules. When they conflict, they win.

## The midnight aesthetic

A **dark, high-contrast, confident** direction for modern software, platform, and tech-product
brands. The page is dark-mode-native — near-black surfaces, white type, and **a single hot accent**
that appears only where it earns attention (CTAs, stats, active states). The one thing a visitor
remembers is decisiveness: big claims, hard numbers, no ornament that isn't load-bearing.

Two moves make it read as midnight rather than generic dark UI: **a heavy geometric sans set very
large and tight** for hero and section heads, and **oversized ghosted numerals/watermarks** as the
signature decoration — step numbers, stat indices, or a faint figure behind the hero — rendered in
a barely-there tint so they read as texture, not content. Everything else stays flat and quiet so
the accent and the type do the talking.

Maps most naturally to the **Editorial Studio** archetype for its atmosphere — gallery-like,
high-contrast, generous whitespace — though the content model is product/marketing, not commerce.
Borrow the confidence and negative space; skip the craft-narrative framing.

## Making it feel midnight (in Zazz terms)

- **Heavy geometric sans, no serif.** This style is sans-forward: a confident grotesk with real
  weight range — Geist, Satoshi, General Sans, or Space Grotesk — set heavy and tight for headlines.
  Emphasis comes from **weight and size, not italic serif accents** (that's heritage's move, not
  this one). Micro-labels, eyebrows, and stat captions go uppercase and wide-tracked via
  `text-eyebrow`; everything else stays sentence case per the house rule.
- **A true `text-display` moment.** Give the hero a genuine `text-display`/`text-h1` at the heaviest
  weight against calm `text-md` `--muted-foreground` body copy — the contrast is the hierarchy.
  Open sections with a short accent-colored `text-eyebrow` ("features", "how it works").
- **Near-black surface, one hot accent.** Lean the dark mode: `--background` near-black,
  `--foreground` white, `--muted-foreground` for body. Route a **single saturated accent** through
  `--primary` (e.g. a hot orange, electric lime, or signal red) and spend it sparingly — CTAs,
  stat numerals, active nav, list indices. No second brand color competing; restraint is the point.
- **Oversized ghost numerals as the motif.** The signature decoration: huge step/stat numbers
  (`text-display` scale) at low opacity via `--muted` or a tint, overlapped behind their content
  with `grid-area-pile`. Also a faint watermark figure behind the hero. Texture, never legible focus.
- **Bordered cards on flat dark, atmosphere from tokens.** Cards are `--card` with
  `1px solid var(--border)` on the dark surface — flat, hairline-defined, no drop shadows. Build
  depth from a subtle `--primary`-scale wash or grain in section backgrounds and decorative
  `--border` dividers; reserve `--shadow-*` for genuine overlays (popovers, dialogs) only.
- **Moody, in-context imagery.** When photography appears (blog cards, features), it's dark and
  atmospheric — night cityscapes, low-key product shots — framed in `--radius-lg` figures, not
  bright studio cut-outs. Duotone or a dark overlay keeps it consistent with the surface.
- **Tight, structured rhythm with air.** Break the centered stack: dense bordered grids for
  features and stats against `--gap-xl` (96px) breathing room around section heads. Use the
  `.container` band system — `full` grids against capped `article`/`lg` intro text.
- **One orchestrated reveal.** A single staggered hero load (`data-reveal` / `data-reveal-each`)
  and scroll reveals down the page beat scattered micro-interactions. `--spring-easing` for movement.

## Page structure (top to bottom)

Build sections from Zazz components and the band system — don't hand-roll CSS. See
`references/components.md` and `PATTERNS.md`.

1. **Sticky header:** Wordmark top-left, slim center/right nav, a `.button` `data-variant="link"`
   sign-in, and a `.button` `data-variant="primary"` "sign up" in the accent.
2. **Hero:** Accent `text-eyebrow` + a heavy `text-display`/`text-h1` claim ("Transform the way your
   team works") over `--muted-foreground` subcopy, with an oversized ghost numeral/figure piled
   behind via `grid-area-pile`. Dual CTAs — one `primary`, one bordered default (`.button` with no
   variant, or `data-variant="ghost"`).
3. **Stat band:** A row of 3–4 big accent numerals (`text-display`/`text-h2`, `--primary`) with
   `text-eyebrow` labels ("500k+ active users", "99.99% uptime"). Hard numbers as credibility.
4. **Logo / sponsors:** Bordered cards or a grayscale logo row on the dark surface — "trusted by",
   partner placeholders — separated by `--border`.
5. **About / positioning:** A capped (`article`) heavy heading on the future/vision, calm body, and
   a single accent stat card (e.g. an "A+" badge) alongside.
6. **Features grid:** `text-eyebrow` + heading, then a bordered 3-column grid of feature cards
   (`--card`, `1px solid var(--border)`, line icon + title + `--muted-foreground` description).
7. **Insights / blog:** A row of dark photographic cards (`--radius-lg` figures, moody imagery) with
   date eyebrow, title, and a "view all ↗" `.button` `data-variant="link"`.
8. **How it works:** Numbered steps with oversized ghost `01 / 02 / 03` numerals piled behind each
   step's title + description.
9. **Why choose us:** A numbered accent list (`01`–`04` in `--primary`) of differentiators beside a
   short heading.
10. **Closing / footer:** A centered "trusted by" line, then a dark footer block with wordmark,
    tagline, multi-column nav, and a legal bar.

## Credibility cues to weave in

- Hard metrics up front — active users, uptime, savings, response time — as big accent numerals.
- Logo walls, sponsor/partner cards, and "trusted by innovative teams" social proof.
- Confident, benefit-led copy in sentence case; the accent reserved for the single next action.
- Numbered, structured storytelling (steps, reasons) that reads as engineered, not decorated.
