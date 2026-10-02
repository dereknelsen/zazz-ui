"use strict";

/**
 * @fileoverview Style guard: keeps utilities alive when scripts rewrite the whole `style` attribute.
 * @description Optional, production. A `MutationObserver` on `style` snapshots each
 * element's `--` declarations on first sight and re-applies them only when one
 * write drops every one of them at once — the `el.style.cssText = …` and
 * jQuery `.attr('style', …)` signature. A single `removeProperty('--p')` is a
 * choice and stays removed (with a single utility, "all" and "one" coincide: the guard
 * tells them apart by whether the other declarations survived the write).
 * `data-ui-guard="off"` opts an element out. A template
 * that emits two `style` attributes cannot be repaired (the parser keeps the
 * first); that is an authoring error.
 * @example
 * <script type="module" src="/zazz/primitives/style-guard/style-guard.js"></script>
 * <!-- guards document.body once the DOM is ready -->
 */

/** name → [value, priority] for every `--` declaration on the element. */
type Utilities = Map<string, [string, string]>;

const snapshots = new WeakMap<Element, Utilities>();

type Styled = Element & ElementCSSInlineStyle;

function utilitiesOf(el: Styled): Utilities {
  const utilities: Utilities = new Map();
  const style = el.style;
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    if (name.startsWith("--")) {
      utilities.set(name, [style.getPropertyValue(name), style.getPropertyPriority(name)]);
    }
  }
  return utilities;
}

/** Parses the `--` declarations out of a raw `style` attribute value. */
function utilitiesIn(text: string | null): Utilities {
  const utilities: Utilities = new Map();
  if (!text) return utilities;
  for (const declaration of text.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    const name = declaration.slice(0, colon).trim();
    if (!name.startsWith("--")) continue;
    let value = declaration.slice(colon + 1).trim();
    let priority = "";
    if (/!\s*important$/i.test(value)) {
      value = value.replace(/!\s*important$/i, "").trim();
      priority = "important";
    }
    utilities.set(name, [value, priority]);
  }
  return utilities;
}

/** The non-utility declarations of a `style` text, normalized, for telling a rewrite from a removal. */
function rawOf(text: string | null): string {
  return (text ?? "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration && !declaration.startsWith("--"))
    .sort()
    .join(";");
}

function isGuarded(el: Node): el is Styled {
  return el instanceof Element && "style" in el && el.getAttribute("data-ui-guard") !== "off";
}

let observer: MutationObserver | null = null;
let guardedRoot: Element | null = null;

/**
 * Reconciles one element after a `style` write: a write that drops every utility at
 * once is restored; anything else (a targeted removal, new utilities) becomes the new
 * snapshot.
 */
function reconcile(el: Styled, previous: Utilities | undefined, oldValue: string | null): void {
  const current = utilitiesOf(el);
  const droppedAll = previous !== undefined && previous.size > 0 && current.size === 0;
  // one utility removed on its own leaves every other declaration untouched: a choice, not a rewrite
  const singleRemoval =
    droppedAll && previous.size === 1 && rawOf(oldValue) === rawOf(el.getAttribute("style"));
  if (droppedAll && !singleRemoval) {
    for (const [name, [value, priority]] of previous) el.style.setProperty(name, value, priority);
    return;
  }
  snapshots.set(el, current);
}

function onMutations(records: MutationRecord[]): void {
  for (const record of records) {
    const el = record.target;
    if (!isGuarded(el)) continue;
    reconcile(el, snapshots.get(el) ?? utilitiesIn(record.oldValue), record.oldValue);
  }
}

/**
 * @namespace StyleGuard
 * @property {Function} start - Guards `root` (default `document.body`); idempotent for the same root, re-roots otherwise.
 * @property {Function} stop - Disconnects the guard.
 * @property {Function} restore - Re-applies `el`'s snapshot by hand.
 */
const StyleGuard = {
  start(root: Element = document.body): void {
    if (observer && guardedRoot === root) return;
    if (observer) StyleGuard.stop();
    guardedRoot = root;
    for (const el of root.querySelectorAll('[style*="--"]')) {
      if (isGuarded(el)) snapshots.set(el, utilitiesOf(el));
    }
    observer = new MutationObserver(onMutations);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["style"],
      attributeOldValue: true,
      subtree: true,
    });
  },
  stop(): void {
    observer?.disconnect();
    observer = null;
    guardedRoot = null;
  },
  restore(el: Styled): void {
    const previous = snapshots.get(el);
    if (!previous) return;
    for (const [name, [value, priority]] of previous) el.style.setProperty(name, value, priority);
  },
};

// Auto-initialize in the browser once the DOM is ready
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => StyleGuard.start());
  } else {
    StyleGuard.start();
  }
}

declare global {
  interface Window {
    StyleGuard: typeof StyleGuard;
  }
}
if (typeof window !== "undefined") {
  window.StyleGuard = StyleGuard;
}

export { StyleGuard };
