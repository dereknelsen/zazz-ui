# Design specifications — Figma

Use the **zazz-figma-design** skill for every system decision: color roles, type scale, spacing, radius, components, layout, motion, and sentence case. Follow its values exactly — never invent off-scale values — and run its verification checklist before delivering. This prompt adds the task; **where this prompt and the skill differ, this prompt wins.** The skill's Geist typefaces, indigo/orange/pink brand seeds, and roundness conventions are placeholder defaults — this prompt and the reference brand replace all of them.

## Reference site

[Reference site](https://)

If the user forgot to update the reference site, ask for the correct url.

## Task

Create 3 unique landing page designs for the referenced eCommerce site — one Figma page per variant below, built from Zazz components and variables. First gather the site's assets: logo, colors, text content, imagery. Derive every brand color role from the reference site — never ship the skill's default indigo/orange/pink seeds. Every design must be distinctive and non-generic, with intentional, memorable design elements that drive purchases.

## Images & graphics

- If a site image is low quality or clashes with the design's style, replace it with a higher-res, cohesive alternative.
- Decorative SVGs are allowed only to improve page flow. Keep them subtle — never let them compete with content. When in doubt, omit them.

## Typography

Stay on the skill's type scale (sizes, weights, leading, tracking), but the skill's Geist default does **not** apply here — each variant's typography spec below overrides it. Choose typefaces only from these lists:

- **Sans serif:** Geist, Google Sans Flex, Inter, Figtree, Raleway, Outfit, Oxanium, DM Sans, Manrope, IBM Plex Sans, Montserrat, Space Grotesk, Public Sans
- **Serif:** Lora, Noto Serif, Merriweather, Bitter, Newsreader, Instrument Serif, Playfair Display, Roboto Slab

## Variants

Each variant is a complete aesthetic direction and overrides the skill's defaults for typefaces, palette character, and roundness — while staying on the skill's scales (e.g. "sharp corners" means 0 radius from the scale, "rounded" means the 10–28px end).

1. **Editorial** — trust and heritage. Clean modern serif headings with light italic serif accents; soft geometric sans body; warm, earthy palette that complements the brand colors; rounded corners; friendly, personable imagery.
2. **Minimal** — modern geometric sans throughout; white and gray section backgrounds; sharp corners; minimalist imagery.
3. **Dark** — bold sans headings; lighter geometric sans body; sharp or rounded corners; dark, energetic imagery. Design this dark-first: the roles' dark values are its resting theme. This is the intended use of the skill's dark mode, not a violation of its "no separate dark palette" rule.

## Required sections

Every design must include all 9 sections, in this order. Add extra sections before, between, or after them as needed — never omit or merge these.

1. **Navigation** — logo, product and page links, search, sign in, CTA
2. **Hero** — title, subtitle, CTA(s) or search
3. **Featured categories** — carousel, banner with links/CTA(s), or bento grid
4. **Social proof** — testimonials or ratings
5. **Featured products** — carousel, optionally with category tabs
6. **About** — brief copy on "how we're different" or "how we serve our customers"; optionally 1–2 images
7. **Newsletter** — join CTA
8. **Footer** — logo, corporate info, social, navigation
9. **Colophon** — copyright, legal links

## Verification checklist

First run the skill's checklist on each design (system fit, spacing, text contrast, foreground pairs, casing, dark mode, brand fit) — spacing and contrast are the most common failures, so verify both visually. Then check these task items. Fix any failure and re-check — do not deliver a design that fails an item.

- [ ] **Sections** — all 9 required sections are present, in order, none merged or omitted.
- [ ] **Typography** — every typeface comes from the approved lists, and each variant matches its spec (Editorial: serif headings + italic accents + sans body; Minimal: geometric sans throughout; Dark: bold sans headings + lighter sans body).
- [ ] **Logo** — the logo component/asset is used if one exists in the file or library; otherwise sourced from the provided website URL. Never a placeholder box, recreation, approximation, or plain text substitute.
- [ ] **Images** — all images are high quality and cohesive with the variant's style; the hero image especially is sharp, high-res, and not stretched, pixelated, or awkwardly cropped.
