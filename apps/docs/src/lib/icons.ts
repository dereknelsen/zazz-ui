/**
 * The site's icons: Font Awesome's Pixel Regular set, read at build time from
 * the Font Awesome Kit package (`@awesome.me/kit-73088f7c71`, installed from
 * Font Awesome's registry with the token in `.npmrc`; Pro icons are not
 * committed to this repo). `components/Icon.astro` inlines one as an `<svg>`;
 * `iconMask` gives one to CSS as a mask image.
 */

/** An icon's drawing: the `viewBox` it sits in and the markup inside the `<svg>`. */
export interface IconData {
  viewBox: string;
  body: string;
}

/** Reads a downloaded icon file: its `viewBox` and its shapes, the license comment left out. */
export function parseIcon(svg: string): IconData {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const body = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg)?.[1];
  if (!viewBox || body === undefined) throw new Error("Not an icon: no <svg viewBox>.");
  return { viewBox, body: body.replace(/<!--[\s\S]*?-->/g, "").trim() };
}

// A file path, not a package import: the Kit's `exports` leave its svg files out.
// `svgs-full` is the square version: every icon on the same 672-unit canvas (a 12 by 12
// pixel grid), where `svgs` crops each one to its own width.
const files = import.meta.glob<string>(
  "../../node_modules/@awesome.me/kit-73088f7c71/icons/svgs-full/pixel-regular/*.svg",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);

const icons = new Map(
  Object.entries(files).map(([path, svg]) => [path.slice(path.lastIndexOf("/") + 1, -4), svg]),
);

/** The icon named `name` (its file name, without `.svg`). An unknown name fails the build. */
export function icon(name: string): IconData {
  const svg = icons.get(name);
  if (svg === undefined) {
    throw new Error(`No icon named "${name}" in the Font Awesome Kit (Pixel Regular).`);
  }
  return parseIcon(svg);
}

/** The icon as a CSS `url()`, for a `mask` or `background`; `currentColor` paints black there. */
export function iconMask(name: string): string {
  const { viewBox, body } = icon(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
