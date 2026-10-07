// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for `<ui-command>` with an external result source
 * (`primitives/command/command.ts`): `data-command-filter="none"` and items
 * that arrive after the query.
 */

import { describe, expect, it } from "vite-plus/test";
import "./command.ts";

/** Lets the signal graph drain its queued microtask. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function mount(attributes = ""): {
  root: HTMLElement;
  input: HTMLInputElement;
  list: HTMLElement;
  items: () => HTMLElement[];
} {
  // Parse detached: happy-dom connects a custom element before its children
  // are parsed, so setup would see an empty root.
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<ui-command ${attributes}>
    <div data-command-slot="panel" popover="auto">
      <input data-command-slot="input" role="combobox" />
      <div role="listbox" data-command-slot="list">
        <a role="option" data-command-slot="item" href="#a">Apple</a>
        <a role="option" data-command-slot="item" href="#b">Banana</a>
      </div>
    </div>
  </ui-command>`;
  document.body.replaceChildren(wrapper);
  const root = wrapper.firstElementChild as HTMLElement;
  const input = root.querySelector("input") as HTMLInputElement;
  const list = root.querySelector("[data-command-slot='list']") as HTMLElement;
  return {
    root,
    input,
    list,
    items: () => Array.from(list.querySelectorAll<HTMLElement>("[data-command-slot='item']")),
  };
}

async function type(input: HTMLInputElement, text: string): Promise<void> {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
}

describe("ui-command filtering", () => {
  it("hides non-matching items by default and orders matches by score", async () => {
    const { input, items } = mount();
    await type(input, "zzz");
    expect(items().map((item) => item.hidden)).toEqual([true, true]);
    await type(input, "a");
    expect(items().every((item) => item.style.order !== "")).toBe(true);
  });

  it("reads no unprefixed root config", async () => {
    const { input, items } = mount('data-filter="none" data-sort="document"');
    await type(input, "zzz");
    expect(items().map((item) => item.hidden)).toEqual([true, true]);
    await type(input, "a");
    expect(items().every((item) => item.style.order !== "")).toBe(true);
  });

  it("reads no unprefixed item facts and no data-slot parts", async () => {
    const { input, list, items } = mount();
    items()[0].setAttribute("data-value", "zzz");
    items()[1].setAttribute("data-keywords", "zzz");
    const legacy = document.createElement("a");
    legacy.setAttribute("data-slot", "command-item");
    legacy.textContent = "zzz";
    list.append(legacy);
    await type(input, "zzz");
    expect(items().map((item) => item.hidden)).toEqual([true, true]);
    expect(legacy.hasAttribute("data-command-state")).toBe(false);
  });

  it('shows every item in document order with data-command-filter="none"', async () => {
    const { input, items } = mount('data-command-filter="none"');
    await type(input, "zzz");
    expect(items().map((item) => item.hidden)).toEqual([false, false]);
    expect(items().map((item) => item.style.order)).toEqual(["", ""]);
    // The best match still auto-highlights: the first item in document order.
    expect(items()[0].getAttribute("data-command-state")).toBe("highlighted");
    expect(input.getAttribute("aria-activedescendant")).toBe(items()[0].id);
  });

  it("ranks and highlights items that arrive after the query", async () => {
    const { input, list, items } = mount('data-command-filter="none"');
    await type(input, "docs");
    list.replaceChildren();
    await flush();
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);

    const result = document.createElement("a");
    result.setAttribute("role", "option");
    result.setAttribute("data-command-slot", "item");
    result.href = "#docs";
    result.textContent = "Docs";
    list.append(result);
    await flush();

    expect(items()).toEqual([result]);
    expect(result.hidden).toBe(false);
    expect(result.getAttribute("data-command-state")).toBe("highlighted");
    expect(input.getAttribute("aria-activedescendant")).toBe(result.id);
  });

  it("navigates and commits late-arriving items from the keyboard", async () => {
    const { root, input, list } = mount('data-command-filter="none"');
    await type(input, "docs");
    list.replaceChildren();
    const first = document.createElement("button");
    first.setAttribute("data-command-slot", "item");
    first.textContent = "First";
    const second = document.createElement("button");
    second.setAttribute("data-command-slot", "item");
    second.textContent = "Second";
    list.append(first, second);
    await flush();

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();
    expect(second.getAttribute("data-command-state")).toBe("highlighted");

    const selected: string[] = [];
    root.addEventListener("zazz:command-select", (event) => {
      selected.push(String((event as CustomEvent<{ value: string }>).detail.value));
    });
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(selected).toEqual(["Second"]);
  });

  it("keeps the highlight when only text inside an item changes", async () => {
    const { input, list, items } = mount('data-command-filter="none"');
    await type(input, "b");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();
    expect(items()[1].getAttribute("data-command-state")).toBe("highlighted");

    items()[0].replaceChildren(document.createTextNode("Apple (3 results)"));
    const counter = document.createElement("span");
    counter.textContent = "2 results";
    list.prepend(counter);
    await flush();
    expect(items()[1].getAttribute("data-command-state")).toBe("highlighted");
  });

  it("stops observing once disconnected", async () => {
    const { root, input, list } = mount('data-command-filter="none"');
    await type(input, "x");
    root.remove();
    const late = document.createElement("a");
    late.setAttribute("data-command-slot", "item");
    late.textContent = "Late";
    list.append(late);
    await flush();
    expect(late.hasAttribute("data-command-state")).toBe(false);
    expect(late.id).toBe("");
  });

  it("re-filters when items change under the default filter", async () => {
    const { input, list } = mount();
    await type(input, "cher");
    const cherry = document.createElement("a");
    cherry.setAttribute("data-command-slot", "item");
    cherry.textContent = "Cherry";
    list.append(cherry);
    await flush();
    expect(cherry.hidden).toBe(false);
    expect(cherry.getAttribute("data-command-state")).toBe("highlighted");
  });
});
