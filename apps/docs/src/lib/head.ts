/**
 * The site's `<head>` comes from the kit's own head contract, so the docs
 * load Zazz exactly as a consumer does: fonts, one stylesheet, the import map
 * that pins the kit's bare specifiers, the one polyfill, the kit module, and
 * the theme script that paints `data-ui-theme` before first paint.
 */
import { buildHead } from "@zazz-ui/core/head.ts";
import { existsSync } from "node:fs";
import path from "node:path";
import { DIST_ROOT, ZAZZ_URL_BASE } from "./kit.ts";

/**
 * Head markup for site pages. In development it links the kit's `src/` entry
 * points (edits to core CSS show on reload); a production build swaps them for
 * the single-file `dist/` bundles so a page costs two kit requests, not ninety.
 */
export function siteHead(options: { dev?: boolean } = {}): string {
  const head = buildHead({ base: ZAZZ_URL_BASE, fontDisplay: "swap" });
  if (options.dev ?? import.meta.env.DEV) return head;
  if (!existsSync(path.join(DIST_ROOT, "zazz.css"))) {
    throw new Error(
      "siteHead: packages/core/dist is missing; run `vp run core#build` before building the site",
    );
  }
  return head
    .replaceAll(`${ZAZZ_URL_BASE}/index.css`, `${ZAZZ_URL_BASE}/zazz.css`)
    .replaceAll(`${ZAZZ_URL_BASE}/index.js`, `${ZAZZ_URL_BASE}/zazz.js`);
}
