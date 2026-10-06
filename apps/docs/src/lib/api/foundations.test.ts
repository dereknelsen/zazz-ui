import { describe, expect, it } from "vite-plus/test";
import {
  globalAttributes,
  parseSwitches,
  switches,
  tokenGroups,
  typographyRoles,
} from "./foundations.ts";

describe("parseSwitches", () => {
  it("reads tokens and joins continuation lines", () => {
    const list = parseSwitches(`/**
 * x
 * @layer utilities
 * @uses       data-ui="sr-only": hidden
 * @uses       data-ui="divide-x" / "divide-y": a border,
 *             sized by --divide
 */`);
    expect(list).toEqual([
      { tokens: ["sr-only"], description: "hidden" },
      { tokens: ["divide-x", "divide-y"], description: "a border, sized by --divide" },
    ]);
  });

  it("finds the kit's switches", () => {
    const tokens = switches().flatMap((s) => s.tokens);
    expect(tokens).toEqual(
      expect.arrayContaining(["sr-only", "pile", "isolate", "divide-x", "divide-y", "container"]),
    );
  });
});

describe("typographyRoles", () => {
  it("lists headings first, then body sizes", () => {
    const roles = typographyRoles();
    expect(roles[0]).toBe("text-display");
    expect(roles).toEqual(expect.arrayContaining(["text-h1", "text-eyebrow", "text-sm"]));
    expect(roles.indexOf("text-h6")).toBeLessThan(roles.indexOf("text-sm"));
  });
});

describe("globalAttributes", () => {
  it("lists the data-ui-* globals with values", () => {
    const theme = globalAttributes().find((a) => a.name === "data-ui-theme");
    expect(theme?.values.sort()).toEqual(["dark", "light"]);
    expect(globalAttributes().map((a) => a.name)).toContain("data-ui-persist");
  });
});

describe("tokenGroups", () => {
  it("places every token in one group and resolves colors to light and dark", () => {
    const groups = tokenGroups();
    const all = groups.flatMap((g) => g.tokens.map((t) => t.name));
    expect(new Set(all).size).toBe(all.length);
    const roles = groups.find((g) => g.id === "color-roles");
    const primary = roles?.tokens.find((t) => t.name === "--color-primary");
    expect(primary?.light).toBeTruthy();
    expect(primary?.dark).toBeTruthy();
    expect(roles?.tokens.some((t) => /^--color-primary-\d/.test(t.name))).toBe(false);
    expect(
      groups.find((g) => g.id === "spacing")?.tokens.some((t) => t.name === "--space-md"),
    ).toBe(true);
    expect(groups.find((g) => g.id === "other")?.tokens ?? []).toEqual([]);
  });
});
