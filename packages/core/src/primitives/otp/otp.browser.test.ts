"use strict";

/**
 * @fileoverview The OTP: `data-otp-slot` cells size from the cell
 * hooks in tag and attribute form, and the active cell takes the focus border
 * while the input has focus.
 */

import { describe, expect, it } from "vite-plus/test";
import { lengthPx, mount, settled, style, tabTo, useCss, useKit } from "../../../test/browser.ts";
import "./otp.ts";

const OTP = () => `<input data-ui="input" data-otp-slot="input" inputmode="numeric" />
  <div data-otp-slot="rail">
    <div data-otp-slot="cell" data-otp-state="active"></div>
    <div data-otp-slot="cell" data-idle></div>
  </div>`;

describe("otp", () => {
  useKit();
  useCss(`[data-otp-slot] { transition: none; }`);

  it("sizes cells from the hooks in tag and attribute form", () => {
    const root = mount(`<div>
      <ui-otp data-otp-ready data-tag>${OTP()}</ui-otp>
      <div data-ui="otp" data-otp-ready data-attr>${OTP()}</div>
    </div>`);
    for (const selector of ["[data-tag]", "[data-attr]"]) {
      const cell = root.querySelector(`${selector} [data-idle]`)!;
      expect(Number.parseFloat(style(cell, "inline-size")), selector).toBeCloseTo(
        lengthPx("var(--ui-otp-cell-w)"),
        1,
      );
      expect(style(cell, "display"), selector).toBe("grid");
    }
  });

  it("the active cell takes the focus border while the input has focus", async () => {
    const root = mount(`<ui-otp data-otp-ready>${OTP()}</ui-otp>`);
    const active = root.querySelector("[data-otp-state~='active']")!;
    const idle = root.querySelector("[data-idle]")!;
    expect(style(active, "border-color")).toBe(style(idle, "border-color"));
    await tabTo(root.querySelector("input")!);
    await settled(active);
    expect(style(active, "border-color")).not.toBe(style(idle, "border-color"));
  });

  it('submits the form once the code is complete with data-otp-submit-behavior="auto"', async () => {
    const submits = (attributes: string) => {
      const form = mount(
        `<form><ui-otp ${attributes}><input data-ui="input" data-otp-slot="input" maxlength="2" /></ui-otp></form>`,
      ) as HTMLFormElement;
      let count = 0;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        count++;
      });
      const input = form.querySelector("input")!;
      input.value = "12";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return settled(form).then(() => count);
    };
    expect(await submits("")).toBe(0);
    expect(await submits('data-otp-submit-behavior="manual"')).toBe(0);
    expect(await submits('data-otp-submit-behavior="auto"')).toBe(1);
  });

  it('masks the cells only with data-otp-mask="true"', async () => {
    const shown = async (attributes: string) => {
      const root = mount(
        `<ui-otp ${attributes}><input data-ui="input" data-otp-slot="input" maxlength="2" value="12" /></ui-otp>`,
      );
      await settled(root);
      return root.querySelector("[data-otp-index]")!.textContent;
    };
    expect(await shown("")).toBe("1");
    expect(await shown('data-otp-mask="false"')).toBe("1");
    expect(await shown('data-otp-mask="true"')).toBe("•");
  });
});
