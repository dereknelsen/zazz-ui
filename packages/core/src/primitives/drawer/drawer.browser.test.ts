"use strict";

/**
 * @fileoverview The drawer: a bottom sheet alone, a dialog that becomes one on
 * a touch phone when combined, and drag-to-dismiss (distance, flick, snap
 * back, resistance, scroll handoff, no-drag targets).
 */

import { describe, expect, it } from "vite-plus/test";
import { commands, server } from "vite-plus/test/browser/context";
import { atWidth, below, frame, mount, style, useCss, useKit } from "../../../test/browser.ts";
import { drag, pointerUp } from "../../../test/pointer.ts";
import "../../base/dialog-lifecycle.ts";
import { swapBody } from "../../base/navigation.ts";
import { refreshAll } from "../../base/zazz-element.ts";
import { snapDrawer } from "./drawer.ts";

const held = commands as unknown as { emulateTouch(enabled: boolean): Promise<void> };

const STANDALONE = `<dialog data-ui="drawer" closedby="any">
    <div data-drawer-slot="handle"></div>
    <div data-drawer-slot="content">
      <header data-drawer-slot="header"><h2>Title</h2></header>
      <div data-drawer-slot="body">
        <p>Body</p>
        <input name="field" />
        <div data-draggable="false" style="block-size: 40px">no drag</div>
      </div>
      <footer data-drawer-slot="footer"><button type="button">Done</button></footer>
    </div>
  </dialog>`;

const TALL = `<dialog data-ui="drawer" closedby="any">
    <div data-drawer-slot="handle"></div>
    <div data-drawer-slot="content">
      <header data-drawer-slot="header"><h2>Title</h2></header>
      <div data-drawer-slot="body"><div style="block-size: 3000px">Long</div></div>
    </div>
  </dialog>`;

const COMBINED = `<dialog data-ui="dialog drawer" closedby="any">
    <div data-drawer-slot="handle"></div>
    <div data-dialog-slot="content">
      <header data-dialog-slot="header"><h2>Title</h2></header>
      <div data-dialog-slot="body"><p>Body</p></div>
      <footer data-dialog-slot="footer"><button type="button">Done</button></footer>
    </div>
  </dialog>`;

/** Mounts and opens a drawer, bound and laid out. */
async function open(html: string): Promise<HTMLDialogElement> {
  const dialog = mount(html) as HTMLDialogElement;
  dialog.showModal();
  await frame();
  return dialog;
}

const part = (dialog: Element, slot: string) =>
  dialog.querySelector(`[data-drawer-slot~="${slot}"], [data-dialog-slot~="${slot}"]`)!;
const translateY = (dialog: Element) =>
  Number.parseFloat(style(dialog, "translate").split(" ")[1] ?? "0") || 0;

describe("drawer", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  it("alone, it is a bottom sheet at any width: anchored, top corners rounded, handle shown", async () => {
    await atWidth(1280);
    const dialog = await open(STANDALONE);
    const box = dialog.getBoundingClientRect();
    expect(style(dialog, "--_drawer-mode").trim()).toBe("1");
    // the sheet runs past the bottom edge by its bleed, so its content ends at the edge
    expect(box.bottom).toBeGreaterThan(window.innerHeight);
    expect(part(dialog, "content").getBoundingClientRect().bottom).toBeCloseTo(
      window.innerHeight,
      0,
    );
    expect(box.left).toBeCloseTo(0, 0);
    expect(box.width).toBeCloseTo(window.innerWidth, 0);
    expect(Number.parseFloat(style(dialog, "border-start-start-radius"))).toBeGreaterThan(0);
    expect(style(dialog, "border-end-end-radius")).toBe("0px");
    expect(style(part(dialog, "handle"), "display")).toBe("block");
    expect(style(part(dialog, "body"), "overflow-y")).toBe("auto");
    dialog.close();
  });

  it("a tall drawer stops short of the top and its body scrolls", async () => {
    await atWidth(1280);
    const dialog = await open(TALL);
    expect(dialog.getBoundingClientRect().top).toBeGreaterThan(0);
    const body = part(dialog, "body");
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    dialog.close();
  });

  it("on a dialog, it stays a plain dialog with a mouse: centered, no handle, no drag", async () => {
    await atWidth(1280);
    const dialog = await open(COMBINED);
    const box = dialog.getBoundingClientRect();
    expect(style(dialog, "--_drawer-mode").trim()).toBe("");
    expect(box.top + box.height / 2).toBeCloseTo(window.innerHeight / 2, 0);
    expect(style(part(dialog, "handle"), "display")).toBe("none");
    await drag(part(dialog, "header"), { dy: 300, hold: 150 });
    expect(dialog.open).toBe(true);
    expect(dialog.style.translate).toBe("");
    dialog.close();
  });

  // Touch emulation is a CDP session: Chromium only.
  it.skipIf(server.browser !== "chromium")(
    "on a dialog, it is a bottom sheet below the sm band on a touch screen, and drags",
    async () => {
      await atWidth(below("sm"));
      await held.emulateTouch(true);
      try {
        const dialog = await open(COMBINED);
        const box = dialog.getBoundingClientRect();
        expect(style(dialog, "--_drawer-mode").trim()).toBe("1");
        expect(box.width).toBeCloseTo(window.innerWidth, 0);
        expect(box.top).toBeGreaterThan(window.innerHeight / 3);
        expect(part(dialog, "content").getBoundingClientRect().bottom).toBeCloseTo(
          window.innerHeight,
          0,
        );
        expect(style(part(dialog, "handle"), "display")).toBe("block");
        expect(style(dialog, "border-end-end-radius")).toBe("0px");
        expect(Number.parseFloat(style(dialog, "border-start-start-radius"))).toBeGreaterThan(0);
        await drag(part(dialog, "header"), { dy: 300, hold: 150, pointerType: "touch" });
        expect(dialog.open).toBe(false);
      } finally {
        await held.emulateTouch(false);
      }
    },
  );

  describe("dragging", () => {
    it("follows the pointer 1:1 downward, fades the backdrop, and resists upward", async () => {
      await atWidth(1280);
      const dialog = await open(STANDALONE);
      // the drag starts at the first move (10px), so 40px of travel remain
      const down = await drag(part(dialog, "header"), { dy: 50, steps: 5, keepDown: true });
      expect(dialog.getAttribute("data-drawer-state")).toBe("dragging");
      expect(translateY(dialog)).toBeCloseTo(40, 1);
      const faded = Number.parseFloat(getComputedStyle(dialog, "::backdrop").opacity);
      expect(faded).toBeLessThan(1);
      expect(faded).toBeGreaterThan(0);
      await new Promise((resolve) => setTimeout(resolve, 150));
      pointerUp(down);
      expect(dialog.open).toBe(true);
      expect(dialog.hasAttribute("data-drawer-state")).toBe(false);
      expect(dialog.style.translate).toBe("");

      const up = await drag(part(dialog, "header"), { dy: -400, steps: 5, keepDown: true });
      const bleed = -Number.parseFloat(style(dialog, "margin-block-end"));
      expect(translateY(dialog)).toBeLessThan(0);
      expect(translateY(dialog)).toBeGreaterThan(-bleed);
      pointerUp(up);
      expect(dialog.open).toBe(true);
      dialog.close();
    });

    it("a slow drag past a quarter of the height closes it, through cancel and close", async () => {
      await atWidth(1280);
      const dialog = await open(STANDALONE);
      const events: string[] = [];
      dialog.addEventListener("cancel", () => events.push("cancel"));
      dialog.addEventListener("close", () => events.push("close"));
      const quarter = dialog.getBoundingClientRect().height / 4;
      await drag(part(dialog, "header"), { dy: quarter * 2, hold: 150 });
      expect(dialog.open).toBe(false);
      await frame();
      expect(events).toEqual(["cancel", "close"]);
    });

    it("a short slow drag returns to rest", async () => {
      await atWidth(1280);
      const dialog = await open(STANDALONE);
      await drag(part(dialog, "header"), { dy: 24, hold: 150 });
      expect(dialog.open).toBe(true);
      expect(dialog.style.translate).toBe("");
      dialog.close();
    });

    it("a quick flick closes it over a short distance", async () => {
      await atWidth(1280);
      const dialog = await open(STANDALONE);
      await drag(part(dialog, "header"), { dy: 40, steps: 4, interval: 6 });
      expect(dialog.open).toBe(false);
    });

    it("a cancel handler that keeps the dialog open sends the drawer back to rest", async () => {
      await atWidth(1280);
      const dialog = await open(STANDALONE);
      dialog.addEventListener("cancel", (event) => event.preventDefault());
      await drag(part(dialog, "header"), { dy: 300, hold: 150 });
      expect(dialog.open).toBe(true);
      expect(dialog.style.translate).toBe("");
      dialog.close();
    });

    it("scrolling content goes first: no drag while it is scrolled, a drag from the top, the handle always", async () => {
      await atWidth(1280);
      const dialog = await open(TALL);
      const body = part(dialog, "body");
      body.scrollTop = 200;
      // let the scroll event land, then outlast the scroll guard
      await new Promise((resolve) => setTimeout(resolve, 200));
      await drag(body, { dy: 400, hold: 150 });
      expect(dialog.open).toBe(true);
      expect(dialog.style.translate).toBe("");

      // from the top, an upward pull belongs to the scroller
      body.scrollTop = 0;
      await new Promise((resolve) => setTimeout(resolve, 200));
      const up = await drag(body, { dy: -100, keepDown: true });
      expect(dialog.hasAttribute("data-drawer-state")).toBe(false);
      pointerUp(up);

      body.scrollTop = 200;
      await new Promise((resolve) => setTimeout(resolve, 200));
      const handle = await drag(part(dialog, "handle"), { dy: 60, keepDown: true });
      expect(dialog.getAttribute("data-drawer-state")).toBe("dragging");
      pointerUp(handle);

      body.scrollTop = 0;
      await new Promise((resolve) => setTimeout(resolve, 200));
      await drag(body, { dy: 500, hold: 150 });
      expect(dialog.open).toBe(false);
    });

    it('form fields, [data-draggable="false"], and the backdrop never start a drag', async () => {
      await atWidth(1280);
      const dialog = await open(STANDALONE);
      for (const target of [
        dialog.querySelector("input")!,
        dialog.querySelector('[data-draggable="false"]')!,
      ]) {
        const down = await drag(target, { dy: 80, keepDown: true });
        expect(dialog.hasAttribute("data-drawer-state")).toBe(false);
        pointerUp(down);
      }
      const backdrop = await drag(dialog, { from: { x: 20, y: 20 }, dy: 200, keepDown: true });
      expect(dialog.hasAttribute("data-drawer-state")).toBe(false);
      pointerUp(backdrop);
      expect(dialog.open).toBe(true);
      dialog.close();
    });
  });
});

const SNAP = `<dialog data-ui="drawer" data-drawer-snap="150px 0.5 1" closedby="any">
    <button type="button" data-drawer-slot="handle" aria-label="Resize"></button>
    <div data-drawer-slot="content">
      <header data-drawer-slot="header"><h2>Title</h2></header>
      <div data-drawer-slot="body"><div style="block-size: 3000px">Long</div></div>
    </div>
  </dialog>`;

/** The drawer's visible height: from its top edge to the bottom of the viewport. */
const visible = (dialog: Element) => window.innerHeight - dialog.getBoundingClientRect().top;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("drawer snap points", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  it("opens at the smallest stop, as tall as a drawer may be, with its content held still", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    expect(visible(dialog)).toBeCloseTo(150, 0);
    expect(dialog.getAttribute("data-drawer-state")).toBe("partial");
    expect(style(part(dialog, "body"), "overflow-y")).toBe("hidden");
    expect(dialog.style.translate).toBe("");
    dialog.close();
  });

  it("settles on the nearest stop, reports it, and expands at the largest", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    const full = dialog.offsetHeight + Number.parseFloat(style(dialog, "margin-block-end"));
    const snaps: { index: number; value: number }[] = [];
    dialog.addEventListener("zazz:drawer-snap", (event) => {
      snaps.push((event as CustomEvent).detail);
    });

    // from 150px, a slow pull to just short of half the height lands on the half stop
    await drag(part(dialog, "header"), { dy: -(full / 2 - 150 - 20), steps: 6, hold: 150 });
    expect(visible(dialog)).toBeCloseTo(full / 2, 0);
    expect(snaps.at(-1)?.index).toBe(1);
    expect(snaps.at(-1)?.value).toBeCloseTo(full / 2, 0);
    expect(dialog.style.translate).toBe("");

    // a slow pull the rest of the way expands it, and the content scrolls again
    await drag(part(dialog, "header"), { dy: -(full / 2 - 20), steps: 6, hold: 150 });
    expect(visible(dialog)).toBeCloseTo(full, 0);
    expect(dialog.getAttribute("data-drawer-state")).toBe("expanded");
    expect(style(part(dialog, "body"), "overflow-y")).toBe("auto");
    expect(snaps.map((snap) => snap.index)).toEqual([1, 2]);
    dialog.close();
  });

  it("below the largest stop the drawer moves both ways from its content; a small move returns", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    const up = await drag(part(dialog, "body"), { dy: -60, keepDown: true });
    expect(dialog.getAttribute("data-drawer-state")).toContain("dragging");
    expect(visible(dialog)).toBeGreaterThan(150);
    await sleep(150);
    pointerUp(up);
    expect(visible(dialog)).toBeCloseTo(150, 0);
    dialog.close();
  });

  it("a flick moves one stop; a flick down from the smallest closes it", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    const full = dialog.offsetHeight + Number.parseFloat(style(dialog, "margin-block-end"));
    await drag(part(dialog, "header"), { dy: -50, steps: 4, interval: 12 });
    expect(visible(dialog)).toBeCloseTo(full / 2, 0);
    await drag(part(dialog, "header"), { dy: 50, steps: 4, interval: 12 });
    expect(visible(dialog)).toBeCloseTo(150, 0);
    await drag(part(dialog, "header"), { dy: 50, steps: 4, interval: 12 });
    expect(dialog.open).toBe(false);
  });

  it("a very fast flick skips to the largest stop, unless the drawer is sequential", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    const full = dialog.offsetHeight + Number.parseFloat(style(dialog, "margin-block-end"));
    await drag(part(dialog, "header"), { dy: -120, steps: 3, interval: 4 });
    expect(visible(dialog)).toBeCloseTo(full, 0);
    dialog.close();
    await frame();

    const sequential = await open(
      SNAP.replace("closedby", 'data-drawer-snap-behavior="sequential" closedby'),
    );
    await drag(part(sequential, "header"), { dy: -120, steps: 3, interval: 4 });
    expect(visible(sequential)).toBeCloseTo(full / 2, 0);
    sequential.close();
  });

  it("the handle steps through the stops and wraps; snapDrawer moves it from script", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    const full = dialog.offsetHeight + Number.parseFloat(style(dialog, "margin-block-end"));
    const handle = part(dialog, "handle") as HTMLElement;
    handle.click();
    expect(visible(dialog)).toBeCloseTo(full / 2, 0);
    handle.click();
    expect(visible(dialog)).toBeCloseTo(full, 0);
    handle.click();
    expect(visible(dialog)).toBeCloseTo(150, 0);
    snapDrawer(dialog, 2);
    expect(visible(dialog)).toBeCloseTo(full, 0);
    snapDrawer(dialog, 99);
    expect(visible(dialog)).toBeCloseTo(full, 0);
    dialog.close();
  });
});

describe("stacked drawers", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  const scale = (dialog: Element) => Number.parseFloat(style(dialog, "scale")) || 1;

  /** Mounts three drawers side by side in the page; each test opens them in turn. */
  function drawers(): HTMLDialogElement[] {
    const root = mount(`<div>${STANDALONE}${STANDALONE}${STANDALONE}</div>`);
    return [...root.querySelectorAll("dialog")];
  }
  async function show(dialog: HTMLDialogElement): Promise<HTMLDialogElement> {
    dialog.showModal();
    await frame();
    return dialog;
  }

  it("a drawer behind another is scaled back and lifted, once per drawer in front", async () => {
    await atWidth(1280);
    const all = drawers();
    const first = await show(all[0]!);
    const top = first.getBoundingClientRect().top;
    const second = await show(all[1]!);
    expect(first.getAttribute("data-drawer-state")).toBe("stacked");
    expect(second.getAttribute("data-drawer-state")).toBe("nested");
    expect(scale(first)).toBeCloseTo(0.95, 3);
    expect(first.getBoundingClientRect().top).toBeLessThan(top);
    expect(first.getBoundingClientRect().width).toBeCloseTo(window.innerWidth * 0.95, 0);
    // the page is dimmed once
    expect(getComputedStyle(second, "::backdrop").backgroundColor).toBe("rgba(0, 0, 0, 0)");

    const third = await show(all[2]!);
    expect(scale(first)).toBeCloseTo(0.9, 3);
    expect(scale(second)).toBeCloseTo(0.95, 3);

    third.close();
    await frame();
    second.close();
    await frame();
    expect(first.hasAttribute("data-drawer-state")).toBe(false);
    expect(scale(first)).toBe(1);
    expect(first.getBoundingClientRect().top).toBeCloseTo(top, 0);
    first.close();
  });

  it("the drawer behind follows the front drawer's drag and returns with its release", async () => {
    await atWidth(1280);
    const all = drawers();
    const first = await show(all[0]!);
    const second = await show(all[1]!);
    const height = second.getBoundingClientRect().height;
    const down = await drag(part(second, "header"), { dy: height / 3, steps: 5, keepDown: true });
    expect(first.getAttribute("data-drawer-state")).toContain("following");
    expect(scale(first)).toBeGreaterThan(0.95);
    expect(scale(first)).toBeLessThan(1);
    await sleep(150);
    pointerUp({ x: down.x, y: down.y - height / 3 + 12 });
    // released short of a quarter: both are back where they rest
    expect(second.open).toBe(true);
    expect(scale(first)).toBeCloseTo(0.95, 3);
    expect(first.getAttribute("data-drawer-state")).toBe("stacked");

    await drag(part(second, "header"), { dy: height / 2, hold: 150 });
    expect(second.open).toBe(false);
    await frame();
    expect(scale(first)).toBe(1);
    first.close();
  });
});

const PAGE = `<div>
    <ui-drawer-indent><div style="block-size: 3000px">Page</div></ui-drawer-indent>
    <dialog data-ui="drawer" closedby="any">
      <div data-drawer-slot="handle"></div>
      <div data-drawer-slot="content">
        <header data-drawer-slot="header"><h2>Title</h2></header>
        <div data-drawer-slot="body"><p>Body</p></div>
      </div>
    </dialog>
  </div>`;

describe("drawer indent", () => {
  useKit();
  useCss(`dialog, dialog::backdrop, ui-drawer-indent, ui-drawer-indent::before,
    ui-drawer-indent::after { transition: none !important; }`);

  const scale = (element: Element, pseudo?: string) =>
    Number.parseFloat(getComputedStyle(element, pseudo).scale) || 1;

  async function openPage() {
    const root = mount(PAGE);
    const wrapper = root.querySelector<HTMLElement>("ui-drawer-indent")!;
    const dialog = root.querySelector("dialog")!;
    const before = getComputedStyle(wrapper);
    const rest = {
      radius: before.borderRadius,
      overflow: before.overflow,
      width: wrapper.offsetWidth,
    };
    dialog.showModal();
    await frame();
    return { wrapper, dialog, rest };
  }

  it("the page scales back from the top of the viewport, with corner pieces, and nothing else changes", async () => {
    await atWidth(1280);
    const { wrapper, dialog, rest } = await openPage();
    const inset = Number.parseFloat(style(wrapper, "--_drawer-indent-inset"));
    expect(inset).toBeGreaterThan(0);
    expect(wrapper.getAttribute("data-drawer-indent-state")).toBe("on active");
    expect(scale(wrapper)).toBeCloseTo(1 - (inset * 2) / wrapper.offsetWidth, 3);
    const box = wrapper.getBoundingClientRect();
    expect(box.left).toBeCloseTo(inset, 0);
    expect(Number.parseFloat(style(wrapper, "translate").split(" ")[1]!)).toBeGreaterThan(0);
    // the radius is two scaled corner pieces: no border-radius, overflow, or size change
    expect(scale(wrapper, "::before")).toBe(1);
    expect(scale(wrapper, "::after")).toBe(1);
    expect(style(wrapper, "border-radius")).toBe(rest.radius);
    expect(style(wrapper, "overflow")).toBe(rest.overflow);
    expect(wrapper.offsetWidth).toBe(rest.width);
    expect(getComputedStyle(document.body).backgroundColor).toBe("oklch(0 0 0)");
    // a page that paints its own body with a utility still gets the backing
    document.body.setAttribute("style", "--bg: var(--color-background)");
    expect(getComputedStyle(document.body).backgroundColor).toBe("oklch(0 0 0)");
    document.body.removeAttribute("style");

    dialog.close();
    await frame();
    expect(wrapper.hasAttribute("data-drawer-indent-state")).toBe(false);
    expect(style(wrapper, "scale")).toBe("none");
    expect(wrapper.style.length).toBe(0);
  });

  it("follows the drag of the drawer and returns when it is released", async () => {
    await atWidth(1280);
    const { wrapper, dialog } = await openPage();
    const indented = scale(wrapper);
    const height = dialog.getBoundingClientRect().height;
    const down = await drag(part(dialog, "header"), { dy: height / 2, steps: 5, keepDown: true });
    expect(wrapper.getAttribute("data-drawer-indent-state")).toContain("dragging");
    expect(scale(wrapper)).toBeGreaterThan(indented);
    expect(scale(wrapper)).toBeLessThan(1);
    expect(scale(wrapper, "::before")).toBeLessThan(1);
    expect(scale(wrapper, "::before")).toBeGreaterThan(0);
    await sleep(150);
    pointerUp({ x: down.x, y: down.y - height / 2 + 12 });
    expect(dialog.open).toBe(true);
    expect(scale(wrapper)).toBeCloseTo(indented, 4);
    expect(wrapper.getAttribute("data-drawer-indent-state")).toBe("on active");
    dialog.close();
  });

  it("measures from where the page is scrolled to", async () => {
    await atWidth(1280);
    const root = mount(PAGE);
    const wrapper = root.querySelector<HTMLElement>("ui-drawer-indent")!;
    window.scrollTo({ top: 400, behavior: "instant" });
    const top = -wrapper.getBoundingClientRect().top;
    expect(top).toBeGreaterThan(300);
    root.querySelector("dialog")!.showModal();
    await frame();
    expect(Number.parseFloat(style(wrapper, "--_drawer-indent-top"))).toBeCloseTo(top, 0);
    // the viewport's top edge inside the wrapper moves down by the offset only
    const offset = Number.parseFloat(style(wrapper, "translate").split(" ")[1]!);
    expect(wrapper.getBoundingClientRect().top).toBeCloseTo(-top * scale(wrapper) + offset, 0);
    root.querySelector("dialog")!.close();
    window.scrollTo(0, 0);
  });
});

describe("drawer release motion", () => {
  useKit();

  it("a dismissed drawer slides out while still open, then closes", async () => {
    await atWidth(1280);
    const dialog = await open(STANDALONE);
    // let the opening transition finish
    await new Promise((resolve) => setTimeout(resolve, 700));
    const own = Number.parseFloat(style(dialog, "transition-duration")) * 1000;
    expect(own).toBeGreaterThan(300);
    const events: string[] = [];
    dialog.addEventListener("close", () => events.push("close"));
    await drag(part(dialog, "header"), { dy: 120, steps: 4, interval: 6 });
    // a frame or two after the release it is on its way out, not gone
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(dialog.open).toBe(true);
    expect(style(dialog, "display")).not.toBe("none");
    const sliding = Number.parseFloat(style(dialog, "translate").split(" ")[1]);
    // it eases on from what was last painted under the pointer (60 to 90px here)
    expect(sliding).toBeGreaterThan(50);
    expect(sliding).toBeLessThan(dialog.getBoundingClientRect().height);
    expect(Number.parseFloat(getComputedStyle(dialog, "::backdrop").opacity)).toBeLessThan(1);
    await new Promise((resolve) => setTimeout(resolve, own + 300));
    expect(dialog.open).toBe(false);
    expect(events).toEqual(["close"]);

    // the next open starts clean
    dialog.showModal();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(dialog.style.translate).toBe("");
    expect(getComputedStyle(dialog, "::backdrop").opacity).toBe("1");
    expect(part(dialog, "content").getBoundingClientRect().bottom).toBeCloseTo(
      window.innerHeight,
      0,
    );
    dialog.close();
  });

  it("a snap point change eases the drawer to its new stop", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    await sleep(700);
    expect(visible(dialog)).toBeCloseTo(150, 0);
    snapDrawer(dialog, 2);
    await sleep(60);
    const full = dialog.offsetHeight + Number.parseFloat(style(dialog, "margin-block-end"));
    expect(visible(dialog)).toBeGreaterThan(150);
    expect(visible(dialog)).toBeLessThan(full);
    await sleep(700);
    expect(visible(dialog)).toBeCloseTo(full, 0);
    dialog.close();
  });

  it("the drawer behind eases back as another opens, and forward as it slides out", async () => {
    await atWidth(1280);
    const root = mount(`<div>${STANDALONE}${STANDALONE}</div>`);
    const [first, second] = [...root.querySelectorAll("dialog")] as [
      HTMLDialogElement,
      HTMLDialogElement,
    ];
    const scale = () => Number.parseFloat(style(first, "scale")) || 1;
    first.showModal();
    await sleep(700);
    second.showModal();
    await sleep(80);
    expect(scale()).toBeLessThan(1);
    expect(scale()).toBeGreaterThan(0.95);
    await sleep(700);
    expect(scale()).toBeCloseTo(0.95, 3);

    // the front drawer flicked away: the one behind returns while it slides out
    await drag(part(second, "header"), { dy: 120, steps: 4, interval: 6 });
    await sleep(60);
    expect(second.open).toBe(true);
    expect(scale()).toBeGreaterThan(0.95);
    expect(scale()).toBeLessThan(1);
    await sleep(800);
    expect(second.open).toBe(false);
    expect(scale()).toBe(1);
    first.close();
  });

  it("the page eases back with its corners, and stays clipped until it has returned", async () => {
    await atWidth(1280);
    const root = mount(PAGE);
    const wrapper = root.querySelector<HTMLElement>("ui-drawer-indent")!;
    const dialog = root.querySelector("dialog")!;
    const scale = (pseudo?: string) => Number.parseFloat(getComputedStyle(wrapper, pseudo).scale);
    dialog.showModal();
    await sleep(80);
    const target = Number.parseFloat(style(wrapper, "--_drawer-indent-scale"));
    expect(scale()).toBeLessThan(1);
    expect(scale()).toBeGreaterThan(target);
    // the corner pieces grow from nothing with it
    expect(scale("::before")).toBeGreaterThan(0);
    expect(scale("::before")).toBeLessThan(1);
    await sleep(700);
    expect(scale()).toBeCloseTo(target, 4);
    expect(scale("::after")).toBe(1);

    // flicked away: the page returns while the drawer slides out, still clipped and backed
    await drag(part(dialog, "header"), { dy: 120, steps: 4, interval: 6 });
    await sleep(60);
    expect(wrapper.getAttribute("data-drawer-indent-state")).toBe("on");
    expect(scale()).toBeGreaterThan(target);
    expect(scale()).toBeLessThan(1);
    await sleep(800);
    expect(dialog.open).toBe(false);
    expect(wrapper.hasAttribute("data-drawer-indent-state")).toBe(false);
    expect(wrapper.style.length).toBe(0);
  });

  it("a drawer sliding out can be caught and brought back", async () => {
    await atWidth(1280);
    const dialog = await open(STANDALONE);
    await new Promise((resolve) => setTimeout(resolve, 700));
    await drag(part(dialog, "header"), { dy: 120, steps: 4, interval: 6 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    // press again where the header is now, pull it back up, and hold before letting go
    await drag(part(dialog, "header"), { dy: -400, steps: 6, hold: 150 });
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(dialog.open).toBe(true);
    expect(dialog.style.translate).toBe("");
    dialog.close();
  });
});

describe("drawer and the software keyboard", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  /** A stand-in visual viewport: the keyboard is the part of the layout viewport below it. */
  function fakeViewport() {
    const target = new EventTarget() as EventTarget & {
      height: number;
      offsetTop: number;
      scale: number;
    };
    Object.assign(target, { height: window.innerHeight, offsetTop: 0, scale: 1 });
    const real = Object.getOwnPropertyDescriptor(window, "visualViewport");
    Object.defineProperty(window, "visualViewport", { configurable: true, value: target });
    const keyboard = async (px: number) => {
      target.height = window.innerHeight - px;
      target.dispatchEvent(new Event("resize"));
      await frame();
      await frame();
    };
    const restore = () => {
      if (real) Object.defineProperty(window, "visualViewport", real);
      else delete (window as { visualViewport?: unknown }).visualViewport;
    };
    return { keyboard, restore };
  }

  it("ends the content at the keyboard's top edge, and lets go of it when the keyboard closes", async () => {
    await atWidth(1280);
    const viewport = fakeViewport();
    try {
      const dialog = await open(STANDALONE);
      const content = part(dialog, "content");
      expect(content.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0);

      await viewport.keyboard(300);
      expect(dialog.style.getPropertyValue("--_drawer-keyboard")).toBe("300px");
      expect(content.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight - 300, 0);

      await viewport.keyboard(0);
      expect(dialog.style.getPropertyValue("--_drawer-keyboard")).toBe("");
      expect(content.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0);

      await viewport.keyboard(300);
      dialog.close();
      await frame();
      expect(dialog.style.getPropertyValue("--_drawer-keyboard")).toBe("");
    } finally {
      viewport.restore();
    }
  });

  it("ignores a pinch-zoomed viewport", async () => {
    await atWidth(1280);
    const viewport = fakeViewport();
    try {
      const dialog = await open(STANDALONE);
      (window.visualViewport as unknown as { scale: number }).scale = 2;
      await viewport.keyboard(300);
      expect(dialog.style.getPropertyValue("--_drawer-keyboard")).toBe("");
      dialog.close();
    } finally {
      viewport.restore();
    }
  });

  it("holds the page behind still while it is open", async () => {
    await atWidth(1280);
    const root = mount(`<div><div style="block-size: 4000px"></div>${STANDALONE}</div>`);
    const dialog = root.querySelector("dialog")!;
    window.scrollTo({ top: 200, behavior: "instant" });
    expect(window.scrollY).toBe(200);
    dialog.showModal();
    await frame();
    window.scrollTo({ top: 600, behavior: "instant" });
    await frame();
    await frame();
    expect(window.scrollY).toBe(200);
    dialog.close();
    await frame();
    window.scrollTo({ top: 600, behavior: "instant" });
    expect(window.scrollY).toBe(600);
    window.scrollTo(0, 0);
  });
});

describe("drawer initial focus", () => {
  useKit();
  useCss(`dialog, dialog::backdrop { transition: none; }`);

  const FIELD_ONLY = `<dialog data-ui="drawer" closedby="any">
    <div data-drawer-slot="content">
      <div data-drawer-slot="body"><input name="field" /><textarea name="notes"></textarea></div>
    </div>
  </dialog>`;

  /** Makes the page a touch screen to script: `(hover: hover)` stops matching. Returns the undo. */
  function touchScreen(): () => void {
    const real = window.matchMedia;
    window.matchMedia = (query: string) =>
      query === "(hover: hover)"
        ? ({ matches: false } as MediaQueryList)
        : real.call(window, query);
    return () => {
      window.matchMedia = real;
    };
  }

  const PICKERS = `<dialog data-ui="drawer" closedby="any">
    <div data-drawer-slot="content">
      <div data-drawer-slot="body">
        <input type="color" name="color" />
        <select name="size"><option>One</option></select>
        <input type="date" name="day" />
        <input type="checkbox" name="agree" />
      </div>
    </div>
  </dialog>`;

  const field = (dialog: Element) => dialog.querySelector<HTMLInputElement>("input")!;

  it("with a mouse, the first field takes focus as in any dialog", async () => {
    await atWidth(1280);
    const dialog = await open(STANDALONE);
    expect(document.activeElement).toBe(field(dialog));
    dialog.close();
  });

  it("on a touch screen, a drawer with a text field takes focus itself", async () => {
    await atWidth(1280);
    const restore = touchScreen();
    try {
      const dialog = mount(STANDALONE) as HTMLDialogElement;
      dialog.showModal();
      // already in place when showModal returns: a caller may focus a field next
      expect(document.activeElement).toBe(dialog);
      expect(dialog.querySelectorAll(":scope [inert]").length).toBe(0);
      field(dialog).focus();
      expect(document.activeElement).toBe(field(dialog));
      dialog.close();
    } finally {
      restore();
    }
  });

  it("on a touch screen, a drawer without fields focuses its first control as in any dialog", async () => {
    await atWidth(1280);
    const restore = touchScreen();
    try {
      const dialog = await open(COMBINED.replace('data-ui="dialog drawer"', 'data-ui="drawer"'));
      expect(document.activeElement).toBe(dialog.querySelector("footer button"));
      dialog.close();
    } finally {
      restore();
    }
  });

  it("a dialog that is not in drawer mode focuses its first field", async () => {
    await atWidth(1280);
    const restore = touchScreen();
    try {
      const dialog = await open(COMBINED.replace("<p>Body</p>", '<input name="field" />'));
      expect(style(dialog, "--_drawer-mode").trim()).toBe("");
      expect(document.activeElement).toBe(field(dialog));
      dialog.close();
    } finally {
      restore();
    }
  });

  it("on a touch screen, a drawer with only picker fields takes focus itself too", async () => {
    await atWidth(1280);
    const restore = touchScreen();
    try {
      const dialog = await open(PICKERS);
      expect(document.activeElement).toBe(dialog);
      expect(dialog.querySelectorAll(":scope [inert]").length).toBe(0);
      dialog.close();
    } finally {
      restore();
    }
  });

  it("on a touch screen, a field with autofocus still takes focus", async () => {
    await atWidth(1280);
    const restore = touchScreen();
    try {
      const dialog = mount(STANDALONE) as HTMLDialogElement;
      field(dialog).autofocus = true;
      dialog.showModal();
      expect(document.activeElement).toBe(field(dialog));
      dialog.close();
    } finally {
      restore();
    }
  });

  it("on a touch screen, an autofocus that cannot take focus does not count", async () => {
    await atWidth(1280);
    const restore = touchScreen();
    try {
      const dialog = mount(STANDALONE) as HTMLDialogElement;
      const done = dialog.querySelector<HTMLButtonElement>("footer button")!;
      done.autofocus = true;
      done.disabled = true;
      dialog.showModal();
      expect(document.activeElement).toBe(dialog);
      dialog.close();
    } finally {
      restore();
    }
  });

  it("what was inert stays inert, and a canceled open leaves the drawer as it was", async () => {
    await atWidth(1280);
    const restore = touchScreen();
    try {
      const dialog = mount(FIELD_ONLY) as HTMLDialogElement;
      const notes = dialog.querySelector("textarea")!;
      notes.inert = true;
      dialog.addEventListener("beforetoggle", (event) => event.preventDefault(), { once: true });
      dialog.showModal();
      expect(dialog.open).toBe(false);
      await sleep(20);
      expect(dialog.querySelectorAll(":scope [inert]").length).toBe(1);
      expect(notes.inert).toBe(true);

      dialog.showModal();
      expect(dialog.open).toBe(true);
      expect(dialog.querySelectorAll(":scope [inert]").length).toBe(1);
      expect(notes.inert).toBe(true);
      dialog.close();
    } finally {
      restore();
    }
  });
});

describe("a drawer that leaves the page while open", () => {
  useKit();

  const TALL_PAGE = `<div><div style="block-size: 4000px"></div>${STANDALONE}</div>`;

  /** Scrolls the page and reports where it ends up once any listener has answered. */
  async function scrollPage(top: number): Promise<number> {
    window.scrollTo({ top, behavior: "instant" });
    await frame();
    await frame();
    return window.scrollY;
  }

  it("lets go of the page when it is removed", async () => {
    await atWidth(1280);
    const root = mount(TALL_PAGE);
    const dialog = root.querySelector("dialog")!;
    window.scrollTo({ top: 200, behavior: "instant" });
    dialog.showModal();
    await frame();
    dialog.remove();
    expect(await scrollPage(600)).toBe(600);
    window.scrollTo(0, 0);
  });

  it("lets go of the page when swap navigation replaces the body", async () => {
    await atWidth(1280);
    const root = mount(TALL_PAGE);
    window.scrollTo({ top: 200, behavior: "instant" });
    root.querySelector("dialog")!.showModal();
    await frame();
    const next = document.createElement("body");
    next.innerHTML = `<div style="block-size: 4000px"></div>`;
    swapBody(next);
    expect(await scrollPage(600)).toBe(600);
    window.scrollTo(0, 0);
  });

  it("lets go of the page when it is removed on its way out", async () => {
    await atWidth(1280);
    const root = mount(TALL_PAGE);
    const dialog = root.querySelector("dialog")!;
    window.scrollTo({ top: 200, behavior: "instant" });
    dialog.showModal();
    await sleep(700);
    const own = Number.parseFloat(style(dialog, "transition-duration")) * 1000;
    await drag(part(dialog, "header"), { dy: 120, steps: 4, interval: 6 });
    await sleep(40);
    expect(dialog.open).toBe(true);
    dialog.remove();
    await sleep(own + 300);
    expect(await scrollPage(600)).toBe(600);
    window.scrollTo(0, 0);
  });

  it("is unbound by the refresh a navigation swap runs, before anything scrolls", async () => {
    await atWidth(1280);
    const dialog = await open(SNAP);
    expect(dialog.getAttribute("data-drawer-state")).toBe("partial");
    const next = document.createElement("body");
    next.innerHTML = `<p>Next page</p>`;
    refreshAll(swapBody(next));
    expect(dialog.hasAttribute("data-drawer-state")).toBe(false);
  });

  it("is not counted behind the next drawer to open", async () => {
    await atWidth(1280);
    const root = mount(`<div>${STANDALONE}${STANDALONE}</div>`);
    const [first, second] = [...root.querySelectorAll("dialog")];
    first!.showModal();
    await frame();
    first!.remove();
    second!.showModal();
    await frame();
    expect(second!.getAttribute("data-drawer-state") ?? "").not.toContain("nested");
    second!.close();
  });
});
