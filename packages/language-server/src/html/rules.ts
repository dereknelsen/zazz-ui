/**
 * @fileoverview One line per audit rule: ESLint's rule docs and the editor's
 * diagnostic code descriptions.
 */

import type { RuleId } from "@zazz-ui/core/primitives/debug/audit-core.ts";

export const RULE_DESCRIPTIONS: Record<RuleId, string> = {
  "unknown-utility": "A `--name` in `style` that is not a Zazz utility.",
  "pseudo-form":
    "A `--before-*`/`--after-*` form the utility lacks, or a pseudo-only utility used bare.",
  "group-needs-state": "A `--group-*` utility without a state tier.",
  "border-value": "A border shorthand value that is not one color, number, or length.",
  "not-integer": "A non-integer value on an integer utility (grid tracks, spans, line clamp).",
  "tier-unsupported": "A breakpoint or state tier the utility's family has no setter for.",
  "tier-without-base": "A tier override with no base utility to override.",
  "dual-value":
    "A value that is neither a scale number, a length, nor one of the utility's keywords.",
  "keyword-number": "A number on a keyword-only utility.",
  "raw-shadows-utility": "A raw CSS declaration that shadows a utility on the same element.",
  "flattens-state": "A base utility that flattens a state the primitive's hook covers.",
  "scroll-state":
    "A `--stuck-state` that is not a side or has a tier, a `--*--stuck` on the sticky container itself, or a `--group-*--stuck` form.",
  "font-weight-name":
    "A standard weight name (`medium`, `semibold`) on `--font-weight`, which only takes numbers, `normal`, `bold`, and the `heading` / `body` / `strong` keywords.",
  "gradient-incomplete":
    "A gradient type without `--bg-stops`, stops without a type, or more than one type.",
  "whitespace-before-colon":
    "Whitespace between a utility name and its colon, which the gates cannot match.",
  "attribute-outside-identity": "A `data-<name>-*` attribute on an element outside that identity.",
  persist: "`data-ui-persist` that cannot work as written.",
};

export const STYLE_FORMAT_DESCRIPTION =
  "Style utilities in cascade order (family, then emission order, tiers after their base), one per line as `name: value`.";
