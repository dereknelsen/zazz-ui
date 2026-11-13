"use strict";

/**
 * @fileoverview `--container`, `--container-name`, `--container-type`: an element
 * becomes a query container at the base or from a breakpoint up. Each tier
 * declares its own property, so a longhand's tier stands beside a shorthand's,
 * and a sticky container keeps its scroll-state type.
 */

import { describe, expect, it } from "vite-plus/test";
import { at, atWidth, below, mount, style, useKit } from "../../test/browser.ts";

describe("--container", () => {
  useKit();

  it("--container-type makes a query container that breakpoint tiers inside follow", async () => {
    const root = mount(`<div style="inline-size: 300px; --container-type: inline-size">
      <i data-in style="--display: block; --display--md: flex"></i>
    </div>`);
    await atWidth(at("lg"));
    expect(style(root, "container-type")).toBe("inline-size");
    // the page is past md, the 300px container is not
    expect(style(root.querySelector("[data-in]")!, "display")).toBe("block");
  });

  it("the shorthand sets a name and a type; none clears both", async () => {
    const el = mount(
      `<section style="--container: panel / inline-size; --container--md: none"></section>`,
    );
    await atWidth(below("md"));
    expect(style(el, "container-name")).toBe("panel");
    expect(style(el, "container-type")).toBe("inline-size");
    await atWidth(at("md"));
    expect(style(el, "container-name")).toBe("none");
    expect(style(el, "container-type")).toBe("normal");
  });

  it("a longhand's tier stands beside the shorthand's, and neither reaches below its tier", async () => {
    const el = mount(`<section style="
      --container: none;
      --container--md: panel / inline-size;
      --container-name: sidebar;
      --container-type--lg: size;
    "></section>`);
    await atWidth(below("md"));
    expect(style(el, "container-name")).toBe("sidebar");
    expect(style(el, "container-type")).toBe("normal");
    await atWidth(at("md"));
    expect(style(el, "container-name")).toBe("panel");
    expect(style(el, "container-type")).toBe("inline-size");
    await atWidth(at("lg"));
    expect(style(el, "container-name")).toBe("panel");
    expect(style(el, "container-type")).toBe("size");
  });

  it("a tier applies with no base", async () => {
    const el = mount(`<div style="--container-type--md: inline-size"></div>`);
    await atWidth(below("md"));
    expect(style(el, "container-type")).toBe("normal");
    await atWidth(at("md"));
    expect(style(el, "container-type")).toBe("inline-size");
  });

  it("--container-name is base only: a tier declares nothing", async () => {
    const el = mount(`<div style="--container-name: panel; --container-name--md: other"></div>`);
    await atWidth(at("md"));
    expect(style(el, "container-name")).toBe("panel");
  });

  it("a sticky container keeps the scroll-state type, at the base and at a tier", async () => {
    const root = mount(`<div>
      <div data-base style="--position: sticky; --container-type: inline-size"></div>
      <div data-tier style="--position: sticky; --container-type--md: size"></div>
      <div data-gate style="--stuck-state: top; --container-type: inline-size"></div>
    </div>`);
    await atWidth(at("md"));
    if (!CSS.supports("container-type", "scroll-state")) return;
    expect(style(root.querySelector("[data-base]")!, "container-type")).toBe(
      "inline-size scroll-state",
    );
    expect(style(root.querySelector("[data-tier]")!, "container-type")).toBe("size scroll-state");
    expect(style(root.querySelector("[data-gate]")!, "container-type")).toBe(
      "inline-size scroll-state",
    );
  });
});
