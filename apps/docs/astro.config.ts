import markdoc from "@astrojs/markdoc";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";
import pagefind from "astro-pagefind";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { ZAZZ_URL_BASE, contentType, servedFile } from "./src/lib/kit.ts";

// `astro dev` computes the `/zazz/*` route's static paths once, at start, so a
// kit file created later (a new primitive's emitted script) would 404 until a
// restart. In dev this answers `/zazz/*` from disk first; the build still goes
// through `src/pages/zazz/[...path].ts`.
const kitFromDisk: Plugin = {
  name: "zazz-kit-from-disk",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      if (!pathname.startsWith(`${ZAZZ_URL_BASE}/`)) return next();
      const file = servedFile(pathname.slice(ZAZZ_URL_BASE.length + 1));
      if (!file) return next();
      res.setHeader("Content-Type", contentType(file));
      res.setHeader("Cache-Control", "no-cache");
      res.end(readFileSync(file));
    });
  },
};

export default defineConfig({
  site: "https://www.zazz.sh",
  output: "static",
  integrations: [
    markdoc(),
    pagefind(),
    // Pages only: drafts are never built in production; the 404 page, the kit
    // mirror under /zazz/, and the Markdown twins are not search results.
    sitemap({
      filter: (page) => !/\/(404|zazz)\/|\.md$/.test(new URL(page).pathname),
    }),
  ],
  // The playground renders user HTML in an opaque-origin (sandboxed) iframe in
  // production, which loads the kit's module scripts from `/zazz/*` cross-origin:
  // hosting sets `Access-Control-Allow-Origin` in `vercel.json`, and `astro
  // preview` gets it from Vite's `cors` here. (In `astro dev` the frame is
  // same-origin instead: Astro's dev server blocks cross-site subresources.)
  vite: {
    plugins: [kitFromDisk],
    server: {
      cors: { origin: "*" },
      allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".shares.zrok.io"],
    },
    preview: { cors: { origin: "*" } },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Areal",
      cssVariable: "--font-areal",
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/ABCArealSuperfamilyVariable.woff2"],
          },
        ],
      },
    },
  ],
});
