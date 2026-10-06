import { describe, expect, it } from "vite-plus/test";
import { contentType, kitVersion, readExample, resolveWithin, servedFiles } from "./kit.ts";

describe("resolveWithin", () => {
  it("keeps a path inside its root", () => {
    expect(resolveWithin("/kit/src", "primitives/button/button.css")).toBe(
      "/kit/src/primitives/button/button.css",
    );
  });

  it("rejects traversal out of the root", () => {
    expect(resolveWithin("/kit/src", "../package.json")).toBeNull();
    expect(resolveWithin("/kit/src", "/etc/passwd")).toBeNull();
  });

  it("rejects a sibling whose name merely starts with the root", () => {
    expect(resolveWithin("/kit/src", "../src-evil/x.css")).toBeNull();
  });
});

describe("servedFiles", () => {
  const files = servedFiles();
  const paths = new Set(files.map((f) => f.path));

  it("serves the kit entry points previews link", () => {
    expect(paths.has("index.css")).toBe(true);
    expect(paths.has("index.js")).toBe(true);
    expect(paths.has("primitives/button/button.css")).toBe(true);
  });

  it("never serves tests, declarations, maps, or screenshots", () => {
    for (const p of paths) {
      expect(p).not.toMatch(/\.test\./);
      expect(p).not.toMatch(/\.d\.ts$/);
      expect(p).not.toMatch(/\.map$/);
      expect(p).not.toMatch(/__screenshots__/);
      expect(p).not.toMatch(/\.html$/);
    }
  });
});

describe("contentType", () => {
  it("maps the served extensions", () => {
    expect(contentType("a.css")).toMatch(/^text\/css/);
    expect(contentType("a.js")).toMatch(/^text\/javascript/);
    expect(contentType("sri.json")).toMatch(/^application\/json/);
  });
});

describe("readExample", () => {
  it("reads a fragment by id and returns null for an unknown one", () => {
    expect(readExample("button/button")).toContain('data-ui="button"');
    expect(readExample("button/button.html")).toContain('data-ui="button"');
    expect(readExample("nope/nope")).toBeNull();
    expect(readExample("../../package")).toBeNull();
  });
});

describe("kitVersion", () => {
  it("reads a semver from the installed package", () => {
    expect(kitVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
