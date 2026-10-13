import type { APIRoute } from "astro";
import { pageMarkdown } from "../lib/llms.ts";
import { allPages } from "../lib/pages.ts";
import { site } from "../site.config.ts";

export const GET: APIRoute = async () => {
  // Docs and API pages only: a blog post describes the kit as it was when it
  // shipped (0.5's `ch` breakpoints, `data-ui-theme`), and an assistant would
  // read it as current rules. Posts stay linked from the llms.txt index.
  const pages = (await allPages()).filter((p) => p.section !== "Blog");
  const body = pages.map((p) => pageMarkdown(p, site.url)).join("\n\n---\n\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
