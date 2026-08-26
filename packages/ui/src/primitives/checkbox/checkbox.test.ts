// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for checkbox select-all groups (`primitives/checkbox/checkbox.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { deriveTriState, initCheckboxes } from "./checkbox.ts";

function render(html: string): HTMLElement {
  document.body.innerHTML = "";
  const scope = document.createElement("div");
  scope.innerHTML = html;
  document.body.append(scope);
  initCheckboxes(scope);
  return scope;
}

// Signal effects batch re-runs to a microtask: change something, then tick().
function tick(): Promise<void> {
  return Promise.resolve();
}

function change(input: HTMLInputElement, checked: boolean): Promise<void> {
  input.checked = checked;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return tick();
}

describe("deriveTriState", () => {
  it("derives all, some, and none", () => {
    expect(deriveTriState([true, true])).toBe("all");
    expect(deriveTriState([true, false])).toBe("some");
    expect(deriveTriState([false, false])).toBe("none");
    expect(deriveTriState([])).toBe("none");
  });
});

describe("select-all groups", () => {
  const GROUP = `
    <table>
      <thead><tr><th><input type="checkbox" data-checkbox-controls="tasks" /></th></tr></thead>
      <tbody>
        <tr><td><input type="checkbox" name="tasks" value="a" checked /></td></tr>
        <tr><td><input type="checkbox" name="tasks" value="b" /></td></tr>
      </tbody>
    </table>`;

  function parts(scope: HTMLElement) {
    const controller = scope.querySelector<HTMLInputElement>("[data-checkbox-controls]");
    const members = Array.from(scope.querySelectorAll<HTMLInputElement>('[name="tasks"]'));
    if (!controller) throw new Error("missing controller");
    return { controller, members };
  }

  it("derives the controller from members on init (effect first run is sync)", () => {
    const { controller } = parts(render(GROUP));
    expect(controller.indeterminate).toBe(true);
    expect(controller.checked).toBe(false);
  });

  it("checks and unchecks every member from the controller", async () => {
    const { controller, members } = parts(render(GROUP));
    await change(controller, true);
    expect(members.every((member) => member.checked)).toBe(true);
    expect(controller.indeterminate).toBe(false);
    expect(controller.checked).toBe(true);
    await change(controller, false);
    expect(members.some((member) => member.checked)).toBe(false);
    expect(controller.indeterminate).toBe(false);
  });

  it("rolls member changes up to the controller", async () => {
    const { controller, members } = parts(render(GROUP));
    await change(members[1] as HTMLInputElement, true);
    expect(controller.checked).toBe(true);
    expect(controller.indeterminate).toBe(false);
    await change(members[0] as HTMLInputElement, false);
    expect(controller.checked).toBe(false);
    expect(controller.indeterminate).toBe(true);
  });

  it("reflects member state onto rows as data-state='selected'", async () => {
    const scope = render(GROUP);
    const { controller, members } = parts(scope);
    const rows = scope.querySelectorAll("tbody tr");
    expect(rows[0]?.getAttribute("data-state")).toBe("selected");
    expect(rows[1]?.hasAttribute("data-state")).toBe(false);
    await change(controller, true);
    expect(rows[1]?.getAttribute("data-state")).toBe("selected");
    await change(members[0] as HTMLInputElement, false);
    expect(rows[0]?.hasAttribute("data-state")).toBe(false);
  });
});
