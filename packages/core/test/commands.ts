"use strict";

/**
 * @fileoverview Custom browser commands for the claims register. Vitest's
 * `userEvent` has no held-button primitive, and `:active` needs one.
 */

import type { BrowserCommand } from "vite-plus/test/node";

/** The slice of the Playwright command context these commands touch. */
interface HeldMouse {
  page: { mouse: { down(): Promise<void>; up(): Promise<void> } };
}

export const mouseDown: BrowserCommand<[]> = async (context) => {
  await (context as unknown as HeldMouse).page.mouse.down();
};

export const mouseUp: BrowserCommand<[]> = async (context) => {
  await (context as unknown as HeldMouse).page.mouse.up();
};

/** The slice of the Playwright command context the media emulation touches. */
interface WithPage {
  page: import("playwright").Page;
}

/**
 * Emulates a touch-only device (Chromium CDP), so `(hover: hover)` is false.
 * Emulation overrides end with their session, so the
 * session stays open for the page's life.
 */
const cdpSessions = new WeakMap<object, Promise<import("playwright").CDPSession>>();

export const emulateTouch: BrowserCommand<[enabled: boolean]> = async (context, enabled) => {
  const page = (context as unknown as WithPage).page;
  let session = cdpSessions.get(page);
  if (!session) {
    session = page.context().newCDPSession(page);
    cdpSessions.set(page, session);
  }
  const cdp = await session;
  const { width, height } = page.viewportSize() ?? { width: 1024, height: 800 };
  if (enabled) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  } else {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await cdp.send("Emulation.clearDeviceMetricsOverride");
  }
};
