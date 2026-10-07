// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the multiselect trigger label (`primitives/select/multiselect.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { resolveTriggerLabel } from "./multiselect.ts";

describe("resolveTriggerLabel", () => {
  it("shows the placeholder for an empty selection", () => {
    expect(resolveTriggerLabel([], "Select tags", "(+{n} more)")).toBe("Select tags");
  });

  it("shows a single selection plainly", () => {
    expect(resolveTriggerLabel(["Design"], "Select tags", "(+{n} more)")).toBe("Design");
  });

  it("summarizes multiple selections as first (+N more)", () => {
    expect(
      resolveTriggerLabel(["Design", "Engineering", "Research"], "Select tags", "(+{n} more)"),
    ).toBe("Design (+2 more)");
  });

  it("honors a custom overflow template", () => {
    expect(resolveTriggerLabel(["A", "B"], "Pick", "and {n} other")).toBe("A and 1 other");
  });
});

describe("<ui-multiselect> enhancement", () => {
  /** happy-dom connects an element parsed by innerHTML before its children exist, so build it detached. */
  function mount(attrs: string, options: string): Element {
    const host = document.createElement("ui-multiselect");
    for (const [, name, value] of attrs.matchAll(/([\w-]+)="([^"]*)"/g))
      host.setAttribute(name!, value!);
    host.innerHTML = `<select multiple name="fruit">${options}</select>`;
    document.body.replaceChildren(host);
    return host;
  }

  it("stamps data-multiselect-slot parts, a data-ui=select trigger, and reads the scoped placeholder", () => {
    const host = mount(
      'data-multiselect-placeholder="Pick fruit"',
      '<option value="a">Apple</option><option value="b">Pear</option>',
    );
    const trigger = host.querySelector('[data-multiselect-slot~="trigger"]')!;
    expect(trigger.getAttribute("data-ui")).toBe("select");
    expect(host.querySelector('[data-multiselect-slot~="label"]')?.textContent).toBe("Pick fruit");
    expect(host.querySelectorAll('[data-multiselect-slot~="option"]')).toHaveLength(2);
    expect(host.querySelector("select")?.getAttribute("data-multiselect-state")).toBe("enhanced");
    expect(host.querySelector("select")?.hasAttribute("data-multiselect-enhanced")).toBe(false);
    document.body.replaceChildren();
  });

  it("ignores the unprefixed placeholder and overflow label", () => {
    const host = mount(
      'data-placeholder="Legacy" data-label-more="and {n}"',
      '<option value="a">Apple</option>',
    );
    expect(host.querySelector('[data-multiselect-slot~="label"]')?.textContent).toBe("Select…");
    document.body.replaceChildren();
  });

  it("places the panel from the scoped side and align only", () => {
    const scoped = mount(
      'data-multiselect-side="top" data-multiselect-align="end"',
      '<option value="a">Apple</option>',
    ).querySelector('[data-multiselect-slot~="panel"]')!;
    expect(scoped.getAttribute("data-popover-side")).toBe("top");
    expect(scoped.getAttribute("data-popover-align")).toBe("end");
    const bare = mount(
      'data-side="top" data-align="end"',
      '<option value="a">Apple</option>',
    ).querySelector('[data-multiselect-slot~="panel"]')!;
    expect(bare.hasAttribute("data-popover-side")).toBe(false);
    expect(bare.hasAttribute("data-popover-align")).toBe(false);
    document.body.replaceChildren();
  });
});
