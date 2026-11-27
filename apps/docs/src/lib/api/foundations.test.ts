import { describe, expect, it } from "vite-plus/test";
import { globalAttributes, tokenGroups, typographyRoles } from "./foundations.ts";

describe("typographyRoles", () => {
  it("lists headings first, then body sizes", () => {
    const roles = typographyRoles();
    expect(roles[0]).toBe("display");
    expect(roles).toHaveLength(15);
    expect(roles).toEqual(expect.arrayContaining(["h1", "eyebrow", "sm"]));
    expect(roles.indexOf("h6")).toBeLessThan(roles.indexOf("sm"));
  });
});

describe("globalAttributes", () => {
  it("lists the page-level globals with values", () => {
    const names = globalAttributes().map((a) => a.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "data-draggable",
        "data-navigation",
        "data-navigation-persist",
        "data-navigation-persist-mode",
        "data-theme",
        "data-style-guard",
      ]),
    );
    expect(names).not.toContain("data-ui-theme");
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
