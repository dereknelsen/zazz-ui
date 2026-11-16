import { runInThisContext } from "node:vm";
import { describe, expect, it } from "vite-plus/test";
import packSource from "../scripts/fieldnotes-pack.ts?raw";
import { inlineScript } from "./inline-script.ts";

describe("inlineScript", () => {
  it("compiles TypeScript into a self-running classic script", async () => {
    const source = `export function twice(n: number): number {\n  return n * 2;\n}\n`;
    const script = await inlineScript(source, "twice.ts", "globalThis.__out = twice(21);");
    expect(script).not.toMatch(/\bexport\b|: number/);
    runInThisContext(script);
    expect((globalThis as { __out?: number }).__out).toBe(42);
  });

  it("rejects a module that imports", async () => {
    await expect(
      inlineScript(`import x from "y";\nexport const a = x;`, "a.ts", ""),
    ).rejects.toThrow(/self-contained/);
  });

  it("compiles the card grid's pack pass", async () => {
    const script = await inlineScript(
      packSource,
      "fieldnotes-pack.ts",
      "globalThis.__pack = packGrid;",
    );
    runInThisContext(script);
    expect(typeof (globalThis as { __pack?: unknown }).__pack).toBe("function");
  });
});
