import { describe, expect, it } from "vite-plus/test";
import { previewHead, siteHead } from "./head.ts";

describe("siteHead", () => {
  it("links the src entry points in development", () => {
    const head = siteHead({ dev: true });
    expect(head).toContain('href="/zazz/index.css"');
    expect(head).toContain('src="/zazz/index.js"');
  });

  it("links the dist bundles in production and keeps the import map and theme script", () => {
    const head = siteHead({ dev: false });
    expect(head).toContain('href="/zazz/zazz.css"');
    expect(head).toContain('src="/zazz/zazz.js"');
    expect(head).not.toContain("/zazz/index.");
    expect(head).toContain('type="importmap"');
    expect(head).toContain("data-ui-theme");
  });
});

describe("previewHead", () => {
  it("omits scripts when the example is static", () => {
    expect(previewHead({ scripts: false })).not.toContain('<script type="module"');
    expect(previewHead({ scripts: true })).toContain("/zazz/index.js");
  });
});
