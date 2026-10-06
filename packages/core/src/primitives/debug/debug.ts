"use strict";

/**
 * @fileoverview `<ui-debug>`: audits utilities in `style` attributes.
 * @description Development only. On a listed domain the element walks every
 * element once, and again on mutation, and warns about the mistakes the
 * generated gates cannot report: an unknown utility, a wrong mode, a tier without
 * a base, a modifier the family lacks, a base utility that flattens a state a
 * primitive's hook covers, a raw property shadowing a utility, a
 * whitespace form the gates cannot match, and a `data-<name>-*` attribute
 * outside its identity. On an unlisted domain it removes itself and logs
 * {@link DEBUG_WARNING} once. Identities and hooks are read from the page's
 * stylesheets, so the audit needs no manifest. The checks live in
 * `audit-core.ts`, which the html lint rules (`@zazz-ui/eslint-plugin`) share.
 * @example
 * <ui-debug data-debug-domains="localhost, staging.example.com"></ui-debug>
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";
import {
  auditNode,
  auditPersistence,
  carriesIdentity,
  type AuditNode,
  type RuleId,
} from "./audit-core.ts";

export interface Warning {
  el: Element;
  message: string;
  rule: RuleId;
}

export interface AuditOptions {
  /** State-bearing hooks per identity as `<utility>--<state>` (`bg--hover`); default: the page's stylesheets. */
  hooks?: Record<string, string[]>;
  /** Identity tokens the kit declares (`button`, `field-group`); default: the page's stylesheets. */
  identities?: string[];
}

/** A live element as the audit core reads it. */
function auditNodeOf(el: Element): AuditNode {
  return {
    getAttribute: (name) => el.getAttribute(name),
    getAttributeNames: () => el.getAttributeNames(),
    withinIdentity: (name, identities) => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        if (carriesIdentity(node.tagName, node.getAttribute("data-ui"), name, identities))
          return true;
      }
      return false;
    },
  };
}

/** Identity tokens and state-bearing hooks, read from the page's stylesheets. */
function fromStylesheets(): { identities: string[]; hooks: Record<string, string[]> } {
  const identities = new Set<string>();
  const hooks: Record<string, string[]> = {};
  const hookPattern =
    /--ui-([a-z]+(?:-[a-z]+)*?)-([a-z-]+?)--(hover|active|focus-visible|focus-within|checked|open|disabled)\b/g;
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      const text = rule.cssText;
      for (const m of text.matchAll(/\[data-ui~="([^"]+)"\]/g)) identities.add(m[1]!);
      for (const m of text.matchAll(hookPattern)) {
        const list = (hooks[m[1]!] ??= []);
        if (!list.includes(`${m[2]}--${m[3]}`)) list.push(`${m[2]}--${m[3]}`);
      }
    }
  }
  return { identities: [...identities], hooks };
}

/** Audits every element under `root` (inclusive) and returns the findings. */
export function audit(root: Element, options: AuditOptions = {}): Warning[] {
  const sheets = options.hooks && options.identities ? null : fromStylesheets();
  const resolved: Required<AuditOptions> = {
    hooks: options.hooks ?? sheets!.hooks,
    identities: options.identities ?? sheets!.identities,
  };
  const context = { ...resolved, isColor: (value: string) => CSS.supports("color", value) };
  const found: Warning[] = [];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el.tagName === "UI-DEBUG") continue;
    for (const { message, rule } of auditNode(auditNodeOf(el), context))
      found.push({ el, message, rule });
  }
  return found;
}

export interface Note {
  message: string;
  elements: Element[];
}

/**
 * Calls out what survives an in-page navigation: on a `data-ui-navigation="swap"`
 * page, which `data-ui-persist` elements are kept; warnings for persistence that
 * cannot work as written.
 */
export function navigationReport(doc: Document): { notes: Note[]; warnings: Warning[] } {
  const swap = doc.documentElement.getAttribute("data-ui-navigation") === "swap";
  const persisted = [...doc.querySelectorAll("[data-ui-persist]")];
  const { kept, warnings } = auditPersistence(
    swap,
    persisted,
    (el) => el.getAttribute("data-ui-persist") ?? "",
    (el) => el.parentElement?.closest("[data-ui-persist]") ?? null,
  );
  if (!swap) return { notes: [], warnings };
  const ids = kept.map((el) => `"${el.getAttribute("data-ui-persist")}"`).join(", ");
  const notes: Note[] = [
    {
      message: kept.length
        ? `In-page navigation is on. ${kept.length} element${kept.length === 1 ? "" : "s"} persist across navigations (${ids}); everything else is replaced by the next page.`
        : "In-page navigation is on, and nothing persists: every navigation replaces the whole body.",
      elements: kept,
    },
  ];
  return { notes, warnings };
}

export const DEBUG_WARNING =
  'Style utility debug tools are still loaded in this domain, but not enabled. If this is intentional, you can ignore this warning by setting data-debug-warnings="false".';

let warnedOnce = false;

class UiDebug extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    const domains = (this.getAttribute("data-debug-domains") ?? "")
      .split(",")
      .map((domain) => domain.trim())
      .filter(Boolean);
    if (!domains.includes(location.hostname)) {
      if (this.getAttribute("data-debug-warnings") !== "false" && !warnedOnce) {
        warnedOnce = true;
        console.warn(DEBUG_WARNING);
      }
      this.remove();
      return;
    }
    const reported = new WeakMap<Element, Set<string>>();
    const navigation = navigationReport(document);
    for (const { message, elements } of navigation.notes)
      console.info(`[ui-debug] ${message}`, ...elements);
    const report = () => {
      for (const { el, message } of [
        ...audit(document.body),
        ...navigationReport(document).warnings,
      ]) {
        const seen = reported.get(el) ?? new Set<string>();
        if (seen.has(message)) continue;
        seen.add(message);
        reported.set(el, seen);
        console.warn(`[ui-debug] ${message}`, el);
      }
    };
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        report();
      });
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "data-ui"],
      childList: true,
      subtree: true,
    });
    signal.addEventListener("abort", () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    });
    report();
  }
}

defineZazzElement("ui-debug", UiDebug);

export { UiDebug };
