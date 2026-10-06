/** Every content page as the LLM endpoints see it. */
import { getCollection } from "astro:content";
import { hrefFor } from "./sidebar.ts";
import type { PageForLlm } from "./llms.ts";

export async function allPages(): Promise<PageForLlm[]> {
  const docs = await getCollection("docs");
  const api = await getCollection("api");
  const blog = await getCollection("blog", ({ data }) => !data.draft);
  const order = (
    a: { data: { sectionOrder?: number; order: number; title: string } },
    b: typeof a,
  ) =>
    (a.data.sectionOrder ?? 99) - (b.data.sectionOrder ?? 99) ||
    a.data.order - b.data.order ||
    a.data.title.localeCompare(b.data.title);
  return [
    ...docs.sort(order).map((e) => ({
      title: e.data.title,
      description: e.data.description,
      section: `Docs: ${e.data.section}`,
      url: hrefFor("/docs", e.id),
      body: e.body ?? "",
    })),
    ...api.sort(order).map((e) => ({
      title: e.data.title,
      description: e.data.description,
      section: `API: ${e.data.section}`,
      url: hrefFor("/api", e.id),
      body: e.body ?? "",
    })),
    ...blog.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      section: "Blog",
      url: `/blog/${e.id}/`,
      body: e.body ?? "",
    })),
  ];
}
