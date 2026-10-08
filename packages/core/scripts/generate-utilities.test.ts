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
import { BREAKPOINTS, type Utility, STATES, UTILITIES } from "../src/base/utilities.ts";
import {
  baseRule,
  bgNoneRules,
  borderSideRules,
  breakpointQuery,
  compositeRule,
  generate,
  gradientRules,
  keywordRules,
  noBaseRule,
  primitiveSelectors,
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

describe("breakpoint queries", () => {
  it("puts each breakpoint tier in an unnamed size query, so it reads the nearest inline-size container", () => {
    expect(breakpointQuery("md")).toBe("@container (width >= 65ch)");
    expect(squash(setterRule("md", [W]))).toBe(
      squash(`
        @container (width >= 65ch) {
          :where([style*="--md:"]) {
            --_w-md: var(--w--md);
          }
        }
      `),
    );
  });

  it("leaves no page flags or style queries behind", () => {
    const all = [...generate().values()].join("\n");
    expect(all).not.toContain("--cqi-");
    expect(all).not.toContain("@container style(");
    expect(all).not.toContain("@container html");
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
          --_w-resolved: var(--_w-2xl, var(--_w-xl, var(--_w-lg, var(--_w-md, var(--_w-sm, var(--_w))))));
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
        @container (width >= 65ch) {
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
          :where(:hover[style*="--hover:"]) {
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
        :where(:is(:disabled, [aria-disabled="true"])[style*="--disabled:"]) {
          --_opacity-disabled: var(--opacity--disabled);
        }
        :where([data-ui~="group"]:is(:disabled, [aria-disabled="true"]) [style*="--group-"]) {
          --_opacity-g-disabled: var(--group-opacity--disabled);
        }
      `),
    );
  });

  it("emits the --opacity resolver with starting, own states, then group states, then stuck, then the base", () => {
    expect(squash(baseRule(OPACITY, STATES))).toBe(
      squash(`
        :where([style*="--opacity:"], [style*="--opacity--"], [style*="--group-opacity--"]) {
          --_opacity-resolved: var(--_opacity-starting, var(--_opacity-disabled, var(--_opacity-active, var(--_opacity-focus-visible, var(--_opacity-focus-within, var(--_opacity-hover, var(--_opacity-checked, var(--_opacity-current, var(--_opacity-open, var(--_opacity-g-disabled, var(--_opacity-g-active, var(--_opacity-g-focus-visible, var(--_opacity-g-focus-within, var(--_opacity-g-hover, var(--_opacity-g-checked, var(--_opacity-g-current, var(--_opacity-g-open, var(--_opacity-stuck, var(--_opacity)))))))))))))))))));
        }
        :where([style*="--opacity:"]) {
          --_opacity: var(--opacity);
          opacity: var(--_opacity-resolved);
        }
      `),
    );
  });
});

describe("starting state", () => {
  it("copies --<utility>--starting inside @starting-style, with no group form", () => {
    expect(squash(setterRule("starting", [OPACITY]))).toBe(
      squash(`
        @starting-style {
          :where([style*="--starting:"]) {
            --_opacity-starting: var(--opacity--starting);
          }
        }
      `),
    );
    expect(tierRegistrations(OPACITY, "starting")).not.toContain("group-");
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

  it("emits a no-base rule for --grid-cols gated on any tier, ending in the literal 1, excluding every primitive", () => {
    expect(squash(noBaseRule(GRID_COLS, ["ui-layout", "ui-tabs"]))).toBe(
      squash(`
        :where(:is([style*="--grid-cols:"], [style*="--grid-cols--"], [style*="--group-grid-cols--"]):not(ui-layout, ui-tabs)) {
          grid-template-columns: repeat(var(--_grid-cols-resolved, 1), minmax(0, 1fr));
        }
      `),
    );
  });
});

describe("keyword rules", () => {
  it("emits a base keyword as written, then per tier a typed restore and a raw keyword rule", () => {
    expect(squash(keywordRules({ ...W_KW, keywords: ["auto"] }, ["md"], []))).toBe(
      squash(`
        :where(:is([style*="--w: auto"])) {
          inline-size: var(--_w-resolved);
        }
        @container (width >= 65ch) {
          :where([style*="--w:"][style*="--w--md:"]) {
            inline-size: calc(var(--_w-len) + var(--_w-num) * var(--spacing));
          }
          :where([style*="--w:"]:is([style*="--w--md: auto"])) {
            inline-size: var(--_w-resolved);
          }
        }
      `),
    );
  });

  it("gates a no-base utility's tiers on a base or a plain element", () => {
    const GRID_KW: Utility = { ...GRID_COLS, keywords: ["subgrid"] };
    expect(squash(keywordRules(GRID_KW, ["md"], ["ui-layout"]))).toContain(
      squash(`
        :where(:is([style*="--grid-cols:"], :not(ui-layout))[style*="--grid-cols--md:"]) {
          grid-template-columns: repeat(var(--_grid-cols-resolved), minmax(0, 1fr));
        }
      `),
    );
  });

  it("orders keyword rules after the no-base rule and the tiers ascending", () => {
    const css = generate().get("_utilities-grid.css")!;
    const noBase = css.indexOf("grid-template-columns: repeat(var(--_grid-cols-resolved, 1)");
    const sm = css.indexOf('[style*="--grid-cols--sm: subgrid"]');
    const md = css.indexOf('[style*="--grid-cols--md: subgrid"]');
    expect(noBase).toBeGreaterThan(-1);
    expect(sm).toBeGreaterThan(noBase);
    expect(md).toBeGreaterThan(sm);
  });

  it("keeps keyword gates per utility, so --h never reads --w's forms", () => {
    const css = generate().get("_utilities-sizing.css")!;
    const hRules = css.split("\n").filter((line) => line.includes('[style*="--h'));
    expect(hRules.join("\n")).not.toContain('"--w: ');
  });
});

describe("no-base exclusions", () => {
  it("excludes primitives by tag form and data-ui identity, not roles, switches, or prose", () => {
    const selectors = primitiveSelectors();
    expect(selectors).toContain("ui-layout");
    expect(selectors).toContain('[data-ui~="button"]');
    expect(selectors).toContain('[data-ui~="card"]');
    for (const plain of [
      "text-2xl",
      "text-h1",
      "group",
      "pile",
      "sr-only",
      "not-prose",
      "truncate",
      "spin",
      "prose",
    ]) {
      expect(selectors, plain).not.toContain(`[data-ui~="${plain}"]`);
    }
    expect(selectors).not.toContain("[data-ui]");
  });

  it("excludes a layout's children from the --band no-base rule", () => {
    const BAND: Utility = {
      name: "band",
      properties: ["grid-column"],
      mode: "raw",
      family: "flow",
      noBase: "auto",
      noBaseExclude: ["ui-layout > *", '[data-ui~="layout"] > *'],
    };
    expect(squash(noBaseRule(BAND, ["ui-layout"]))).toBe(
      squash(`
        :where(:is([style*="--band:"], [style*="--band--"], [style*="--group-band--"]):not(ui-layout, ui-layout > *, [data-ui~="layout"] > *)) {
          grid-column: var(--_band-resolved, auto);
        }
      `),
    );
  });
});

describe("no-base rules for dual utilities", () => {
  it("emits the --gap no-base rule through the typed pair with a zero fallback", () => {
    expect(squash(noBaseRule(GAP, ["ui-tabs"]))).toBe(
      squash(`
        :where(:is([style*="--gap:"], [style*="--gap--"], [style*="--group-gap--"]):not(ui-tabs)) {
          --_gap-len: var(--_gap-resolved, 0);
          --_gap-num: var(--_gap-resolved, 0);
          gap: calc(var(--_gap-len) + var(--_gap-num) * var(--spacing));
        }
      `),
    );
  });
});

describe("grid placement (Tailwind col-span / col-start / col-end)", () => {
  const flow = () => generate().get("_utilities-flow.css")!;

  it("--col-span emits span n / span n, and its no-base form falls back to span 1", () => {
    expect(squash(flow())).toContain(
      squash(`
        :where([style*="--col-span:"]) {
          --_col-span: var(--col-span);
          grid-column: span var(--_col-span-resolved) / span var(--_col-span-resolved);
        }
      `),
    );
    expect(flow()).toContain(
      "grid-column: span var(--_col-span-resolved, 1) / span var(--_col-span-resolved, 1);",
    );
  });

  it("start and end follow span in source so they combine like Tailwind's", () => {
    const css = flow();
    expect(css.indexOf("grid-column-start:")).toBeGreaterThan(css.indexOf("--_col-span: var"));
    expect(css.indexOf("grid-row-end:")).toBeGreaterThan(css.indexOf("--_row-span: var"));
  });

  it("keeps a layout's children in their band for tier-only column utilities", () => {
    for (const name of ["col-span", "col-start", "col-end"]) {
      const rule = flow()
        .split("\n")
        .find((line) => line.includes(`:where(:is([style*="--${name}:"]`));
      expect(rule, name).toContain('ui-layout > *, [data-ui~="layout"] > *');
    }
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
        :where(:is(:is([style*="--shadow--"], [style*="--ring--"], [style*="--ring-color--"], [style*="--ring-offset--"], [style*="--ring-offset-color--"]), :is([style*="--group-shadow--"], [style*="--group-ring--"], [style*="--group-ring-color--"], [style*="--group-ring-offset--"], [style*="--group-ring-offset-color--"])):not(ui-layout, ui-tabs)) {
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

  it("emits each side from the all-sides longhand, then the side, axis, and all-sides shorthands", () => {
    expect(squash(borderSideRules())).toContain(
      squash(`
        :where([style*="--border:"], [style*="--border-x:"], [style*="--border-l:"]) {
          border-inline-start-width: var(--_border-width-resolved, var(--_border-l-w, var(--_border-x-w, var(--_border-w))));
          border-inline-start-style: var(--_border-style-resolved, solid);
          border-inline-start-color: var(--_border-color-resolved, var(--_border-l-c, var(--_border-x-c, var(--_border-c))));
        }
      `),
    );
    expect(squash(borderSideRules())).toContain(
      squash(`:where([style*="--border:"], [style*="--border-y:"], [style*="--border-b:"]) {
          border-block-end-width: var(--_border-width-resolved, var(--_border-b-w, var(--_border-y-w, var(--_border-w))));`),
    );
  });

  it("--divide registers inheriting width and color channels for the divide-x / divide-y switches", () => {
    const divide = UTILITIES.find((utility) => utility.name === "divide")!;
    const css = squash(registrations(divide));
    expect(css).toContain(`@property --_divide-w { syntax: "*"; inherits: true; }`);
    expect(css).toContain(`@property --_divide-c { syntax: "*"; inherits: true; }`);
    expect(css).toContain(`@property --_divide-len { syntax: "<length>"; inherits: false;`);
  });
});

describe("stuck state", () => {
  const css = () => generate().get("_utilities-tier-stuck.css")!;

  it("makes sticky and --stuck-state elements scroll-state containers publishing their side, keeping layout children inline-size", () => {
    const text = squash(css());
    expect(text).toContain(
      squash(
        `:where([style*=": sticky"], [style*="--stuck-state:"]) { container-type: scroll-state; --_stuck-side: var(--stuck-state, top); }`,
      ),
    );
    expect(text).toContain(
      squash(
        `:where(ui-layout > *, [data-ui~="layout"] > *):where([style*=": sticky"], [style*="--stuck-state:"]) { container-type: inline-size scroll-state; }`,
      ),
    );
    expect(text).not.toMatch(/\bsection\b/);
  });

  it("switches the flag for descendants per side, natively and from data-ui-stuck, top by default", () => {
    const text = squash(css());
    const top =
      ':is([style*="--stuck-state: top"], [style*=": sticky"]:not([style*="--stuck-state:"]))';
    expect(text).toContain(
      squash(
        `@container scroll-state(stuck: top) and style(--_stuck-side: top) { :where([style*="--stuck:"]) { --_stuck-on: ; } }`,
      ),
    );
    expect(text).toContain(
      squash(
        `@container scroll-state(stuck: bottom) and style(--_stuck-side: bottom) { :where([style*="--stuck:"]) { --_stuck-on: ; } }`,
      ),
    );
    // the polyfill: the container compares its side with the attribute and publishes an inherited flag
    expect(text).toContain(squash(`:where(${top}[data-ui-stuck~="top"]) { --_stuck-polyfill: ; }`));
    expect(text).toContain(
      squash(`:where([style*="--stuck:"]) { --_stuck-on: var(--_stuck-polyfill); }`),
    );
    expect(text).not.toContain("scrollable");
  });

  it("never names the container from a reader rule (a [style*=] ancestor compound would invalidate every styled descendant on any inline style change)", () => {
    const readers = css()
      .split("\n")
      .filter((line) => line.includes('[style*="--stuck:"]'));
    expect(readers.length).toBeGreaterThan(0);
    for (const line of readers)
      expect(line.trim()).toMatch(/^:where\(\[style\*="--stuck:"\]\) \{$/);
  });

  it("copies every utility behind the flag once, outside both @supports blocks", () => {
    const text = css();
    const copy = text.indexOf("--_bg-stuck: var(--_stuck-on) var(--bg--stuck);");
    expect(copy).toBeGreaterThan(text.lastIndexOf("@supports"));
    expect(text.match(/--_bg-stuck:/g)).toHaveLength(1);
  });
});

describe("gradients", () => {
  it("composes each type's prelude with the shared --bg-stops into background-image", () => {
    expect(squash(gradientRules())).toBe(
      squash(`
        :where([style*="--bg-linear:"]) {
          background-image: linear-gradient(var(--_bg-linear-resolved), var(--_bg-stops-resolved));
        }
        :where([style*="--bg-radial:"]) {
          background-image: radial-gradient(var(--_bg-radial-resolved), var(--_bg-stops-resolved));
        }
        :where([style*="--bg-conic:"]) {
          background-image: conic-gradient(var(--_bg-conic-resolved), var(--_bg-stops-resolved));
        }
      `),
    );
  });

  it("--bg: none drops background-image at the base and each state, hover behind its media guard", () => {
    const css = squash(bgNoneRules());
    expect(
      css.startsWith(squash(`:where([style*="--bg: none"]) { background-image: none; }`)),
    ).toBe(true);
    expect(css).toContain(
      squash(`@media (hover: hover) {
        :where(:hover[style*="--bg--hover: none"]) { background-image: none; }
      }`),
    );
    // own states come after group states, and disabled (highest) last
    expect(css.indexOf('"--bg--open: none"')).toBeGreaterThan(
      css.indexOf('"--group-bg--disabled: none"'),
    );
    expect(css.lastIndexOf("background-image: none")).toBeGreaterThan(
      css.indexOf('"--bg--disabled: none"'),
    );
  });

  it("emits the gradient and none rules after the color utilities, none last", () => {
    const css = generate().get("_utilities-color.css")!;
    expect(css.indexOf("linear-gradient(")).toBeGreaterThan(
      css.indexOf("--_bg-stops: var(--bg-stops)"),
    );
    expect(css.indexOf('[style*="--bg: none"]')).toBeGreaterThan(css.indexOf("conic-gradient("));
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
    // oxfmt keeps style values verbatim for HTML (zazz/style-format lays them
    // out); vp needs the file inside the workspace, so the scratch dir sits in
    // this package.
    const here = dirname(fileURLToPath(import.meta.url));
    const dir = mkdtempSync(join(here, "..", ".fmt-"));
    const file = join(dir, "page.html");
    writeFileSync(
      file,
      `<!doctype html>\n<div\n  style="\n    --p: 4;\n    --w--md: fit-content;\n    --before-content: '';\n  "\n>\n  x\n</div>\n`,
    );
    const result = spawnSync("vp", ["fmt", file], { encoding: "utf8" });
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
