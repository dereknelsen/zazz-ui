import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { SCENE_URL, SDK_URL, hashedName, unicornFiles } from "./unicorn.ts";

const asset = (name: string) =>
  readFileSync(new URL(`../assets/unicorn/${name}`, import.meta.url), "utf8");
const short = (body: string) => createHash("sha256").update(body).digest("hex").slice(0, 8);

describe("hashedName", () => {
  it("puts the hash before the last extension", () => {
    expect(hashedName("a.umd.js", "x")).toBe(`a.umd.${short("x")}.js`);
    expect(hashedName("scene.json", "x")).toBe(`scene.${short("x")}.json`);
  });
});

describe("Unicorn URLs", () => {
  it("carry the hash of the vendored files", () => {
    expect(SDK_URL).toBe(`/unicorn/unicornStudio.umd.${short(asset("unicornStudio.umd.js"))}.js`);
    expect(SCENE_URL).toBe(
      `/unicorn/unicorn-hero-day-night.${short(asset("unicorn-hero-day-night.json"))}.json`,
    );
  });

  it("are each served with the file's body", () => {
    const served = new Map(unicornFiles().map(({ file, body }) => [`/unicorn/${file}`, body]));
    expect(served.get(SDK_URL)).toBe(asset("unicornStudio.umd.js"));
    expect(served.get(SCENE_URL)).toBe(asset("unicorn-hero-day-night.json"));
  });
});

describe("the hero scene export", () => {
  const scene = JSON.parse(asset("unicorn-hero-day-night.json")) as {
    options: { isProduction?: boolean; includeLogo?: boolean };
    variables?: unknown;
  };

  it("is a production export, without the Unicorn badge", () => {
    expect(scene.options.isProduction).toBe(true);
    expect(scene.options.includeLogo).toBe(false);
  });

  it("still has the variables scripts/hero-scene.ts drives", () => {
    const names = JSON.stringify(scene.variables);
    for (const name of ["nightProgress", "abductProgress", "particleVisibility"]) {
      expect(names).toContain(name);
    }
  });
});
