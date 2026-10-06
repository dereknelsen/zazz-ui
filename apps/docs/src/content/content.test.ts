/**
 * The content directory against the kit: every primitive and utility section
 * has a page, and every `{% preview src %}` names a fragment that exists.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { primitiveNames } from "../lib/api/primitives.ts";
import { UTILITY_SECTIONS } from "../lib/api/utility-sections.ts";
import { readExample } from "../lib/kit.ts";

const CONTENT = path.join(import.meta.dirname, ".");

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".mdoc"))
    .map((e) => path.join(e.parentPath, e.name));
}

describe("api content", () => {
  it("has a page for every primitive in the manifest", () => {
    const pages = readdirSync(path.join(CONTENT, "api/primitives")).map((f) =>
      f.replace(/\.mdoc$/, ""),
    );
    expect(primitiveNames().filter((n) => !pages.includes(n))).toEqual([]);
    expect(pages.filter((p) => !primitiveNames().includes(p))).toEqual([]);
  });

  it("has a page for every utility section", () => {
    const pages = readdirSync(path.join(CONTENT, "api/utilities")).map((f) =>
      f.replace(/\.mdoc$/, ""),
    );
    expect(UTILITY_SECTIONS.map((s) => s.id).filter((id) => !pages.includes(id))).toEqual([]);
  });

  it("declares the primitive its tables render", () => {
    for (const file of files(path.join(CONTENT, "api/primitives"))) {
      const name = path.basename(file, ".mdoc");
      expect(readFileSync(file, "utf8"), name).toMatch(new RegExp(`^primitive: ${name}$`, "m"));
    }
  });
});

describe("previews", () => {
  it("only reference fragments that exist in the kit", () => {
    const missing: string[] = [];
    for (const file of files(CONTENT)) {
      for (const match of readFileSync(file, "utf8").matchAll(/\{%\s*preview\s+src="([^"]+)"/g)) {
        if (readExample(match[1]) === null)
          missing.push(`${path.relative(CONTENT, file)}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
