import { describe, expect, it } from "vite-plus/test";
import { expandTag, llmsIndex, pageMarkdown, parseAttrs, table, toMarkdown } from "./llms.ts";

describe("parseAttrs", () => {
  it("reads strings, booleans, and numbers", () => {
    expect(parseAttrs(' src="button/button" scripts=false order=3 title="A: b"')).toEqual({
      src: "button/button",
      scripts: false,
      order: 3,
      title: "A: b",
    });
  });
});

describe("toMarkdown", () => {
  it("expands a preview into a fenced html block and keeps the prose", () => {
    const md = toMarkdown('Intro.\n\n{% preview src="button/button" /%}\n\nAfter.');
    expect(md).toMatch(/^Intro\.\n\n```html\n[\s\S]*data-ui="button"[\s\S]*\n```\n\nAfter\.\n$/);
  });

  it("turns a callout into a blockquote with its title", () => {
    const md = toMarkdown(
      '{% callout type="warning" title="Alpha" %}\nMind the gap.\n{% /callout %}',
    );
    expect(md).toBe("> **Alpha**\n>\n> Mind the gap.\n");
    expect(toMarkdown('{% callout type="tip" %}\nx\n{% /callout %}')).toContain("> **Tip**");
  });

  it("expands attribute and hook tables for a primitive", () => {
    const md = toMarkdown(
      '{% attributes primitive="button" /%}\n\n{% hooks primitive="button" /%}',
    );
    expect(md).toContain("| `data-button-variant` | preset |");
    expect(md).toContain("| `--ui-button-bg--hover` |");
  });

  it("expands a utility section and a token group", () => {
    const md = toMarkdown('{% utilities section="spacing" /%}\n{% tokens group="radius" /%}');
    expect(md).toContain("| `--px` | `padding-inline` |");
    expect(md).toContain("| `--radius-md` |");
  });

  it("expands the head tag to the real head markup", () => {
    const md = toMarkdown('{% head mode="cdn" primitives="button" /%}');
    expect(md).toContain("cdn.jsdelivr.net/npm/@zazz-ui/core@");
    expect(md).toContain("primitives/button/button.css");
  });

  it("reads an attribute that contains a percent sign", () => {
    expect(toMarkdown('{% callout title="100% sure" %}\nyes\n{% /callout %}')).toContain(
      "> **100% sure**",
    );
  });

  it("marks an unknown tag instead of leaving Markdoc syntax behind", () => {
    expect(expandTag("nope", {})).toBe("<!-- nope -->");
    expect(toMarkdown("{% nope /%}")).not.toContain("{%");
  });
});

describe("table", () => {
  it("escapes pipes and newlines in cells", () => {
    expect(table(["a"], [["x | y\nz"]])).toBe("| a |\n| --- |\n| x \\| y z |");
  });
});

describe("pageMarkdown and llmsIndex", () => {
  const page = {
    title: "Button",
    description: "Actions.",
    section: "Primitives",
    url: "/api/primitives/button/",
    body: "Body.",
  };
  it("writes a title block and the body", () => {
    expect(pageMarkdown(page, "https://zazz.sh")).toBe(
      "# Button\n\nActions.\n\nSource: https://zazz.sh/api/primitives/button/\n\nBody.\n",
    );
  });
  it("groups the index by section with .md links", () => {
    const index = llmsIndex([page], "https://zazz.sh");
    expect(index).toContain("## Primitives");
    expect(index).toContain("- [Button](https://zazz.sh/api/primitives/button/index.md): Actions.");
    expect(index).toContain("/llms-full.txt");
  });
});
