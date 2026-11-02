import { describe, expect, it } from "vite-plus/test";
import { articleLd, blogPostingLd, breadcrumbLd, ldJson, softwareLd, websiteLd } from "./jsonld.ts";

describe("jsonld", () => {
  it("describes the site", () => {
    expect(websiteLd()).toMatchObject({
      "@type": "WebSite",
      "@id": "https://www.zazz.sh/#website",
      url: "https://www.zazz.sh/",
    });
  });

  it("describes the kit with its version", () => {
    expect(softwareLd("1.2.3")).toMatchObject({ "@type": "SoftwareSourceCode", version: "1.2.3" });
  });

  it("makes article URLs absolute and omits a missing description", () => {
    const ld = articleLd({ title: "Install", url: "/docs/install/", section: "Docs" });
    expect(ld).toMatchObject({ "@type": "TechArticle", url: "https://www.zazz.sh/docs/install/" });
    expect(ld).not.toHaveProperty("description");
  });

  it("dates a blog post and joins its tags", () => {
    const ld = blogPostingLd({
      title: "Hello",
      description: "First post.",
      url: "/blog/hello/",
      date: new Date("2026-01-02T00:00:00Z"),
      tags: ["release", "css"],
      image: "/_astro/og.abc.png",
    });
    expect(ld).toMatchObject({
      datePublished: "2026-01-02T00:00:00.000Z",
      keywords: "release, css",
      image: "https://www.zazz.sh/_astro/og.abc.png",
    });
  });

  it("numbers breadcrumbs from 1", () => {
    const ld = breadcrumbLd([
      { name: "Zazz", url: "/" },
      { name: "Docs", url: "/docs/" },
    ]);
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Zazz", item: "https://www.zazz.sh/" },
      { "@type": "ListItem", position: 2, name: "Docs", item: "https://www.zazz.sh/docs/" },
    ]);
  });

  it("cannot close its script element", () => {
    const json = ldJson({ headline: "</script><script>alert(1)</script>" });
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ headline: "</script><script>alert(1)</script>" });
  });
});
