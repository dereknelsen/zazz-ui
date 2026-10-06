import markdoc from "@astrojs/markdoc";
import { defineConfig } from "astro/config";
import pagefind from "astro-pagefind";

export default defineConfig({
  site: "https://zazz.sh",
  output: "static",
  integrations: [markdoc(), pagefind()],
  // The playground renders user HTML in an opaque-origin (sandboxed) iframe in
  // production, which loads the kit's module scripts from `/zazz/*` cross-origin:
  // hosting sets `Access-Control-Allow-Origin` in `vercel.json`, and `astro
  // preview` gets it from Vite's `cors` here. (In `astro dev` the frame is
  // same-origin instead: Astro's dev server blocks cross-site subresources.)
  vite: { server: { cors: { origin: "*" } }, preview: { cors: { origin: "*" } } },
});
