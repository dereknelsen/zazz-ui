/** `/robots.txt`: everything is crawlable except the kit mirror the previews load. */
import type { APIRoute } from "astro";
import { site } from "../site.config.ts";

export const GET: APIRoute = () =>
  new Response(
    [
      "User-agent: *",
      "Allow: /",
      "# The kit's source and dist files, served for previews and the playground.",
      "Disallow: /zazz/",
      "",
      `Sitemap: ${new URL("/sitemap-index.xml", site.url)}`,
      "",
      `# For LLMs: ${new URL("/llms.txt", site.url)} (index) and /llms-full.txt (everything).`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
