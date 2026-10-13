import { describe, expect, it } from "vite-plus/test";
import { PACKAGE_MANAGERS, installApi } from "./install.ts";

describe("installApi", () => {
  it("lists what `add` pulls in, in cascade order, without the primitive itself", () => {
    expect(installApi("button").dependencies).toEqual(["fields", "kbd"]);
    expect(installApi("combobox").dependencies).toEqual([
      "fields",
      "badge",
      "kbd",
      "button",
      "popover",
      "select",
    ]);
  });

  it("writes one command per package manager", () => {
    expect(installApi("button").commands).toEqual([
      { id: "pnpm", command: "pnpm dlx zazz-ui add button" },
      { id: "npm", command: "npx zazz-ui add button" },
      { id: "yarn", command: "yarn dlx zazz-ui add button" },
      { id: "bun", command: "bunx zazz-ui add button" },
    ]);
    expect(PACKAGE_MANAGERS.map((pm) => pm.id)).toEqual(["pnpm", "npm", "yarn", "bun"]);
  });

  it("returns no dependencies for a primitive that has none", () => {
    expect(installApi("kbd").dependencies).toEqual([]);
  });

  it("throws on an unknown primitive", () => {
    expect(() => installApi("nope")).toThrow(/not a primitive/);
  });
});
