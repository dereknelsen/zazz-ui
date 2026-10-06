/**
 * @fileoverview Words for utilities and tiers, from the utility table: what a
 * utility sets, what values it reads, and when a tier applies. Hover and
 * completion documentation both use these.
 */

import {
  BREAKPOINT_CH,
  BREAKPOINTS,
  PSEUDO_ONLY,
  STATE_SELECTORS,
  STUCK_STATE,
  UTILITIES,
  isState,
  parseUtilityName,
  tiersOf,
  type Breakpoint,
  type Utility,
  type UtilityName,
} from "@zazz-ui/core/base/utilities.ts";

export const UTILITY_BY_NAME = new Map<string, Utility>(
  [...UTILITIES, ...PSEUDO_ONLY].map((utility) => [utility.name, utility]),
);

/** ≈ px per ch with the system font at 16px (`utilities.ts`: md 65ch ≈ 656px). */
const PX_PER_CH = 10.1;

export function isBreakpoint(tier: string): tier is Breakpoint {
  return (BREAKPOINTS as readonly string[]).includes(tier);
}

/** `≥ 65ch` for a breakpoint tier. */
export function breakpointThreshold(tier: Breakpoint): string {
  return `≥ ${BREAKPOINT_CH[tier]}ch`;
}

export function modeDescription(utility: Utility): string {
  switch (utility.mode) {
    case "dual":
      return "a scale number (× `--spacing`) or any length";
    case "integer":
      return "an integer";
    case "keyword":
      return "a keyword";
    default:
      return "any CSS value";
  }
}

/** When a tier applies, as one sentence. */
export function tierDescription(tier: string, group = false): string {
  if (isBreakpoint(tier)) {
    const ch = BREAKPOINT_CH[tier];
    return `when the nearest container is at least ${ch}ch wide (\`@container (width >= ${ch}ch)\`, ≈ ${Math.round(ch * PX_PER_CH)}px with the system font at 16px)`;
  }
  if (!isState(tier)) return `in the ${tier} tier`;
  const selector = STATE_SELECTORS[tier];
  if (selector.starting) {
    return "in the element's `@starting-style`: the value a `--transition` animates from when it first renders or leaves `display: none`";
  }
  if (selector.stuck) {
    return `on descendants of a sticky container while it is stuck to its \`--${STUCK_STATE.modifier}\` side (default \`${STUCK_STATE.fallback}\`; experimental)`;
  }
  const guard = selector.media ? ` inside \`@media ${selector.media}\`` : "";
  return group
    ? `while an ancestor \`[data-ui~="group"]\` matches \`${selector.pseudo}\`${guard}`
    : `while the element matches \`${selector.pseudo}\`${guard}`;
}

/** Markdown for a utility property name (`--px--md`, `--group-bg--hover`, `--before-w`). */
export function describeUtilityName(raw: string): string | undefined {
  const parsed: UtilityName = parseUtilityName(raw);
  const utility = UTILITY_BY_NAME.get(parsed.name);
  if (!utility) return undefined;
  const lines = [`**\`${raw}\`** · ${utility.family} utility`, ""];
  const target = parsed.side ? ` on \`::${parsed.side}\`` : "";
  const properties = utility.properties.length
    ? utility.properties.map((property) => `\`${property}\``).join(", ")
    : "`box-shadow` (shared with the other ring and shadow utilities)";
  lines.push(`Sets ${properties}${target}. Takes ${modeDescription(utility)}.`);
  if (parsed.tier) {
    lines.push("", `**${parsed.tier}**: applies ${tierDescription(parsed.tier, parsed.group)}.`);
  }
  if (utility.keywords?.length) {
    lines.push("", `Keywords: ${utility.keywords.map((k) => `\`${k}\``).join(", ")}.`);
  }
  if (utility.aliases) {
    const aliases = Object.entries(utility.aliases).map(
      ([key, value]) => `\`${key}\` → \`${value}\``,
    );
    lines.push("", `Shorthands: ${aliases.join(", ")}.`);
  }
  const tiers = tiersOf(utility);
  lines.push("", tiers.length ? `Tiers: ${tiers.join(", ")}.` : "No tiers.");
  if (utility.noBase !== undefined) {
    lines.push(
      "",
      `A tier works without a base here (the base defaults to \`${utility.noBase}\`).`,
    );
  }
  return lines.join("\n");
}
