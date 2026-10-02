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
 * stylesheets, so the audit needs no manifest.
 * @example
 * <ui-debug data-debug-domains="localhost, staging.example.com"></ui-debug>
 */

import { ZazzElement, defineZazzElement } from "../../base/zazz-element.ts";
import {
  BORDER_SHORTHANDS,
  BREAKPOINTS,
  UTILITIES,
  PSEUDO_ONLY,
  PSEUDO_SIDES,
  STATES,
  tiersOf,
  type Utility,
} from "../../base/utilities.ts";

export interface Warning {
  el: Element;
  message: string;
}

export interface AuditOptions {
  /** State-bearing hooks per identity as `<utility>--<state>` (`bg--hover`); default: the page's stylesheets. */
  hooks?: Record<string, string[]>;
  /** Identity tokens the kit declares (`button`, `field-group`); default: the page's stylesheets. */
  identities?: string[];
}

const UTILITY_BY_NAME = new Map<string, Utility>(
  [...UTILITIES, ...PSEUDO_ONLY].map((utility) => [utility.name, utility]),
);
const PSEUDO_ONLY_NAMES = new Set(PSEUDO_ONLY.map((utility) => utility.name));
const TIERS = new Set<string>([...BREAKPOINTS, ...STATES]);

const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;
const DIMENSION =
  /^-?(\d+\.?\d*|\.\d+)(px|r?em|%|v[wh]|v[ib]|[sld]v[wh]|ch|ex|cap|ic|lh|rlh|cq[iwhb]|cqmin|cqmax|pt|cm|mm|in)$/;
const FUNCTION = /^(calc|clamp|min|max|var|env|round|mod|rem|abs|sign)\(/;

/** Splits a `style` attribute into `[name, value]` pairs; names keep their whitespace (it is a finding). */
function declarations(text: string): [string, string][] {
  const pairs: [string, string][] = [];
  for (const declaration of text.split(";")) {
    const colon = declaration.indexOf(":");
    if (colon === -1) continue;
    pairs.push([
      declaration.slice(0, colon),
      declaration
        .slice(colon + 1)
        .replace(/!\s*important\s*$/i, "")
        .trim(),
    ]);
  }
  return pairs;
}

interface Parsed {
  name: string;
  tier?: string;
  side?: string;
  group?: true;
}

/** `--before-w--md` → { side: "before", name: "w", tier: "md" }. */
function parseUtilityName(raw: string): Parsed {
  let body = raw.slice(2);
  let group: true | undefined;
  if (body.startsWith("group-")) {
    group = true;
    body = body.slice("group-".length);
  }
  let side: string | undefined;
  for (const candidate of PSEUDO_SIDES) {
    if (body.startsWith(`${candidate}-`)) {
      side = candidate;
      body = body.slice(candidate.length + 1);
      break;
    }
  }
  const split = body.lastIndexOf("--");
  if (split > 0 && TIERS.has(body.slice(split + 2))) {
    return {
      name: body.slice(0, split),
      tier: body.slice(split + 2),
      side,
      ...(group ? { group } : {}),
    };
  }
  return { name: body, side, ...(group ? { group } : {}) };
}

/**
 * True when `value` can be a border shorthand value: one number, one
 * length, one function (`var()`, `calc()`, a color function), or an identifier
 * the browser accepts as a color. Several space-separated values (CSS's
 * `1px solid red`), a percentage, or an unknown word all draw a 1px
 * transparent border instead.
 */
function isBorderValue(value: string): boolean {
  if (NUMBER.test(value) || FUNCTION.test(value) || /^#[\da-f]{3,8}$/i.test(value)) return true;
  if (/^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i.test(value))
    return true;
  if (DIMENSION.test(value)) return !value.endsWith("%");
  if (/^-?[a-z][\w-]*$/i.test(value)) return CSS.supports("color", value);
  return false;
}

function isDualValue(value: string, utility: Utility): boolean {
  return (
    NUMBER.test(value) ||
    DIMENSION.test(value) ||
    FUNCTION.test(value) ||
    (utility.keywords ?? []).includes(value)
  );
}

function tokensOf(el: Element): string[] {
  return (el.getAttribute("data-ui") ?? "").split(/\s+/).filter(Boolean);
}

/** True when `el` or an ancestor carries the identity `name` (token, tag form, or a token under its prefix). */
function withinIdentity(el: Element, name: string, identities: Set<string>): boolean {
  const related = [...identities].filter((token) => token === name || token.startsWith(`${name}-`));
  const selector = [`ui-${name}`, ...related.map((token) => `[data-ui~="${token}"]`)].join(", ");
  return el.closest(selector) !== null;
}

function auditElement(el: Element, options: Required<AuditOptions>): Warning[] {
  const found: Warning[] = [];
  const warn = (message: string) => found.push({ el, message });
  const pairs = declarations(el.getAttribute("style") ?? "");
  const bases = new Set<string>();
  const raw = new Map<string, string>();
  const parsedPairs: [Parsed, string, string][] = [];
  for (const [rawName, value] of pairs) {
    const name = rawName.trim();
    if (!name.startsWith("--")) {
      raw.set(name, value);
      continue;
    }
    if (rawName.trimStart() !== name) {
      warn(
        `\`${name} : ${value}\` has whitespace before the colon; the gates match \`${name}: …\` only.`,
      );
    }
    const parsed = parseUtilityName(name);
    parsedPairs.push([parsed, name, value]);
    if (!parsed.tier) bases.add((parsed.side ? `${parsed.side}-` : "") + parsed.name);
  }
  // A sizing keyword on one utility switches the element's dual utilities to raw reads
  const keywordSwitch = parsedPairs.some(([parsed, , value]) => {
    const utility = UTILITY_BY_NAME.get(parsed.name);
    return utility?.mode === "dual" && !parsed.tier && (utility.keywords ?? []).includes(value);
  });
  const tokens = tokensOf(el);
  for (const [parsed, name, value] of parsedPairs) {
    const utility = UTILITY_BY_NAME.get(parsed.name);
    if (!utility) {
      if (!name.startsWith("--ui-")) warn(`\`${name}\` is an unknown utility.`);
      continue;
    }
    if (parsed.side && !utility.pseudo) {
      warn(`\`${name}\`: --${utility.name} has no ::${parsed.side} form.`);
      continue;
    }
    if (!parsed.side && PSEUDO_ONLY_NAMES.has(utility.name)) {
      warn(
        `\`${name}\` exists only as \`--before-${utility.name}\` / \`--after-${utility.name}\`.`,
      );
      continue;
    }
    const baseName = (parsed.side ? `${parsed.side}-` : "") + utility.name;
    if (parsed.group && !(parsed.tier && (STATES as readonly string[]).includes(parsed.tier))) {
      warn(
        `\`${name}\` needs a state tier: group utilities take \`--group-${utility.name}--<state>\`.`,
      );
      continue;
    }
    if (utility.emit === "border" && !isBorderValue(value)) {
      warn(
        `\`${name}: ${value}\` is not one color, number, or length; it draws a 1px transparent border. Use \`--border: 2\`, \`--border: var(--color-primary)\`, or set \`--border-style\` separately.`,
      );
    }
    // an integer utility emits `repeat(n, …)` or a count, so anything else silently does nothing
    if (
      utility.mode === "integer" &&
      !/^\d+$/.test(value) &&
      !FUNCTION.test(value) &&
      !(utility.emit === "line-clamp" && value === "none")
    ) {
      const template = utility.name.replace(/^grid-/, "grid-template-");
      const suggestion =
        template !== utility.name && UTILITY_BY_NAME.has(template)
          ? ` For a track list write \`--${template}${parsed.tier ? `--${parsed.tier}` : ""}: ${value}\`.`
          : "";
      warn(`\`${name}: ${value}\` is not an integer.${suggestion}`);
    }
    if (parsed.tier) {
      const tiers = tiersOf(utility);
      if (!tiers.includes(parsed.tier)) {
        warn(
          `\`${name}\` uses a tier the ${utility.family} family has no setter for; \`--${utility.name}\` takes ${tiers.length ? tiers.join(", ") : "no tiers"}.`,
        );
        continue;
      }
      // a border shorthand is the base a border longhand's tier overrides
      const borderBase =
        /^border-(?:[ltrb]-)?(?:width|color|style)$/.test(baseName) &&
        BORDER_SHORTHANDS.some((name) => bases.has(name));
      if (utility.noBase === undefined && !bases.has(baseName) && !borderBase) {
        warn(`\`${name}\` has no base \`--${baseName}\`; the tier only overrides a base.`);
      }
      continue;
    }
    if (utility.mode === "dual" && !isDualValue(value, utility)) {
      warn(
        `\`${name}: ${value}\` is neither a scale number, a length, nor a keyword (${(utility.keywords ?? []).join(", ") || "none"}).`,
      );
    }
    if (
      utility.mode === "dual" &&
      keywordSwitch &&
      NUMBER.test(value) &&
      !(utility.keywords ?? []).includes(value)
    ) {
      warn(`\`${name}: ${value}\` is read raw next to a sizing keyword; write a length.`);
    }
    if (utility.mode === "keyword" && NUMBER.test(value)) {
      warn(`\`${name}: ${value}\` is a number on a keyword utility.`);
    }
    for (const property of utility.properties) {
      if (raw.has(property)) {
        warn(
          `\`${property}: ${raw.get(property)}\` shadows the utility \`${name}\`; the raw declaration wins.`,
        );
      }
    }
    // A base utility flattens the state a primitive hook covers unless the tier is set too
    if (!parsed.side) {
      for (const token of tokens) {
        for (const hook of options.hooks[token] ?? []) {
          const [hookUtility, state] = hook.split("--");
          // a border shorthand writes the border-color and border-width the hooks back
          const covers =
            hookUtility === utility.name ||
            (utility.emit === "border" &&
              (hookUtility === "border-color" || hookUtility === "border-width"));
          if (
            covers &&
            state &&
            !parsedPairs.some(
              ([p]) => (p.name === utility.name || p.name === hookUtility) && p.tier === state,
            )
          ) {
            warn(
              `\`${name}\` on a ${token} flattens its ${state} state; add \`--${utility.name}--${state}\` or set the hook \`--ui-${token}-${hookUtility}--${state}\`.`,
            );
          }
        }
      }
    }
  }
  // data-<name>-<key> outside the identity (slots and states sit on children by design)
  for (const attribute of el.getAttributeNames()) {
    if (
      !attribute.startsWith("data-") ||
      attribute.startsWith("data-ui") ||
      attribute.startsWith("data-debug")
    )
      continue;
    if (attribute.endsWith("-slot") || attribute.endsWith("-state")) continue;
    const owner = [...options.identities]
      .sort((a, b) => b.length - a.length)
      .find((name) => attribute.startsWith(`data-${name}-`));
    if (!owner) continue;
    const root = owner.split("-")[0]!;
    if (
      !withinIdentity(el, root, new Set(options.identities)) &&
      !el.hasAttribute(`data-${root}`)
    ) {
      warn(
        `\`${attribute}\` belongs to ${owner}, but neither this element nor an ancestor carries it in \`data-ui\`.`,
      );
    }
  }
  return found;
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
  const found: Warning[] = [];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el.tagName === "UI-DEBUG") continue;
    found.push(...auditElement(el, resolved));
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
  const notes: Note[] = [];
  const warnings: Warning[] = [];
  if (!swap) {
    for (const el of persisted) {
      warnings.push({
        el,
        message:
          '`data-ui-persist` has no effect: this page has no `<html data-ui-navigation="swap">`, so every navigation is a full load.',
      });
    }
    return { notes, warnings };
  }
  const seen = new Map<string, Element>();
  const kept: Element[] = [];
  for (const el of persisted) {
    const id = el.getAttribute("data-ui-persist") ?? "";
    if (!id) {
      warnings.push({
        el,
        message: "`data-ui-persist` has no id; it is not carried across navigations.",
      });
      continue;
    }
    if (seen.has(id)) {
      warnings.push({
        el,
        message: `\`data-ui-persist="${id}"\` is used twice; only the first is kept.`,
      });
      continue;
    }
    seen.set(id, el);
    const outer = el.parentElement?.closest("[data-ui-persist]");
    if (outer) {
      warnings.push({
        el,
        message: `\`data-ui-persist="${id}"\` sits inside \`data-ui-persist="${outer.getAttribute("data-ui-persist")}"\`, which already keeps it; drop the inner one.`,
      });
      continue;
    }
    kept.push(el);
  }
  const ids = kept.map((el) => `"${el.getAttribute("data-ui-persist")}"`).join(", ");
  notes.push({
    message: kept.length
      ? `In-page navigation is on. ${kept.length} element${kept.length === 1 ? "" : "s"} persist across navigations (${ids}); everything else is replaced by the next page.`
      : "In-page navigation is on, and nothing persists: every navigation replaces the whole body.",
    elements: kept,
  });
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
