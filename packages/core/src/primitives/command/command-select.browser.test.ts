"use strict";

/**
 * @fileoverview The command palette's script in a real browser (happy-dom has
 * no popover): what activating an item does to the panel.
 */

import { describe, expect, it } from "vite-plus/test";
import { frame, mount } from "../../../test/browser.ts";
import "./command.ts";

describe("command select", () => {
  it('closes the panel on activation, unless the item has data-command-select-behavior="persist"', async () => {
    const stays = async (attributes: string) => {
      const root = mount(`<ui-command><div data-command-slot="panel" popover="manual">
        <input data-command-slot="input" role="combobox" />
        <div role="listbox" data-command-slot="list">
          <button role="option" data-command-slot="item" ${attributes}>a</button>
        </div>
      </div></ui-command>`);
      const panel = root.querySelector<HTMLElement>("[popover]")!;
      panel.showPopover();
      await frame();
      root.querySelector<HTMLElement>("[data-command-slot='item']")!.click();
      return panel.matches(":popover-open");
    };
    expect(await stays("")).toBe(false);
    expect(await stays('data-command-select-behavior="close"')).toBe(false);
    expect(await stays('data-command-select-behavior="persist"')).toBe(true);
  });
});
