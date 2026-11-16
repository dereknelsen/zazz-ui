/**
 * Keeps the site's look (styles/site-look.css) out of the examples.
 *
 * The kit resolves its tokens on `:root`: `--radius-md` is a length and
 * `--ui-card-corner-shape` a shape by the time a preview stage inherits them,
 * so resetting `--radius-multiplier` on the stage alone would change nothing.
 * The stage therefore re-declares, with the kit's own values, every property
 * the look sets and every token or hook that reads one of them (directly or
 * through another token), and they recompute there. The theme builder's
 * preview (components/ThemeBuilder.astro) gets the same rule.
 */

/** A kit token or hook as `zazz.language-data.json` lists it. */
interface Declared {
  value: string;
}

/** The custom properties a stylesheet declares, in order, once each. */
export function declaredProperties(css: string): string[] {
  const names = css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:/g);
  return [...new Set(Array.from(names, (match) => match[1]!))];
}

/** The custom properties a value reads through `var()`. */
function reads(value: string): string[] {
  return Array.from(value.matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1]!);
}

/**
 * The rule that restores the kit's defaults on `selector` (the preview stage,
 * unless given) for the properties `look` declares: a stylesheet, or the
 * property names themselves. A property the kit does not define is left out.
 */
export function stageScope(
  look: string | readonly string[],
  kit: Readonly<Record<string, Declared>>,
  selector = "[data-preview-stage]",
): string {
  const stale = new Set(typeof look === "string" ? declaredProperties(look) : look);
  // Kit declarations can read tokens declared after them, so sweep until settled.
  for (let grew = true; grew;) {
    grew = false;
    for (const [name, { value }] of Object.entries(kit)) {
      if (!stale.has(name) && reads(value).some((read) => stale.has(read))) {
        stale.add(name);
        grew = true;
      }
    }
  }
  const declarations = Object.entries(kit)
    .filter(([name]) => stale.has(name))
    .map(([name, { value }]) => `${name}: ${value};`)
    .join(" ");
  return `@layer zazz.variables { ${selector} { ${declarations} } }`;
}
