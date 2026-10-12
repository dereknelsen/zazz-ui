"use strict";

/**
 * @fileoverview `--transition-duration` and `--transition-delay`: longhands that
 * win over `--transition` and over a primitive's own transition, with state and
 * breakpoint tiers like the other paint utilities.
 */

import { describe, expect, it } from "vite-plus/test";
import { mount, style, useKit } from "../../test/browser.ts";

describe("transition timing utilities", () => {
  useKit();

  it("retimes --transition without restating its property list", () => {
    const el = mount(
      `<p style="--transition: opacity 1s linear; --transition-duration: 2s; --transition-delay: 0.5s">x</p>`,
    );
    expect(style(el, "transition-property")).toBe("opacity");
    expect(style(el, "transition-duration")).toBe("2s");
    expect(style(el, "transition-delay")).toBe("0.5s");
  });

  it("retimes a primitive's own transition", () => {
    const el = mount(`<button data-ui="button" style="--transition-duration: 2s">x</button>`);
    const durations = style(el, "transition-duration").split(", ");
    expect(new Set(durations)).toEqual(new Set(["2s"]));
  });

  it("takes breakpoint tiers from the nearest container", () => {
    const root = mount(`<div data-ui="container" style="inline-size: 100ch">
      <p style="--transition-duration: 1s; --transition-duration--md: 3s">x</p>
    </div>`);
    expect(style(root.querySelector("p")!, "transition-duration")).toBe("3s");
    const narrow = mount(`<div data-ui="container" style="inline-size: 10ch">
      <p style="--transition-duration: 1s; --transition-duration--md: 3s">x</p>
    </div>`);
    expect(style(narrow.querySelector("p")!, "transition-duration")).toBe("1s");
  });
});
