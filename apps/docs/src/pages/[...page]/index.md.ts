/**
 * `/docs/…/index.md`, `/api/…/index.md`, `/blog/…/index.md`: the Markdown twin
 * of every content page, next to the page itself.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { pageMarkdown, type PageForLlm } from "../../lib/llms.ts";
import { allPages } from "../../lib/pages.ts";
import { site } from "../../site.config.ts";

export const getStaticPaths = (async () =>
  (await allPages()).map((page) => ({
    params: { page: page.url.replace(/^\/|\/$/g, "") },
    props: { page },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ page: PageForLlm }> = ({ props }) =>
  new Response(pageMarkdown(props.page, site.url), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
