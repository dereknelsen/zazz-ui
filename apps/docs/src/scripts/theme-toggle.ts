/**
 * `<theme-toggle>`: the light / dark / system radios in
 * components/ThemeToggle.astro. A stored choice pins `theme-dark` /
 * `theme-light` in `data-ui` on `<html>` (the kit's head script restores it
 * before first paint); "system" clears both so the page follows the OS scheme.
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

/** The pinned scheme from a `theme-*` switch on `<html>`, if any. */
function pinned(): string | undefined {
  return (root.dataset.ui ?? "")
    .split(/\s+/)
    .find((t) => t === "theme-light" || t === "theme-dark")
    ?.slice("theme-".length);
}

function stored(): string {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return pinned() ?? "system";
  }
}

function apply(value: string): void {
  const tokens = (root.dataset.ui ?? "").split(/\s+/).filter((t) => t && !t.startsWith("theme-"));
  if (value === "light" || value === "dark") tokens.push(`theme-${value}`);
  if (tokens.length) root.dataset.ui = tokens.join(" ");
  else delete root.dataset.ui;
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
        apply(input.value);
        sync(input.value);
      },
      { signal },
    );
  }
}

defineZazzElement("theme-toggle", ThemeToggle);
