import { describe, expect, it } from "vite-plus/test";
import { buildSidebar, hrefFor } from "./sidebar.ts";

describe("hrefFor", () => {
  it("maps index to the base and nests the rest with a trailing slash", () => {
    expect(hrefFor("/docs", "index")).toBe("/docs/");
    expect(hrefFor("/docs", "concepts/index")).toBe("/docs/concepts/");
    expect(hrefFor("/api", "primitives/button")).toBe("/api/primitives/button/");
  });
});

describe("buildSidebar", () => {
  const entries = [
    { id: "primitives/card", title: "Card", section: "Primitives", order: 0, sectionOrder: 3 },
    { id: "index", title: "Overview", section: "Start", order: 0, sectionOrder: 0 },
    { id: "primitives/button", title: "Button", section: "Primitives", order: 0 },
    { id: "utilities/spacing", title: "Spacing", section: "Utilities", order: 2, sectionOrder: 1 },
    { id: "utilities/layout", title: "Layout", section: "Utilities", order: 1 },
    {
      id: "primitives/accordion",
      title: "Accordion",
      section: "Primitives",
      order: 0,
      anchors: [{ label: "Hooks", slug: "hooks" }],
    },
  ];

  it("orders sections by their declared order and links by order then title", () => {
    const sidebar = buildSidebar(entries, "/api", "/api/primitives/button/");
    expect(sidebar.map((s) => s.title)).toEqual(["Start", "Utilities", "Primitives"]);
    expect(sidebar[1].links.map((l) => l.title)).toEqual(["Layout", "Spacing"]);
    expect(sidebar[2].links.map((l) => l.title)).toEqual(["Accordion", "Button", "Card"]);
  });

  it("marks the current page and builds anchor links", () => {
    const sidebar = buildSidebar(entries, "/api", "/api/primitives/button/");
    const button = sidebar[2].links.find((l) => l.title === "Button");
    expect(button?.current).toBe(true);
    expect(sidebar[0].links[0].current).toBe(false);
    const accordion = sidebar[2].links.find((l) => l.title === "Accordion");
    expect(accordion?.anchors).toEqual([
      { label: "Hooks", href: "/api/primitives/accordion/#hooks" },
    ]);
  });
});
