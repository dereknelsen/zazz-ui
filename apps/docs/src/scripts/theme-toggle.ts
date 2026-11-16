/**
 * `<theme-toggle>`: the light / dark / system choice in
 * components/ThemeToggle.astro, as radios (the toggle group) or as a menu of
 * buttons (`variant="menu"`, the narrow header). A stored choice pins `data-theme` on `<html>`
 * (the kit's head script restores it before first paint); "system" clears it so
 * the page follows the OS scheme.
 *
 * Each instance names its radios uniquely on setup. A swap navigation connects
 * the destination's body beside the live one before moving the persisted
 * header into it, and radios sharing a name in one document form one group:
 * the incoming copy would uncheck the live header's choice.
 *
 * A custom element because swap navigation never runs a swapped-in page's
 * scripts (the mobile menu's toggle is re-rendered on every page).
 * ThemeToggle.astro loads this module, and the header puts it on every page.
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

/**
 * Shows `value` as the choice in every toggle on the page: the radio and the
 * menu item's pressed state. The trigger's icon and the check marks follow
 * `data-theme` in CSS (styles/site.css), so they are right before this runs.
 */
function sync(value: string): void {
  for (const input of document.querySelectorAll<HTMLInputElement>("theme-toggle input")) {
    input.checked = input.value === value;
  }
  for (const option of document.querySelectorAll<HTMLElement>("theme-toggle [data-theme-option]")) {
    option.setAttribute("aria-pressed", String(option.dataset.themeOption === value));
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
    sync(stored());
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
    // The menu variant: an item sets the theme and closes the menu.
    this.addEventListener(
      "click",
      (event) => {
        const option = (event.target as Element).closest<HTMLElement>("[data-theme-option]");
        const value = option?.dataset.themeOption;
        if (!value) return;
        withoutTransitions(() => {
          apply(value);
          sync(value);
        });
        option.closest<HTMLElement>("[popover]")?.hidePopover();
      },
      { signal },
    );
  }
}

defineZazzElement("theme-toggle", ThemeToggle);
