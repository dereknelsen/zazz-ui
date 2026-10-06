import { describe, expect, it } from "vite-plus/test";
import htmlData from "@zazz-ui/core/editor/zazz.html-data.json";
import languageData from "@zazz-ui/core/editor/zazz.language-data.json";
import { headerProse, primitiveApi, primitiveNames } from "./primitives.ts";

describe("primitiveApi", () => {
  it("assembles the button from the kit data", () => {
    const api = primitiveApi("button");
    expect(api.identities).toEqual(["button"]);
    expect(api.tags).toEqual([]);
    const variant = api.attributes.find((a) => a.name === "data-button-variant");
    expect(variant?.kind).toBe("preset");
    expect(variant?.values).toEqual(expect.arrayContaining(["primary", "ghost", "outline"]));
    // button-group's attributes belong to button-group, not button
    expect(api.attributes.some((a) => a.name.startsWith("data-button-group"))).toBe(false);
    expect(api.hooks.some((h) => h.name === "--ui-button-bg--hover" && h.state === "hover")).toBe(
      true,
    );
    // button.css re-declares --ui-kbd-* for kbd inside a button; that is kbd's hook
    expect(api.hooks.every((h) => h.name.startsWith("--ui-button-"))).toBe(true);
    expect(primitiveApi("select").hooks.some((h) => h.name.startsWith("--ui-option-"))).toBe(true);
    expect(api.examples).toContain("button/button");
    expect(api.summary).toMatch(/^button\.css/);
  });

  it("includes tag forms, slots, states, config, behavior, and events for a scripted primitive", () => {
    const api = primitiveApi("command");
    expect(api.tags).toEqual(["ui-command"]);
    expect(api.attributes.find((a) => a.name === "data-command-slot")?.kind).toBe("slot");
    expect(api.attributes.find((a) => a.name === "data-command-state")?.kind).toBe("state");
    expect(api.attributes.find((a) => a.name === "data-command-hotkey")?.kind).toBe("config");
    expect(api.behavior[0]?.file).toBe("primitives/command/command.ts");
    expect(api.behavior[0]?.lines.join("\n")).toMatch(/command menu/i);
    expect(api.events).toContain("zazz:command-select");
  });

  it("groups shared identities and hooks under their owning primitive", () => {
    expect(primitiveApi("fields").identities.sort()).toEqual(["field", "field-group"]);
    expect(primitiveApi("select").identities.sort()).toEqual(["multiselect", "select"]);
    expect(primitiveApi("select").attributes.some((a) => a.name === "data-multiselect-slot")).toBe(
      true,
    );
    expect(primitiveApi("kbd").hooks.some((h) => h.name === "--ui-kbd-icon-size")).toBe(true);
    expect(
      primitiveApi("password-group").hooks.some((h) => h.name.startsWith("--ui-password-")),
    ).toBe(true);
    // declared elsewhere, named for the primitive
    expect(primitiveApi("popover").hooks.some((h) => h.name === "--ui-popover-shadow")).toBe(true);
    expect(
      primitiveApi("navigation-menu").hooks.some((h) => h.name.startsWith("--ui-popover-")),
    ).toBe(false);
    expect(primitiveApi("prose").hooks.length).toBeGreaterThan(0);
    expect(primitiveApi("reveal").attributes.some((a) => a.name === "data-reveal")).toBe(true);
  });

  it("puts every hook and every primitive attribute on exactly one page", () => {
    const seenHooks = new Map<string, string[]>();
    const seenAttrs = new Map<string, string[]>();
    for (const name of primitiveNames()) {
      const api = primitiveApi(name);
      for (const h of api.hooks) seenHooks.set(h.name, [...(seenHooks.get(h.name) ?? []), name]);
      for (const a of api.attributes)
        seenAttrs.set(a.name, [...(seenAttrs.get(a.name) ?? []), name]);
    }
    expect(Object.keys(languageData.hooks).filter((h) => !seenHooks.has(h))).toEqual([]);
    expect([...seenHooks].filter(([, owners]) => owners.length > 1)).toEqual([]);
    const primitiveAttrs = (htmlData.globalAttributes as { name: string }[])
      .map((a) => a.name)
      .filter((n) => /^data-(?!ui\b|ui-|debug-)/.test(n));
    expect(primitiveAttrs.filter((n) => !seenAttrs.has(n))).toEqual([]);
  });

  it("returns a page's worth of data for every primitive in the manifest", () => {
    for (const name of primitiveNames()) {
      const api = primitiveApi(name);
      const facts =
        api.examples.length + api.attributes.length + api.hooks.length + api.behavior.length;
      expect(facts, name).toBeGreaterThan(0);
    }
    expect(primitiveNames()).not.toContain("utilities");
    expect(() => primitiveApi("nope")).toThrow(/unknown primitive/);
  });
});

describe("headerProse", () => {
  it("keeps prose and bullets, drops tags and the example block", () => {
    const lines = headerProse(`"use strict";
/**
 * @fileoverview \`<ui-x>\`: a thing.
 * @description Does things.
 *
 * Attributes:
 * - \`data-x-y\`: a knob.
 *
 * @example
 * <ui-x></ui-x>
 */
class X {}`);
    expect(lines).toEqual([
      "`<ui-x>`: a thing.",
      "Does things.",
      "",
      "Attributes:",
      "- `data-x-y`: a knob.",
    ]);
  });
});
