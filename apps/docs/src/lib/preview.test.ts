import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRIMITIVES } from "@zazz-ui/core/manifest.ts";
import { describe, expect, it } from "vite-plus/test";
import { readExample } from "./kit.ts";
import { PREVIEW_META_IDS, liveHtml, scriptsFor } from "./preview.ts";

const CONTENT = fileURLToPath(new URL("../content", import.meta.url));

/** Every `.mdoc` page and the example ids it renders inline. */
function pagesWithExamples(): { page: string; ids: string[] }[] {
  const pages: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (file.endsWith(".mdoc")) pages.push(file);
    }
  };
  walk(CONTENT);
  return pages.map((file) => {
    const source = readFileSync(file, "utf8");
    const ids = [
      ...[...source.matchAll(/\{% examples primitive="([^"]+)"/g)].flatMap(
        ([, name]) => PRIMITIVES[name!]?.examples ?? [],
      ),
      ...[...source.matchAll(/\{% preview src="([^"]+)"/g)].map(([, id]) => id!),
    ].map((id) => id.replace(/^primitives\//, "").replace(/\.html$/, ""));
    return { page: path.relative(CONTENT, file), ids };
  });
}

describe("scriptsFor", () => {
  it("lists the primitive's scripts and its dependencies'", () => {
    expect(scriptsFor("tabs/tabs")).toContain("primitives/tabs/tabs.js");
    expect(scriptsFor("button/button")).toEqual([]);
    expect(scriptsFor("lightbox/lightbox")).toEqual(
      expect.arrayContaining([
        "primitives/lightbox/lightbox.js",
        "primitives/carousel/carousel.js",
      ]),
    );
  });

  it("returns nothing for the utilities demos", () => {
    expect(scriptsFor("utilities/gap")).toEqual([]);
  });
});

describe("previewMeta", () => {
  it("only lists examples that exist in the kit", () => {
    const stale = PREVIEW_META_IDS.filter((id) => readExample(id) === null);
    expect(stale).toEqual([]);
  });
});

describe("liveHtml", () => {
  it("drops command hotkeys, which would bind for the whole docs page", () => {
    const html = `<ui-command\n  data-command-hotkey="mod+k"><a data-command-hotkey="mod+shift+d" href="#">x</a></ui-command>`;
    expect(liveHtml(html)).toBe(`<ui-command><a href="#">x</a></ui-command>`);
  });
});

describe("inline examples", () => {
  it("never repeat an id or a form-control name on one page", () => {
    const clashes: string[] = [];
    for (const { page, ids } of pagesWithExamples()) {
      const owner = new Map<string, string>();
      for (const id of ids) {
        const html = readExample(id) ?? "";
        const names = [
          ...[...html.matchAll(/\sid="([^"]+)"/g)].map(([, v]) => `id ${v}`),
          ...new Set([...html.matchAll(/\sname="([^"]+)"/g)].map(([, v]) => `name ${v}`)),
        ];
        for (const name of names) {
          if (owner.has(name)) clashes.push(`${page}: ${name} in ${owner.get(name)} and ${id}`);
          else owner.set(name, id);
        }
      }
    }
    expect(clashes).toEqual([]);
  });
});
