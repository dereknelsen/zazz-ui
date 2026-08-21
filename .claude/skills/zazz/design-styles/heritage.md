# Heritage — Design Style

First, gather all assets, brand colors and content from any provided urls, then update the
frontmatter tokens in `DESIGN.md` to match (see its **Brand Customization** callout). This file is
a **style overlay**: it sets an aesthetic direction and page structure — DESIGN.md and SKILL.md
still govern tokens, components, and house rules. When they conflict, they win.

## The heritage aesthetic

An **established, trustworthy, and enduring** direction for wholesale, B2B distribution, and
legacy retail brands. The tone signals **longevity, craft, and reliability** — "the dependable
partner you can build your business on" — while staying warm and human, never cold or corporate.
Trust is earned through evidence of the long run: years in business, a founding date, breadth of
catalog, delivery reliability.

Two moves make it read as heritage rather than generic B2B: **root it in a place and a date**
(EST. 1927 · Denver, Colorado; "Colorado's most trusted…"; "rooted in the mountains of Colorado")
and **frame it as a family-owned legacy** — generational, provenance-driven copy ("Join our
legacy", "our family-owned heritage", a footer column literally titled _Heritage_). The visitor
should leave feeling this brand has been here for decades and will outlast the competition.

Maps most naturally to the **Industrial Distributor** or **Lifestyle Brand** archetype
(see `DESIGN.md`). Function-first, catalog-dense clients lean Distributor; brands with a story to
tell lean Lifestyle. Default to **Lifestyle Brand** when unclear.

## Making it feel heritage (in Zazz terms)

- **Let the serif lead.** Unlike the sans-forward Zazz default, heritage promotes a warm
  transitional serif to the **heading face itself** — section headings and the hero read in serif,
  with italic true-cuts on the emphasis word ("Colorado's most _trusted_ dairy distributor",
  "Your partners in _quality_", "Join our _legacy_"). The emphasis words are abstract virtue nouns
  — _trusted_, _quality_, _legacy_, _craft_ — not product names. Newsreader is the best starting
  serif (editorial, real italics); Fraunces, Spectral, and Source Serif 4 are strong alternates,
  more contrast for older brands, less for modern ones. Set body and UI in a quiet geometric sans
  with character — Satoshi, Geist, Hanken Grotesk, or General Sans. Small labels, eyebrows, and
  product captions go uppercase and wide-tracked via `text-eyebrow`; everything else sentence case.
- **Real hierarchy, not five near-identical sizes.** Give the hero a genuine `text-display` /
  `text-h1` moment against calm `text-md` body copy, and open sections with a `text-eyebrow` label
  that names the place or category ("wholesale dairy distribution", "who we serve").
- **Warm, archival palette anchored by one deep brand color.** Route everything through role tokens
  so dark mode comes free. Warm cream off-whites and neutrals for section surfaces (`--background`,
  `--muted`), `--muted-foreground` for body copy, and a **single deep, saturated brand color**
  (a rich navy, forest, oxblood, or bottle green) carrying the social-proof band and footer. That
  dark band, sandwiched between cream sections, is what gives the page its trustworthy weight —
  don't spread timid even grays. Commit to the brand color as the point.
- **Cinematic, place-rooted imagery — not clean studio product shots.** The heritage look leans on
  warm golden-hour photography of landscape, farm, fleet, and operations rooted in the brand's
  actual region (mountains, fields, the local mill). The hero is a full-bleed atmospheric photo
  with white text laid over the darker portion; category and product cards can sit in painterly
  in-context scenes rather than cut-out white backgrounds. Reach for nostalgic, lived-in warmth
  over crisp catalog sterility.
- **Atmosphere from tokens, surfaces flat.** Layer depth with a gradient wash across the brand
  scale (`--primary-600` → `--primary-900`) on the colored band, subtle grain, and decorative
  `--border` rules as section separators. Reserve `--shadow-*` for genuine elevation — not on
  every card.
- **Compose with tension.** Break the centered stack with the `.container` band system: full-bleed
  (`bleed`/`full`) photography of product, fleet, warehouse, or craft against capped text
  (`article`/`lg`). Use the **left-label layout** (thin eyebrow column + content column, split by
  `--border`) for "who we serve" and specs. Let `--gap-xl` (96px) open real negative space.
- **One orchestrated reveal.** A single staggered page-load on the hero (`data-reveal` /
  `data-reveal-each`) plus scroll reveals for narrative pacing beats scattered micro-interactions.
  Use `--spring-easing` for confident, unhurried movement.

## Page structure (top to bottom)

Build sections from Zazz components and the band system — don't hand-roll CSS. See
`references/components.md` and `PATTERNS.md`.

1. **Sticky header:** Logo top-left, prominent catalog/product search (`.input`, central or right),
   primary CTA (`.button` `data-variant="primary"`, e.g. "Become a customer" / "Request a quote"),
   plus a secondary sign-in `.button` `data-variant="link"`.
2. **Hero:** Full-bleed golden-hour photo (landscape, fleet, or operations) with white text over
   the darker region. Small eyebrow states place + founding date ("EST. 1927 · Denver, Colorado").
   Serif `text-display`/`text-h1` headline with an italic emphasis word ("Colorado's most
   _trusted_ dairy distributor") + a one-line value prop (reliability, quality, local sourcing).
   Dual CTAs — one `primary`, one `link` with an arrow (→ / ↗).
3. **Trust bar:** Muted strip (`--muted`) with an "trusted by" eyebrow and a row of grayscale
   partner logos to establish scale.
4. **Category / product showcase:** Section heading + `<embla-carousel>` or grid of category cards
   (`--card`, `--radius-lg`, figure aspect 3/2). A "shop all" `.button` closes it.
5. **Social-proof band:** Full-width deep-brand section with a gradient wash — a large serif-italic
   pull-quote testimonial ("We have been receiving your products for almost 25 years…") with plain
   attribution, or a longevity stat, paired with a warm in-context product image and carousel
   controls. This dark band is the page's trustworthy centerpiece.
6. **Featured products grid:** Clean row of 4–5 product cards on `--background`/`--card` with
   concise captions and a "view all products" `.button` `data-variant="link"`.
7. **"Who we serve":** Serif heading on flexibility ("From mom & pop shops to wholesale
   distribution"), a short paragraph, a CTA, and a wide framed golden-hour landscape image
   (`--radius-lg`) of the fleet or region below it.
8. **Closing CTA:** Centered serif heading with an italic legacy note ("Join our _legacy_"), brief
   family-owned/provenance copy, dual CTAs ("Become a customer" / "Send a message").
9. **Footer:** Deep brand-colored block (`card-inverted` tones) with logo, a legacy tagline
   ("A legacy of freshness, rooted in the mountains of Colorado…"), multi-column nav
   (Navigation / Connect / **Heritage**), contact details, social links, and a legal bar.

## Trust & credibility cues to weave in

- Partner-logo strips, testimonials, and specific stats — years in business, founding date, SKUs
  carried, delivery reliability, regions served.
- Emphasis on **service, consistency, and partnership** in copy, in sentence case.
- Clear, low-friction CTAs geared toward account creation, quotes, or ordering.
