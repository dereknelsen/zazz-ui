import type { APIRoute } from "astro";
import { llmsIndex } from "../lib/llms.ts";
import { allPages } from "../lib/pages.ts";
import { site } from "../site.config.ts";

export const GET: APIRoute = async () =>
  new Response(llmsIndex(await allPages(), site.url), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
