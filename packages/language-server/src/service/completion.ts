/**
 * @fileoverview Completions for Zazz markup. Inside `style`: utility names,
 * then only the tiers a utility takes once `--x--` is typed, `--group-` and
 * pseudo forms, hooks for the identities in reach, and values after the colon
 * (keywords and design tokens, with their resolved values). On tags: `data-ui`
 * identities, `data-<id>-*` presets with their values, and `ui-*` tag forms.
 */

import {
  BREAKPOINTS,
  PSEUDO_SIDES,
  STUCK_STATE,
  UTILITIES,
  hasGroup,
  isState,
  parseUtilityName,
  tiersOf,
  type Utility,
} from "@zazz-ui/core/base/utilities.ts";
import { namedAttributes, selfAndAncestors, valueOf, type Tag } from "../html/nodes.ts";
import type { ParsedHtml } from "../html/parse.ts";
import { contextAt, tokenAround, type StyleContext } from "./context.ts";
import {
  ATTRIBUTES,
  HEADERS,
  HOOKS,
  IDENTITIES,
  PROPERTY_VALUES,
  TAGS,
  TOKENS,
  tokenSummary,
} from "./data.ts";
import {
  UTILITY_BY_NAME,
  breakpointThreshold,
  describeUtilityName,
  isBreakpoint,
  modeDescription,
} from "./describe.ts";
import type { Edit } from "./format.ts";
import { importEdit, primitiveOf } from "./head-block.ts";

export type CompletionKind =
  | "utility"
  | "tier"
  | "prefix"
  | "hook"
  | "value"
  | "token"
  | "identity"
  | "attribute"
  | "tag";

export interface ZazzCompletion {
  label: string;
  kind: CompletionKind;
  detail?: string;
  documentation?: string;
  /** Text replacing `range`; a snippet (`$0`) when `snippet` is set. */
  insertText: string;
  snippet?: boolean;
  range: [number, number];
  sortText?: string;
  /** Open completions again after inserting (a name, so its values follow). */
  retrigger?: boolean;
  additionalEdits?: Edit[];
}

const RANK = new Map(UTILITIES.map((utility, i) => [utility.name, i]));
const pad = (n: number) => String(n).padStart(4, "0");

export function complete(parsed: ParsedHtml, offset: number): ZazzCompletion[] {
  const context = contextAt(parsed, offset);
  if (!context) return [];
  switch (context.kind) {
    case "style":
      return context.part === "name" ? styleNames(context) : styleValues(context);
    case "attribute-value":
      if (context.name === "data-ui") {
        return identities(context.base, context.value, context.rel).map((item) =>
          withImport(parsed.text, item.label, item),
        );
      }
      return attributeValues(context.name, context.base, context.value, context.rel);
    case "attribute-name":
      return attributeNames(context.tag, context.range);
    case "tag-name": {
      const { prefix } = context;
      if (!("ui-".startsWith(prefix) || prefix.startsWith("ui-"))) return [];
      return TAGS.map((tag) =>
        withImport(parsed.text, tag.name, {
          label: tag.name,
          kind: "tag" as const,
          documentation: tag.description,
          insertText: tag.name,
          range: context.range,
        }),
      );
    }
  }
}

/** Adds the head-block edit that loads the item's primitive, when the page lists primitives and lacks it. */
function withImport(text: string, name: string, item: ZazzCompletion): ZazzCompletion {
  const primitive = primitiveOf(name);
  const edit = primitive ? importEdit(text, primitive) : undefined;
  if (!edit) return item;
  return {
    ...item,
    detail: `${item.detail ? `${item.detail} · ` : ""}adds ${primitive} to the head`,
    additionalEdits: [{ range: edit.range, newText: edit.newText }],
  };
}

// --- style: names ---

function styleNames(context: StyleContext): ZazzCompletion[] {
  const { declaration, base, rel, parsed } = context;
  const start = declaration ? declaration.nameSpan[0] : rel;
  const end = declaration ? declaration.nameSpan[1] : rel;
  const typed = context.value.slice(start, rel);
  const range: [number, number] = [base + start, base + end];
  // `--name: ` with the colon when there is none yet, then reopen for values
  const hasColon = declaration ? declaration.colon !== -1 : false;
  const name = (label: string): Pick<ZazzCompletion, "insertText" | "snippet" | "retrigger"> =>
    hasColon
      ? { insertText: label }
      : { insertText: `${label}: $0`, snippet: true, retrigger: true };

  // `--x--` typed: only the tiers that utility takes
  const tierStart = typed.lastIndexOf("--");
  if (tierStart > 1) {
    const stem = typed.slice(0, tierStart);
    const parsedStem = parseUtilityName(stem);
    const utility = UTILITY_BY_NAME.get(parsedStem.name);
    if (utility && !parsedStem.tier)
      return tiers(utility, stem, parsedStem.group === true, range, name);
  }

  const items: ZazzCompletion[] = [];
  const group = typed.startsWith("--group-");
  const side = PSEUDO_SIDES.find(
    (s) => typed.startsWith(`--${s}-`) || typed.startsWith(`--group-${s}-`),
  );
  for (const utility of UTILITY_BY_NAME.values()) {
    if (side && !utility.pseudo) continue;
    if (!side && utility.pseudo && !RANK.has(utility.name)) continue; // pseudo-only (--content)
    if (group && !tiersOf(utility).some((tier) => isState(tier) && hasGroup(tier))) continue;
    const label = `--${group ? "group-" : ""}${side ? `${side}-` : ""}${utility.name}`;
    items.push({
      label,
      kind: "utility",
      detail: utilityDetail(utility),
      documentation: describeUtilityName(label),
      ...name(label),
      range,
      sortText: `0${pad(RANK.get(utility.name) ?? 9999)}`,
    });
  }
  if (!group && !side) {
    for (const prefix of ["group-", ...PSEUDO_SIDES.map((s) => `${s}-`)]) {
      items.push({
        label: `--${prefix}`,
        kind: "prefix",
        detail:
          prefix === "group-"
            ? "a state of the nearest [data-ui~=group] ancestor"
            : `on ::${prefix.slice(0, -1)}`,
        insertText: `--${prefix}`,
        range,
        sortText: "1",
        retrigger: true,
      });
    }
    items.push({
      label: `--${STUCK_STATE.modifier}`,
      kind: "utility",
      detail: "the side a sticky container's --*--stuck tiers track",
      ...name(`--${STUCK_STATE.modifier}`),
      range,
      sortText: "2",
    });
    items.push(...hooks(parsed, context.tag, range, name));
  }
  return items;
}

function utilityDetail(utility: Utility): string {
  const properties = utility.properties.length ? utility.properties.join(", ") : "box-shadow";
  return `${properties} · ${utility.family}`;
}

function tiers(
  utility: Utility,
  stem: string,
  group: boolean,
  range: [number, number],
  name: (label: string) => Pick<ZazzCompletion, "insertText" | "snippet" | "retrigger">,
): ZazzCompletion[] {
  return tiersOf(utility)
    .filter((tier) => !group || (isState(tier) && hasGroup(tier)))
    .map((tier, i) => {
      const label = `${stem}--${tier}`;
      return {
        label,
        kind: "tier" as const,
        detail: isBreakpoint(tier) ? `container ${breakpointThreshold(tier)}` : `${tier} state`,
        documentation: describeUtilityName(label),
        ...name(label),
        range,
        // breakpoints small to large, then states in precedence order
        sortText: pad((isBreakpoint(tier) ? 0 : BREAKPOINTS.length) + i),
      };
    });
}

/** Identities on the element, its ancestors, and its descendants: the hooks that can reach them. */
function identitiesInReach(parsed: ParsedHtml, tag: Tag): Set<string> {
  const found = new Set<string>();
  const add = (node: Tag) => {
    for (const token of (valueOf(node, "data-ui") ?? "").split(/\s+/)) if (token) found.add(token);
    if (node.name.startsWith("ui-")) found.add(node.name.slice(3));
  };
  // ancestors by parent link (an unclosed ancestor's range does not span its children)
  for (const node of selfAndAncestors(tag)) add(node);
  for (const node of parsed.tags) {
    if (tag.range[0] < node.range[0] && node.range[1] <= tag.range[1]) add(node);
  }
  return found;
}

function hooks(
  parsed: ParsedHtml,
  tag: Tag,
  range: [number, number],
  name: (label: string) => Pick<ZazzCompletion, "insertText" | "snippet" | "retrigger">,
): ZazzCompletion[] {
  const reach = [...identitiesInReach(parsed, tag)];
  if (!reach.length) return [];
  return Object.entries(HOOKS)
    .filter(([hook]) => reach.some((id) => hook.startsWith(`--ui-${id}-`)))
    .map(([hook, { value, file }]) => ({
      label: hook,
      kind: "hook" as const,
      detail: `hook · default ${value}`,
      documentation: `Primitive hook declared in \`${file}\`. Default: \`${value}\`.`,
      ...name(hook),
      range,
      sortText: `3${hook}`,
    }));
}

// --- style: values ---

function styleValues(context: StyleContext): ZazzCompletion[] {
  const { declaration, base } = context;
  if (!declaration) return [];
  // the value typed so far (or the cursor, after `--bg: `) through its end
  const start = declaration.value ? declaration.valueSpan[0] : context.rel;
  const range: [number, number] = [
    base + start,
    base + Math.max(declaration.valueSpan[1], context.rel),
  ];
  const parsedName = parseUtilityName(declaration.name);
  const utility = UTILITY_BY_NAME.get(parsedName.name);
  const values =
    PROPERTY_VALUES.get(declaration.name) ?? PROPERTY_VALUES.get(`--${parsedName.name}`) ?? [];
  return values.map((value, i) => {
    const token = /^var\((--[\w-]+)\)$/.exec(value.name)?.[1];
    const data = token ? TOKENS[token] : undefined;
    return {
      label: value.name,
      kind: token ? ("token" as const) : ("value" as const),
      ...(data
        ? { detail: tokenSummary(data), documentation: `\`${token}: ${data.value}\`` }
        : utility
          ? { detail: modeDescription(utility) }
          : {}),
      insertText: value.name,
      range,
      sortText: pad(i),
    };
  });
}

// --- attributes ---

function identities(base: number, value: string, rel: number): ZazzCompletion[] {
  const { range } = tokenAround(value, rel);
  const present = new Set(value.split(/\s+/));
  return (ATTRIBUTES.get("data-ui")?.values ?? [])
    .filter((identity) => !present.has(identity.name) || value.slice(...range) === identity.name)
    .map((identity) => {
      const owner = IDENTITIES[identity.name];
      const header = owner ? HEADERS[owner.file] : undefined;
      return {
        label: identity.name,
        kind: "identity" as const,
        detail: owner?.primitive ? `${owner.primitive} primitive` : "base layer",
        ...(header ? { documentation: header.summary } : {}),
        insertText: identity.name,
        range: [base + range[0], base + range[1]] as [number, number],
      };
    });
}

function attributeValues(name: string, base: number, value: string, rel: number): ZazzCompletion[] {
  const attribute = ATTRIBUTES.get(name);
  if (!attribute?.values.length) return [];
  const { range } = tokenAround(value, rel);
  return attribute.values.map((option) => ({
    label: option.name,
    kind: "value" as const,
    ...(attribute.description ? { detail: attribute.description } : {}),
    insertText: option.name,
    range: [base + range[0], base + range[1]] as [number, number],
  }));
}

/** `data-ui`, plus the `data-<id>-*` attributes of identities on the element (slots and states: on its ancestors' too). */
function attributeNames(tag: Tag, range: [number, number]): ZazzCompletion[] {
  const own = new Set<string>();
  const above = new Set<string>();
  for (const node of selfAndAncestors(tag)) {
    const target = node === tag ? own : above;
    for (const token of (valueOf(node, "data-ui") ?? "").split(/\s+/)) if (token) target.add(token);
    if (node.name.startsWith("ui-")) target.add(node.name.slice(3));
  }
  const present = new Set(
    namedAttributes(tag).map((attribute) => attribute.key.value.toLowerCase()),
  );
  const items: ZazzCompletion[] = [];
  const offer = (name: string, description?: string) => {
    if (present.has(name)) return;
    items.push({
      label: name,
      kind: "attribute",
      ...(description ? { detail: description } : {}),
      insertText: `${name}="$1"$0`,
      snippet: true,
      range,
      retrigger: true,
    });
  };
  offer("data-ui", ATTRIBUTES.get("data-ui")?.description);
  for (const [name, attribute] of ATTRIBUTES) {
    const owner = [...own, ...above].find((id) => name.startsWith(`data-${id.split("-")[0]}-`));
    if (!owner) continue;
    const childPart = name.endsWith("-slot") || name.endsWith("-state");
    if (own.has(owner) || childPart) offer(name, attribute.description);
  }
  return items;
}
