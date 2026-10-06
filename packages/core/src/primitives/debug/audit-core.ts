"use strict";

/**
 * @fileoverview The DOM-free audit behind `<ui-debug>` and the html lint rules.
 * @description Works on {@link AuditNode}, a five-method view of an element, so
 * the browser (a live `Element`) and the linter (an html-eslint `Tag`) run the
 * same checks and raise the same messages. Each finding names its rule and,
 * where it can, the span of the declaration it is about (offsets into the
 * `style` attribute) and a suggested rewrite.
 */

import {
  BORDER_SHORTHANDS,
  GRADIENT_TYPES,
  UTILITIES,
  PSEUDO_ONLY,
  FONT_WEIGHT_NAMES,
  STUCK_STATE,
  STATES,
  parseUtilityName,
  tiersOf,
  type Utility,
  type UtilityName,
} from "../../base/utilities.ts";

/** A stable name per finding, so a linter can switch each one off. */
export type RuleId =
  | "unknown-utility"
  | "pseudo-form"
  | "group-needs-state"
  | "border-value"
  | "not-integer"
  | "tier-unsupported"
  | "tier-without-base"
  | "dual-value"
  | "keyword-number"
  | "raw-shadows-utility"
  | "flattens-state"
  | "gradient-incomplete"
  | "font-weight-name"
  | "scroll-state"
  | "whitespace-before-colon"
  | "attribute-outside-identity"
  | "persist";

export const RULE_IDS: readonly RuleId[] = [
  "unknown-utility",
  "pseudo-form",
  "group-needs-state",
  "border-value",
  "not-integer",
  "tier-unsupported",
  "tier-without-base",
  "dual-value",
  "keyword-number",
  "raw-shadows-utility",
  "flattens-state",
  "gradient-incomplete",
  "font-weight-name",
  "scroll-state",
  "whitespace-before-colon",
  "attribute-outside-identity",
  "persist",
];

/** `[start, end)` offsets into the `style` attribute's value. */
export type Span = [number, number];

export interface Suggestion {
  description: string;
  span: Span;
  text: string;
}

export interface Finding {
  rule: RuleId;
  message: string;
  /** The declaration the finding is about, inside `style`. */
  span?: Span;
  /** The attribute the finding is about, when it is not `style`. */
  attribute?: string;
  suggestion?: Suggestion;
}

/** The parts of an element the audit reads. */
export interface AuditNode {
  getAttribute(name: string): string | null;
  getAttributeNames(): string[];
  /** True when this node or an ancestor carries the identity `name` (see {@link carriesIdentity}). */
  withinIdentity(name: string, identities: readonly string[]): boolean;
}

export interface AuditContext {
  /** State-bearing hooks per identity as `<utility>--<state>` (`bg--hover`). */
  hooks: Record<string, string[]>;
  /** Identity tokens the kit declares (`button`, `field-group`). */
  identities: readonly string[];
  /** True when `value` is a color identifier (`red`, `currentcolor`); the browser asks `CSS.supports`. */
  isColor: (value: string) => boolean;
}

const UTILITY_BY_NAME = new Map<string, Utility>(
  [...UTILITIES, ...PSEUDO_ONLY].map((utility) => [utility.name, utility]),
);
const PSEUDO_ONLY_NAMES = new Set(PSEUDO_ONLY.map((utility) => utility.name));

const NUMBER = /^-?(\d+\.?\d*|\.\d+)$/;
const DIMENSION =
  /^-?(\d+\.?\d*|\.\d+)(px|r?em|%|v[wh]|v[ib]|[sld]v[wh]|ch|ex|cap|ic|lh|rlh|cq[iwhb]|cqmin|cqmax|pt|cm|mm|in)$/;
const FUNCTION = /^(calc|clamp|min|max|var|env|round|mod|rem|abs|sign)\(/;

interface Declaration {
  /** The name as written; its whitespace is a finding. */
  name: string;
  value: string;
  span: Span;
}

/** Splits a `style` attribute into declarations with their spans. */
function declarations(text: string): Declaration[] {
  const found: Declaration[] = [];
  let offset = 0;
  for (const part of text.split(";")) {
    const start = offset;
    offset += part.length + 1;
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const lead = part.length - part.trimStart().length;
    const trail = part.length - part.trimEnd().length;
    found.push({
      name: part.slice(0, colon),
      value: part
        .slice(colon + 1)
        .replace(/!\s*important\s*$/i, "")
        .trim(),
      span: [start + lead, start + part.length - trail],
    });
  }
  return found;
}

/**
 * True when `value` can be a border shorthand value: one number, one
 * length, one function (`var()`, `calc()`, a color function), or an identifier
 * the browser accepts as a color. Several space-separated values (CSS's
 * `1px solid red`), a percentage, or an unknown word all draw a 1px
 * transparent border instead.
 */
function isBorderValue(value: string, isColor: (value: string) => boolean): boolean {
  if (NUMBER.test(value) || FUNCTION.test(value) || /^#[\da-f]{3,8}$/i.test(value)) return true;
  if (/^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i.test(value))
    return true;
  if (DIMENSION.test(value)) return !value.endsWith("%");
  if (/^-?[a-z][\w-]*$/i.test(value)) return isColor(value);
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

/**
 * True when an element with this tag and `data-ui` carries the identity `name`:
 * a tag form or a declared token that is `name` or sits under its prefix
 * (`field-group` and `<ui-toggle-group>` carry `field` and `toggle`).
 */
export function carriesIdentity(
  tagName: string,
  dataUi: string | null,
  name: string,
  identities: readonly string[],
): boolean {
  const tag = tagName.toLowerCase();
  if (tag === `ui-${name}` || tag.startsWith(`ui-${name}-`)) return true;
  const tokens = (dataUi ?? "").split(/\s+/).filter(Boolean);
  return tokens.some(
    (token) => identities.includes(token) && (token === name || token.startsWith(`${name}-`)),
  );
}

/** Audits one element's `style` and `data-*` attributes. */
export function auditNode(node: AuditNode, context: AuditContext): Finding[] {
  const found: Finding[] = [];
  const style = declarations(node.getAttribute("style") ?? "");
  const bases = new Set<string>();
  const raw = new Map<string, Declaration>();
  const parsedPairs: [UtilityName, string, Declaration][] = [];
  for (const declaration of style) {
    const name = declaration.name.trim();
    if (!name.startsWith("--")) {
      raw.set(name, declaration);
      continue;
    }
    if (declaration.name.trimStart() !== name) {
      const [start] = declaration.span;
      found.push({
        rule: "whitespace-before-colon",
        message: `\`${name} : ${declaration.value}\` has whitespace before the colon; the gates match \`${name}: …\` only.`,
        span: declaration.span,
        suggestion: {
          description: `Write \`${name}:\`.`,
          span: [start, start + declaration.name.trimStart().length],
          text: name,
        },
      });
    }
    const parsed = parseUtilityName(name);
    parsedPairs.push([parsed, name, declaration]);
    if (!parsed.tier) bases.add((parsed.side ? `${parsed.side}-` : "") + parsed.name);
  }
  const tokens = (node.getAttribute("data-ui") ?? "").split(/\s+/).filter(Boolean);
  for (const [parsed, name, declaration] of parsedPairs) {
    const { value, span } = declaration;
    const warn = (rule: RuleId, message: string, suggestion?: Suggestion) =>
      found.push({ rule, message, span, ...(suggestion ? { suggestion } : {}) });
    // --stuck-state names the side a sticky container reports as stuck
    if (parsed.name === STUCK_STATE.modifier && !parsed.group && !parsed.side) {
      if (parsed.tier) {
        warn(
          "scroll-state",
          `\`${name}\` has no tiers: the stuck state needs sticky positioning, so switch \`--position\` at that breakpoint instead.`,
        );
      } else if (!(STUCK_STATE.sides as readonly string[]).includes(value)) {
        warn(
          "scroll-state",
          `\`${name}: ${value}\` is not a side the stuck state matches: ${STUCK_STATE.sides.join(", ")}.`,
        );
      }
      continue;
    }
    const utility = UTILITY_BY_NAME.get(parsed.name);
    if (!utility) {
      if (parsed.name === "flex-direction") {
        warn(
          "unknown-utility",
          `\`${name}\` is gone: the direction rides on --display. Write \`--display${parsed.tier ? `--${parsed.tier}` : ""}: flex-col\` (or flex-row, …-reverse, inline-flex-…).`,
        );
      } else if (!name.startsWith("--ui-")) {
        warn("unknown-utility", `\`${name}\` is an unknown utility.`);
      }
      continue;
    }
    if (parsed.side && !utility.pseudo) {
      warn("pseudo-form", `\`${name}\`: --${utility.name} has no ::${parsed.side} form.`);
      continue;
    }
    if (!parsed.side && PSEUDO_ONLY_NAMES.has(utility.name)) {
      warn(
        "pseudo-form",
        `\`${name}\` exists only as \`--before-${utility.name}\` / \`--after-${utility.name}\`.`,
      );
      continue;
    }
    const baseName = (parsed.side ? `${parsed.side}-` : "") + utility.name;
    if (parsed.group && parsed.tier === "stuck") {
      warn(
        "scroll-state",
        `\`${name}\` has no group form: the sticky container is the trigger, so write \`--${utility.name}--stuck\` inside it.`,
      );
      continue;
    }
    // a container query never matches the container: on the sticky element itself it never applies
    if (parsed.tier === "stuck" && !parsed.side) {
      const style = node.getAttribute("style") ?? "";
      if (style.includes(": sticky") || style.includes(`--${STUCK_STATE.modifier}:`)) {
        warn(
          "scroll-state",
          `\`${name}\` is on the sticky container itself; the stuck state reaches only its descendants, so move it to a child.`,
        );
      }
    }
    if (parsed.group && parsed.tier === "starting") {
      warn(
        "group-needs-state",
        `\`${name}\` has no group form: a starting style belongs to the element itself, so write \`--${utility.name}--starting\`.`,
      );
      continue;
    }
    if (parsed.group && !(parsed.tier && (STATES as readonly string[]).includes(parsed.tier))) {
      warn(
        "group-needs-state",
        `\`${name}\` needs a state tier: group utilities take \`--group-${utility.name}--<state>\`.`,
      );
      continue;
    }
    if (utility.emit === "border" && !isBorderValue(value, context.isColor)) {
      warn(
        "border-value",
        `\`${name}: ${value}\` is not one color, number, or length; it draws a 1px transparent border. Use \`--border: 2\`, \`--border: var(--color-primary)\`, or set \`--border-style\` separately.`,
      );
    }
    // an integer utility emits `repeat(n, …)`, `span n`, or a count, so anything else silently does nothing
    if (
      utility.mode === "integer" &&
      !/^\d+$/.test(value) &&
      !FUNCTION.test(value) &&
      !(utility.keywords ?? []).includes(value) &&
      !(utility.emit === "line-clamp" && value === "none")
    ) {
      const template = utility.name.replace(/^grid-/, "grid-template-");
      const tier = parsed.tier ? `--${parsed.tier}` : "";
      // Tailwind's col-span-full is a line range, which --col / --row take as written
      const line = utility.name.replace(/-span$/, "");
      const [hint, rewrite] =
        template !== utility.name && UTILITY_BY_NAME.has(template)
          ? ["For a track list write", `--${template}${tier}: ${value}`]
          : utility.emit === "span" && value === "full"
            ? ["To span every track write", `--${line}${tier}: 1 / -1`]
            : [];
      warn(
        "not-integer",
        `\`${name}: ${value}\` is not an integer.${rewrite ? ` ${hint} \`${rewrite}\`.` : ""}`,
        rewrite ? { description: `Write \`${rewrite}\`.`, span, text: rewrite } : undefined,
      );
    }
    if (parsed.tier) {
      const tiers = tiersOf(utility);
      if (!tiers.includes(parsed.tier)) {
        warn(
          "tier-unsupported",
          `\`${name}\` uses a tier the ${utility.family} family has no setter for; \`--${utility.name}\` takes ${tiers.length ? tiers.join(", ") : "no tiers"}.`,
        );
        continue;
      }
      // a border shorthand is the base a border longhand's tier overrides
      const borderBase =
        /^border-(?:width|color|style)$/.test(baseName) &&
        BORDER_SHORTHANDS.some((name) => bases.has(name));
      if (utility.noBase === undefined && !bases.has(baseName) && !borderBase) {
        warn(
          "tier-without-base",
          `\`${name}\` has no base \`--${baseName}\`; the tier only overrides a base.`,
        );
      }
      continue;
    }
    if (utility.mode === "dual" && !isDualValue(value, utility)) {
      warn(
        "dual-value",
        `\`${name}: ${value}\` is neither a scale number, a length, nor a keyword (${(utility.keywords ?? []).join(", ") || "none"}).`,
      );
    }
    if (utility.mode === "keyword" && NUMBER.test(value)) {
      warn("keyword-number", `\`${name}: ${value}\` is a number on a keyword utility.`);
    }
    // standard weight names are not CSS (only normal and bold are): write the number
    const weight = utility.name === "font-weight" ? FONT_WEIGHT_NAMES[value] : undefined;
    if (weight !== undefined) {
      const valueEnd = span[1];
      const valueStart = valueEnd - value.length;
      warn(
        "font-weight-name",
        `\`${name}: ${value}\` is not a CSS weight: write \`${weight}\` (the keywords are heading, body, and strong).`,
        { description: `Write \`${weight}\`.`, span: [valueStart, valueEnd], text: String(weight) },
      );
    }
    for (const property of utility.properties) {
      const shadow = raw.get(property);
      if (shadow) {
        found.push({
          rule: "raw-shadows-utility",
          message: `\`${property}: ${shadow.value}\` shadows the utility \`${name}\`; the raw declaration wins.`,
          span: shadow.span,
        });
      }
    }
    // A base utility flattens the state a primitive hook covers unless the tier is set too.
    // With a variant preset the override is deliberate (variant + utility, as in Tailwind).
    if (!parsed.side) {
      for (const token of tokens) {
        if (node.getAttribute(`data-${token}-variant`) !== null) continue;
        for (const hook of context.hooks[token] ?? []) {
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
              "flattens-state",
              `\`${name}\` on a ${token} flattens its ${state} state; add \`--${utility.name}--${state}\` or set the hook \`--ui-${token}-${hookUtility}--${state}\`.`,
            );
          }
        }
      }
    }
  }
  // a gradient needs a type (--bg-linear | -radial | -conic) and --bg-stops, both at the base
  const declared = (base: string) =>
    parsedPairs.find(([p]) => !p.tier && !p.side && p.name === base);
  const types = GRADIENT_TYPES.map((type) => declared(`bg-${type}`)).filter((pair) => !!pair);
  const stops = declared("bg-stops");
  if (!stops) {
    for (const [, name, { span }] of types) {
      found.push({
        rule: "gradient-incomplete",
        message: `\`${name}\` draws nothing without \`--bg-stops\` (the gradient's color stops).`,
        span,
      });
    }
  } else if (!types.length) {
    found.push({
      rule: "gradient-incomplete",
      message:
        "`--bg-stops` draws nothing without a gradient type: `--bg-linear`, `--bg-radial`, or `--bg-conic`.",
      span: stops[2].span,
    });
  }
  if (types.length > 1) {
    found.push({
      rule: "gradient-incomplete",
      message: `One gradient per element: ${types.map(([, name]) => `\`${name}\``).join(", ")} are set and only the last in source (linear, radial, conic) draws.`,
      span: types[0]![2].span,
    });
  }
  // data-<name>-<key> outside the identity (slots and states sit on children by design)
  const byLength = [...context.identities].sort((a, b) => b.length - a.length);
  for (const attribute of node.getAttributeNames()) {
    if (
      !attribute.startsWith("data-") ||
      attribute.startsWith("data-ui") ||
      attribute.startsWith("data-debug")
    )
      continue;
    if (attribute.endsWith("-slot") || attribute.endsWith("-state")) continue;
    const owner = byLength.find((name) => attribute.startsWith(`data-${name}-`));
    if (!owner) continue;
    const root = owner.split("-")[0]!;
    if (
      !node.withinIdentity(root, context.identities) &&
      node.getAttribute(`data-${root}`) === null
    ) {
      found.push({
        rule: "attribute-outside-identity",
        message: `\`${attribute}\` belongs to ${owner}, but neither this element nor an ancestor carries it in \`data-ui\`.`,
        attribute,
      });
    }
  }
  return found;
}

export interface PersistFinding<T> {
  el: T;
  rule: "persist";
  message: string;
}

/**
 * Checks `data-ui-persist` elements, in document order: each needs the swap
 * opt-in, an id, a unique id, and no persisted ancestor. Returns the elements
 * that persist and the findings.
 */
export function auditPersistence<T>(
  swap: boolean,
  persisted: T[],
  idOf: (el: T) => string,
  persistedAncestor: (el: T) => T | null,
): { kept: T[]; warnings: PersistFinding<T>[] } {
  const warnings: PersistFinding<T>[] = [];
  const warn = (el: T, message: string) => warnings.push({ el, rule: "persist", message });
  const kept: T[] = [];
  if (!swap) {
    for (const el of persisted) {
      warn(
        el,
        '`data-ui-persist` has no effect: this page has no `<html data-ui-navigation="swap">`, so every navigation is a full load.',
      );
    }
    return { kept, warnings };
  }
  const seen = new Set<string>();
  for (const el of persisted) {
    const id = idOf(el);
    if (!id) {
      warn(el, "`data-ui-persist` has no id; it is not carried across navigations.");
      continue;
    }
    if (seen.has(id)) {
      warn(el, `\`data-ui-persist="${id}"\` is used twice; only the first is kept.`);
      continue;
    }
    seen.add(id);
    const outer = persistedAncestor(el);
    if (outer) {
      warn(
        el,
        `\`data-ui-persist="${id}"\` sits inside \`data-ui-persist="${idOf(outer)}"\`, which already keeps it; drop the inner one.`,
      );
      continue;
    }
    kept.push(el);
  }
  return { kept, warnings };
}
