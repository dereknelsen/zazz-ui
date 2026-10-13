"use strict";

/**
 * @fileoverview CSP fallback: applies `style` attributes a Content Security Policy blocked.
 * @description Loaded by `index.ts` only when the page's policy blocks inline
 * style attributes (`style-src-attr` without `'unsafe-inline'`, or a
 * `style-src` without it): the attribute text is still in the DOM, so the
 * kit's `[style*="--p:"]` gates still match, but none of its values apply.
 * CSP does not govern the CSSOM, so this module reads each attribute and
 * writes its declarations with `style.setProperty`, one by one (never
 * `cssText` or `setAttribute`, which the policy blocks), then watches for
 * attributes written later. Utilities then need JavaScript and apply after the
 * module runs; a policy that allows attributes (`style-src-attr
 * 'unsafe-inline'`) needs none of this. `data-ui-guard="off"` opts an element
 * out, as it does for the style guard.
 *
 * Detection never writes a probe: it looks for an element whose attribute
 * holds a declaration while its declaration block is empty, which is what a
 * blocked attribute looks like on load, so the kit never raises a violation
 * report of its own. A blocked write to an element that already has a block
 * (an app's `setAttribute("style", …)` after the fallback ran) leaves the old
 * block in place, so each apply compares the attribute's declarations with
 * the block and rewrites the block only when they differ.
 */

import { plainValue, scanDeclarations } from "./declarations.ts";

type Styled = Element & ElementCSSInlineStyle;

// --- Detection ---

/** True when `el` carries a `style` attribute with a declaration that the policy did not apply. */
function blocked(el: Element): el is Styled {
  if (!("style" in el)) return false;
  const text = el.getAttribute("style");
  return !!text && text.includes(":") && (el as Styled).style.length === 0;
}

/** True when the document's policy blocks inline style attributes (some styled element has an empty declaration block). */
function blockedInlineStyles(root: ParentNode = document): boolean {
  for (const el of root.querySelectorAll("[style]")) if (blocked(el)) return true;
  return false;
}

// --- Apply ---

/** name → [value, priority] of the attribute's declarations, as `setProperty` takes them. */
function declared(text: string): Map<string, [string, string]> {
  const out = new Map<string, [string, string]>();
  for (const declaration of scanDeclarations(text)) {
    if (declaration.colon !== -1) {
      out.set(declaration.name, [plainValue(declaration), declaration.priority]);
    }
  }
  return out;
}

/** True when the declaration block already holds exactly the attribute's declarations. */
function inSync(el: Styled, wanted: Map<string, [string, string]>): boolean {
  const { style } = el;
  if (style.length !== wanted.size) return false;
  for (const [name, [value, priority]] of wanted) {
    if (
      style.getPropertyValue(name).trim() !== value.trim() ||
      style.getPropertyPriority(name) !== priority
    ) {
      return false;
    }
  }
  return true;
}

/** Writes `el`'s `style` attribute into its declaration block through the CSSOM. No-op when the block already matches. */
function applyInlineStyles(el: Element): void {
  if (!("style" in el) || el.getAttribute("data-ui-guard") === "off") return;
  const styled = el as Styled;
  const wanted = declared(el.getAttribute("style") ?? "");
  if (inSync(styled, wanted)) return;
  // a blocked write leaves the previous block behind; the attribute is the truth
  for (const name of [...styled.style].reverse()) styled.style.removeProperty(name);
  for (const [name, [value, priority]] of wanted) styled.style.setProperty(name, value, priority);
}

function applyAll(root: ParentNode): void {
  if (root instanceof Element) applyInlineStyles(root);
  for (const el of root.querySelectorAll("[style]")) applyInlineStyles(el);
}

// --- Observe ---

let observer: MutationObserver | null = null;

function onMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    if (mutation.type === "attributes") applyInlineStyles(mutation.target as Element);
    for (const node of mutation.addedNodes) if (node instanceof Element) applyAll(node);
  }
}

/**
 * @namespace Csp
 * @property {Function} blockedInlineStyles - True when the policy blocks inline style attributes.
 * @property {Function} applyInlineStyles - Applies one element's blocked attribute through the CSSOM.
 * @property {Function} start - Applies every blocked attribute under `root` (default `document.body`) and watches for new ones.
 * @property {Function} stop - Stops watching.
 */
const Csp = {
  blockedInlineStyles,
  applyInlineStyles,
  start(root: Element = document.body): void {
    Csp.stop();
    applyAll(root);
    observer = new MutationObserver(onMutations);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["style"],
      childList: true,
      subtree: true,
    });
  },
  stop(): void {
    observer?.disconnect();
    observer = null;
  },
};

// Auto-initialize in the browser once the DOM is ready (index.ts imports this
// module only when it has already seen a blocked attribute)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => Csp.start());
  } else {
    Csp.start();
  }
}

export { Csp };
