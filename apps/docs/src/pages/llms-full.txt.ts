import type { APIRoute } from "astro";
import { pageMarkdown } from "../lib/llms.ts";
import { allPages } from "../lib/pages.ts";
import { site } from "../site.config.ts";

export const GET: APIRoute = async () => {
  const pages = await allPages();
  const body = pages.map((p) => pageMarkdown(p, site.url)).join("\n\n---\n\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
