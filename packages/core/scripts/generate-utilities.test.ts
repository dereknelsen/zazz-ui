"use strict";

/**
 * @fileoverview Generator seams for the utilities layer. Each
 * test pins one emitted rule to a literal, whitespace aside; the freshness test pins the committed files to the generator.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import { BREAKPOINT_REM, BREAKPOINTS, type Utility, STATES } from "../src/base/utilities.ts";
import {
  baseRule,
  borderSideRules,
  breakpointFlag,
  compositeRule,
  generate,
  keywordGates,
  noBaseRule,
  pseudoRule,
  registrations,
  setterRule,
  tierRegistrations,
} from "./generate-utilities.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Collapses whitespace so literals compare modulo formatting. */
function squash(css: string): string {
  return css.replace(/\s+/g, " ").trim();
}

describe("breakpoint flags", () => {
  it("publishes the md flag as a registered inherited boolean that body sets from the html container", () => {
    expect(squash(breakpointFlag("md", BREAKPOINT_REM.md))).toBe(
      squash(`
        @property --cqi-md {
          syntax: "true | false";
          inherits: true;
          initial-value: false;
        }
        @container html (width >= 48rem) {
          body {
            --cqi-md: true;
          }
        }
      `),
    );
  });
});

const W: Utility = { name: "w", properties: ["inline-size"], mode: "dual", family: "sizing" };
const KEYWORDS = ["auto", "fit-content", "min-content", "max-content"] as const;
const W_KW: Utility = { ...W, keywords: KEYWORDS };
const GAP: Utility = {
  name: "gap",
  properties: ["gap"],
  mode: "dual",
  family: "spacing",
  noBase: "0",
};
const SIZE: Utility = {
  name: "size",
  properties: ["inline-size", "block-size"],
  mode: "dual",
  family: "sizing",
};
const LINE_CLAMP: Utility = {
  name: "line-clamp",
  properties: ["-webkit-line-clamp"],
  mode: "integer",
  family: "typography",
  emit: "line-clamp",
};
const GRID_FIT: Utility = {
  name: "grid-fit",
  properties: ["grid-template-columns"],
  mode: "raw",
  family: "grid",
  emit: "grid-fit",
};
const ROUNDED: Utility = {
  name: "rounded",
  properties: ["border-radius"],
  mode: "raw",
  family: "box",
};
const BG: Utility = {
  name: "bg",
  properties: ["background-color"],
  mode: "raw",
  family: "color",
  emit: "bg",
};
const RING: Utility = {
  name: "ring",
  properties: [],
  mode: "raw",
  family: "effects",
  emit: "none",
};
const SHADOW: Utility = {
  name: "shadow",
  properties: [],
  mode: "raw",
  family: "effects",
  emit: "none",
};
const CONTENT: Utility = {
  name: "content",
  properties: ["content"],
  mode: "raw",
  family: "box",
  pseudo: true,
};
const W_PSEUDO: Utility = { ...W_KW, pseudo: true };
const BG_PSEUDO: Utility = { ...BG, pseudo: true };
const OPACITY: Utility = {
  name: "opacity",
  properties: ["opacity"],
  mode: "raw",
  family: "effects",
};
const GRID_COLS: Utility = {
  name: "grid-cols",
  properties: ["grid-template-columns"],
  mode: "integer",
  family: "grid",
  emit: "repeat",
  noBase: "1",
};

describe("utility registrations", () => {
  it("registers a dual utility as base, layer variable, resolver, and typed pair", () => {
    expect(squash(registrations(W))).toBe(
      squash(`
        @property --w { syntax: "*"; inherits: false; }
        @property --_w { syntax: "*"; inherits: false; }
        @property --_w-resolved { syntax: "*"; inherits: false; }
        @property --_w-len { syntax: "<length-percentage>"; inherits: false; initial-value: 0px; }
        @property --_w-num { syntax: "<number>"; inherits: false; initial-value: 0; }
      `),
    );
  });

  it("registers a tier of a utility as the modifier and its layer variable", () => {
    expect(squash(tierRegistrations(W, "md"))).toBe(
      squash(`
        @property --w--md { syntax: "*"; inherits: false; }
        @property --_w-md { syntax: "*"; inherits: false; }
      `),
    );
  });
});

describe("base rules", () => {
  it("emits the --w resolver with the descending breakpoint chain and the base rule reading it", () => {
    expect(squash(baseRule(W, BREAKPOINTS))).toBe(
      squash(`
        :where([style*="--w:"], [style*="--w--"]) {
          --_w-resolved: var(--_w-2xl, var(--_w-xl, var(--_w-lg, var(--_w-md, var(--_w-sm, var(--_w-xs, var(--_w-2xs, var(--_w))))))));
        }
        :where([style*="--w:"]) {
          --_w: var(--w);
          --_w-len: var(--_w-resolved);
          --_w-num: var(--_w-resolved);
          inline-size: calc(var(--_w-len) + var(--_w-num) * var(--spacing));
        }
      `),
    );
  });
});

describe("setters", () => {
  it("emits the md setter under the md style query copying every breakpoint utility", () => {
    expect(squash(setterRule("md", [W]))).toBe(
      squash(`
        @container style(--cqi-md: true) {
          :where([style*="--md:"]) {
            --_w-md: var(--w--md);
          }
        }
      `),
    );
  });
});

describe("state tiers", () => {
  it("registers a state tier as the modifier, its group twin, and both layer variables", () => {
    expect(squash(tierRegistrations(OPACITY, "hover"))).toBe(
      squash(`
        @property --opacity--hover { syntax: "*"; inherits: false; }
        @property --_opacity-hover { syntax: "*"; inherits: false; }
        @property --group-opacity--hover { syntax: "*"; inherits: false; }
        @property --_opacity-g-hover { syntax: "*"; inherits: false; }
      `),
    );
  });

  it("emits the hover setter inside @media (hover: hover) with its group twin", () => {
    expect(squash(setterRule("hover", [OPACITY]))).toBe(
      squash(`
        @media (hover: hover) {
          :where([style*="--hover:"]:hover) {
            --_opacity-hover: var(--opacity--hover);
          }
          :where([data-ui~="group"]:hover [style*="--group-"]) {
            --_opacity-g-hover: var(--group-opacity--hover);
          }
        }
      `),
    );
  });

  it("emits the disabled setter with the aria fallback and no media query", () => {
    expect(squash(setterRule("disabled", [OPACITY]))).toBe(
      squash(`
        :where([style*="--disabled:"]:is(:disabled, [aria-disabled="true"])) {
          --_opacity-disabled: var(--opacity--disabled);
        }
        :where([data-ui~="group"]:is(:disabled, [aria-disabled="true"]) [style*="--group-"]) {
          --_opacity-g-disabled: var(--group-opacity--disabled);
        }
      `),
    );
  });

  it("emits the --opacity resolver with own states, then group states, then the base", () => {
    expect(squash(baseRule(OPACITY, STATES))).toBe(
      squash(`
        :where([style*="--opacity:"], [style*="--opacity--"], [style*="--group-opacity--"]) {
          --_opacity-resolved: var(--_opacity-disabled, var(--_opacity-active, var(--_opacity-focus-visible, var(--_opacity-focus-within, var(--_opacity-hover, var(--_opacity-checked, var(--_opacity-open, var(--_opacity-g-disabled, var(--_opacity-g-active, var(--_opacity-g-focus-visible, var(--_opacity-g-focus-within, var(--_opacity-g-hover, var(--_opacity-g-checked, var(--_opacity-g-open, var(--_opacity)))))))))))))));
        }
        :where([style*="--opacity:"]) {
          --_opacity: var(--opacity);
          opacity: var(--_opacity-resolved);
        }
      `),
    );
  });
});

describe("no-base rules", () => {
  it("emits the --grid-cols base rule as a repeat() of the resolver", () => {
    expect(squash(baseRule(GRID_COLS, BREAKPOINTS))).toContain(
      squash(`
        :where([style*="--grid-cols:"]) {
          --_grid-cols: var(--grid-cols);
          grid-template-columns: repeat(var(--_grid-cols-resolved), minmax(0, 1fr));
        }
      `),
    );
  });

  it("emits a no-base rule for --grid-cols gated on any tier, ending in the literal 1, excluding data-ui and every tag form", () => {
    expect(squash(noBaseRule(GRID_COLS, ["ui-layout", "ui-tabs"]))).toBe(
      squash(`
        :where(:is([style*="--grid-cols:"], [style*="--grid-cols--"], [style*="--group-grid-cols--"]):not([data-ui], ui-layout, ui-tabs)) {
          grid-template-columns: repeat(var(--_grid-cols-resolved, 1), minmax(0, 1fr));
        }
      `),
    );
  });
});

describe("keyword switch", () => {
  it("lists every keyword form of every utility at the base and each tier", () => {
    expect(keywordGates([W_KW], ["md"])).toBe(
      ':is([style*="--w: auto"], [style*="--w--md: auto"], [style*="--w: fit-content"], [style*="--w--md: fit-content"], [style*="--w: min-content"], [style*="--w--md: min-content"], [style*="--w: max-content"], [style*="--w--md: max-content"])',
    );
  });

  it("has utilities × keywords × (1 + tiers) substrings", () => {
    const list = keywordGates([W_KW, { ...W_KW, name: "h" }], BREAKPOINTS);
    expect(list.match(/\[style\*=/g)).toHaveLength(2 * 4 * 8);
  });

  it("emits the dual --w rule ungated and a raw twin after it, gated on a sizing keyword form", () => {
    const gate = keywordGates([W_KW], ["md"]);
    expect(squash(baseRule(W_KW, ["md"], gate))).toBe(
      squash(`
        :where([style*="--w:"], [style*="--w--"]) {
          --_w-resolved: var(--_w-md, var(--_w));
        }
        :where([style*="--w:"]) {
          --_w: var(--w);
          --_w-len: var(--_w-resolved);
          --_w-num: var(--_w-resolved);
          inline-size: calc(var(--_w-len) + var(--_w-num) * var(--spacing));
        }
        :where([style*="--w:"]${gate}) {
          --_w: var(--w);
          inline-size: var(--_w-resolved);
        }
      `),
    );
  });
});

describe("no-base exclusions", () => {
  it("excludes a layout's children from the --col no-base rule", () => {
    const COL: Utility = {
      name: "col",
      properties: ["grid-column"],
      mode: "raw",
      family: "flow",
      noBase: "auto",
      noBaseExclude: ["ui-layout > *", '[data-ui~="layout"] > *'],
    };
    expect(squash(noBaseRule(COL, ["ui-layout"]))).toBe(
      squash(`
        :where(:is([style*="--col:"], [style*="--col--"], [style*="--group-col--"]):not([data-ui], ui-layout, ui-layout > *, [data-ui~="layout"] > *)) {
          grid-column: var(--_col-resolved, auto);
        }
      `),
    );
  });
});

describe("no-base rules for dual utilities", () => {
  it("emits the --gap no-base rule through the typed pair with a zero fallback", () => {
    expect(squash(noBaseRule(GAP, ["ui-tabs"]))).toBe(
      squash(`
        :where(:is([style*="--gap:"], [style*="--gap--"], [style*="--group-gap--"]):not([data-ui], ui-tabs)) {
          --_gap-len: var(--_gap-resolved, 0);
          --_gap-num: var(--_gap-resolved, 0);
          gap: calc(var(--_gap-len) + var(--_gap-num) * var(--spacing));
        }
      `),
    );
  });
});

describe("emission shapes", () => {
  it("a two-property dual utility emits both properties from one pair", () => {
    expect(squash(baseRule(SIZE, ["md"]))).toContain(
      squash(`
        inline-size: calc(var(--_size-len) + var(--_size-num) * var(--spacing));
        block-size: calc(var(--_size-len) + var(--_size-num) * var(--spacing));
      `),
    );
  });

  it("line-clamp emits the -webkit-box quartet", () => {
    expect(squash(baseRule(LINE_CLAMP, ["md"]))).toContain(
      squash(`
        :where([style*="--line-clamp:"]) {
          --_line-clamp: var(--line-clamp);
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: var(--_line-clamp-resolved);
          overflow: hidden;
        }
      `),
    );
  });

  it("grid-fit emits an auto-fit repeat with the resolved minimum", () => {
    expect(squash(baseRule(GRID_FIT, ["md"]))).toContain(
      squash(`
        grid-template-columns: repeat(auto-fit, minmax(min(var(--_grid-fit-resolved), 100%), 1fr));
      `),
    );
  });

  it("a tier-less utility resolves straight to its base", () => {
    expect(squash(baseRule(ROUNDED, []))).toBe(
      squash(`
        :where([style*="--rounded:"], [style*="--rounded--"]) {
          --_rounded-resolved: var(--_rounded);
        }
        :where([style*="--rounded:"]) {
          --_rounded: var(--rounded);
          border-radius: var(--_rounded-resolved);
        }
      `),
    );
  });
});

describe("color and effects composition", () => {
  it("--bg emits a relative oklch with the resolved alpha, defaulting to 1", () => {
    expect(squash(baseRule(BG, ["hover"]))).toContain(
      squash(`
        :where([style*="--bg:"]) {
          --_bg: var(--bg);
          background-color: oklch(from var(--_bg-resolved) l c h / calc(alpha * var(--_bg-alpha-resolved, 1)));
        }
      `),
    );
  });

  it("a composite-only utility keeps its resolver and base copy but emits no property", () => {
    expect(squash(baseRule(RING, ["hover"]))).toBe(
      squash(`
        :where([style*="--ring:"], [style*="--ring--"], [style*="--group-ring--"]) {
          --_ring-resolved: var(--_ring-hover, var(--_ring-g-hover, var(--_ring)));
        }
        :where([style*="--ring:"]) {
          --_ring: var(--ring);
        }
      `),
    );
  });

  it("ring and shadow compose into one box-shadow behind the focus-ring placeholder, and tier-only on plain elements", () => {
    const emission =
      "box-shadow: var(--_focus-ring, 0 0 #0000), 0 0 0 var(--_ring-offset-resolved, 0px) var(--_ring-offset-color-resolved, transparent), 0 0 0 calc(var(--_ring-offset-resolved, 0px) + var(--_ring-resolved, 0px)) var(--_ring-color-resolved, var(--color-ring)), var(--_shadow-resolved, 0 0 #0000);";
    expect(squash(compositeRule([RING, SHADOW], ["ui-layout", "ui-tabs"]))).toBe(
      squash(`
        :where(:is([style*="--shadow:"], [style*="--ring:"], [style*="--ring-color:"], [style*="--ring-offset:"], [style*="--ring-offset-color:"])) {
          ${emission}
        }
        :where(:is(:is([style*="--shadow--"], [style*="--ring--"], [style*="--ring-color--"], [style*="--ring-offset--"], [style*="--ring-offset-color--"]), :is([style*="--group-shadow--"], [style*="--group-ring--"], [style*="--group-ring-color--"], [style*="--group-ring-offset--"], [style*="--group-ring-offset-color--"])):not([data-ui], ui-layout, ui-tabs)) {
          ${emission}
        }
      `),
    );
  });
});

describe("border shorthand", () => {
  const BORDER: Utility = {
    name: "border",
    properties: [],
    mode: "raw",
    family: "color",
    emit: "border",
  };

  it("registers typed channels that sort the value into a number, a length, or a color", () => {
    expect(squash(registrations(BORDER))).toBe(
      squash(`
        @property --border { syntax: "*"; inherits: false; }
        @property --_border { syntax: "*"; inherits: false; }
        @property --_border-resolved { syntax: "*"; inherits: false; }
        @property --_border-len { syntax: "<length>"; inherits: false; initial-value: 0px; }
        @property --_border-num { syntax: "<number>"; inherits: false; initial-value: 0; }
        @property --_border-is-len { syntax: "<number>"; inherits: false; initial-value: 0; }
        @property --_border-is-num { syntax: "<number>"; inherits: false; initial-value: 0; }
        @property --_border-clr { syntax: "<color>"; inherits: false; initial-value: transparent; }
        @property --_border-w { syntax: "*"; inherits: false; }
        @property --_border-c { syntax: "*"; inherits: false; }
      `),
    );
  });

  it("derives width (1px for a color, abs(n) px for a number, the length itself) and color (--color-border unless a color)", () => {
    expect(squash(baseRule(BORDER, []))).toBe(
      squash(`
        :where([style*="--border:"], [style*="--border--"]) {
          --_border-resolved: var(--_border);
        }
        :where([style*="--border:"]) {
          --_border: var(--border);
          --_border-len: var(--_border-resolved);
          --_border-num: var(--_border-resolved);
          --_border-is-len: calc(sin(atan2(var(--_border-resolved), 1px)) * 0 + 1);
          --_border-is-num: calc(var(--_border-resolved) * 0 + 1);
          --_border-clr: var(--_border-resolved);
          --_border-w: calc(abs(var(--_border-len)) + abs(var(--_border-num)) * 1px + (1 - var(--_border-is-num) - var(--_border-is-len)) * 1px);
          --_border-c: color-mix(in oklch, var(--_border-clr) calc((1 - var(--_border-is-num) - var(--_border-is-len)) * 100%), var(--color-border));
        }
      `),
    );
  });

  it("emits each side from its longhand, then the all-sides longhand, then the side, axis, and all-sides shorthands", () => {
    expect(squash(borderSideRules())).toContain(
      squash(`
        :where([style*="--border:"], [style*="--border-x:"], [style*="--border-l:"]) {
          border-inline-start-width: var(--_border-l-width-resolved, var(--_border-width-resolved, var(--_border-l-w, var(--_border-x-w, var(--_border-w)))));
          border-inline-start-style: var(--_border-style-resolved, solid);
          border-inline-start-color: var(--_border-l-color-resolved, var(--_border-color-resolved, var(--_border-l-c, var(--_border-x-c, var(--_border-c)))));
        }
      `),
    );
    expect(squash(borderSideRules())).toContain(
      squash(`:where([style*="--border:"], [style*="--border-y:"], [style*="--border-b:"]) {
          border-block-end-width: var(--_border-b-width-resolved, var(--_border-width-resolved, var(--_border-b-w, var(--_border-y-w, var(--_border-w)))));`),
    );
  });
});

describe("pseudo-element utilities", () => {
  it("emits an exact-gated ::before rule reading the unregistered utility", () => {
    expect(squash(pseudoRule(CONTENT, "before"))).toBe(
      squash(`
        :where([style*="--before-content:"])::before {
          content: var(--before-content);
        }
      `),
    );
  });

  it("a dual sizing utility on a pseudo-element uses its own typed pair", () => {
    expect(squash(pseudoRule(W_PSEUDO, "after"))).toBe(
      squash(`
        :where([style*="--after-w:"])::after {
          --_after-w-len: var(--after-w);
          --_after-w-num: var(--after-w);
          inline-size: calc(var(--_after-w-len) + var(--_after-w-num) * var(--spacing));
        }
      `),
    );
  });

  it("bg on a pseudo-element keeps the relative oklch with --before-bg-alpha", () => {
    expect(squash(pseudoRule(BG_PSEUDO, "before"))).toBe(
      squash(`
        :where([style*="--before-bg:"])::before {
          background-color: oklch(from var(--before-bg) l c h / calc(alpha * var(--before-bg-alpha, 1)));
        }
      `),
    );
  });

  it("a utility without pseudo eligibility emits nothing", () => {
    expect(pseudoRule(GAP, "before")).toBe("");
  });
});

describe("generated comments", () => {
  it("never close early (a `*/` inside a comment swallows the next rule)", () => {
    for (const [file, text] of generate()) {
      expect(text.split("/*").length, file).toBe(text.split("*/").length);
    }
  });
});

describe("formatter round-trip", () => {
  it("keeps the colon directly after a utility name inside a style attribute", () => {
    // The repo's HTML formatter (oxfmt, then scripts/fmt-html.ts); vp needs the
    // file inside the workspace, so the scratch dir sits in this package.
    const here = dirname(fileURLToPath(import.meta.url));
    const dir = mkdtempSync(join(here, "..", ".fmt-"));
    const file = join(dir, "page.html");
    writeFileSync(
      file,
      `<!doctype html>\n<div style="--p:4;--w--md:fit-content;--before-content:''">x</div>\n`,
    );
    const script = join(here, "fmt-html.ts");
    const result = spawnSync("node", [script, file], { encoding: "utf8" });
    const formatted = readFileSync(file, "utf8");
    rmSync(dir, { recursive: true, force: true });
    expect(result.status, result.stderr).toBe(0);
    for (const gate of ["--p: 4", "--w--md: fit-content"]) {
      expect(formatted, formatted).toContain(gate);
    }
    // oxfmt turns '' into double quotes as entities; after HTML parsing the
    // attribute still reads `--before-content: ""`, which the gate matches.
    expect(formatted, formatted).toMatch(/--before-content: (''|&quot;&quot;)/);
  });
});

describe("generated stylesheets", () => {
  it("are the breakpoints file, the registrations, one registration file per breakpoint, and one file per family", () => {
    expect([...generate().keys()]).toEqual([
      "_breakpoints.css",
      "_properties.css",
      ...BREAKPOINTS.map((bp) => `_properties-${bp}.css`),
      ...STATES.map((state) => `_properties-${state}.css`),
      ...BREAKPOINTS.map((bp) => `_utilities-tier-${bp}.css`),
      ...STATES.map((state) => `_utilities-tier-${state}.css`),
      "_utilities-flow.css",
      "_utilities-grid.css",
      "_utilities-spacing.css",
      "_utilities-margin.css",
      "_utilities-sizing.css",
      "_utilities-typography.css",
      "_utilities-color.css",
      "_utilities-effects.css",
      "_utilities-box.css",
      "_utilities-pseudo.css",
    ]);
  });

  it("on disk are what utilities.ts generates", () => {
    const stale: string[] = [];
    for (const [file, text] of generate()) {
      const committed = readFileSync(join(SRC, "base", file), "utf8");
      if (committed !== text) stale.push(file);
    }
    expect(stale, "run `vp run generate`").toEqual([]);
  });
});
