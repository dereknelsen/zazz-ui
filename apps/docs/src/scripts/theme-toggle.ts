/**
 * `<theme-toggle>`: the light / dark / system radios in
 * components/ThemeToggle.astro. A stored choice pins `data-theme` on `<html>`
 * (the kit's head script restores it before first paint); "system" clears it so
 * the page follows the OS scheme.
 *
 * Each instance names its radios uniquely on setup. A swap navigation connects
 * the destination's body beside the live one before moving the persisted
 * header into it, and radios sharing a name in one document form one group:
 * the incoming copy would uncheck the live header's choice.
 *
 * A custom element because swap navigation never runs a swapped-in page's
 * scripts (the mobile menu's toggle is re-rendered on every page); BaseLayout
 * defines it on every page.
 */
import { ZazzElement, defineZazzElement } from "@zazz-ui/core/base/zazz-element.ts";

const KEY = "theme";
const root = document.documentElement;
let instances = 0;

/** `*` alone misses pseudo-elements, which would keep fading between schemes. */
const noTransitions = document.createElement("style");
noTransitions.textContent = "*, ::before, ::after { transition: none !important; }";

function stored(): string {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return root.dataset.theme ?? "system";
  }
}

function apply(value: string): void {
  if (value === "light" || value === "dark") root.dataset.theme = value;
  else delete root.dataset.theme;
  try {
    if (value === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    /* no storage: the choice lasts for this page */
  }
}

/** Checks `value` in every toggle on the page. */
function sync(value: string): void {
  for (const input of document.querySelectorAll<HTMLInputElement>("theme-toggle input")) {
    input.checked = input.value === value;
  }
}

/**
 * Runs `change` with transitions off, so the new scheme lands in one frame.
 * Reading a computed style flushes the pending style change while the sheet
 * still applies; removed without that flush, the browser would never see it.
 */
function withoutTransitions(change: () => void): void {
  document.head.append(noTransitions);
  change();
  void getComputedStyle(root).colorScheme;
  noTransitions.remove();
}

class ThemeToggle extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    const name = `theme-toggle-${++instances}`;
    const inputs = this.querySelectorAll<HTMLInputElement>("input[type='radio']");
    for (const input of inputs) input.name = name;
    const value = stored();
    for (const input of inputs) input.checked = input.value === value;
    this.addEventListener(
      "change",
      (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        withoutTransitions(() => {
          apply(input.value);
          sync(input.value);
        });
      },
      { signal },
    );
  }
}

defineZazzElement("theme-toggle", ThemeToggle);
