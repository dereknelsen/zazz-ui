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
  appliesAtRest,
  indexStyling,
  kitStyling,
  shorthandTierRule,
  restSelectors,
  styleRules,
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
    expect(breakpointQuery("md")).toBe("@container (width >= 48rem)");
    expect(squash(setterRule("md", [W]))).toBe(
      squash(`
        @container (width >= 48rem) {
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
        @container (width >= 48rem) {
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

  it("emits a no-base rule for --grid-cols gated on any tier, ending in the literal 1, skipping what it is given", () => {
    expect(squash(noBaseRule(GRID_COLS, ["hr"]))).toBe(
      squash(`
        :where(:is([style*="--grid-cols--"], [style*="--group-grid-cols--"]):not(hr)) {
          grid-template-columns: repeat(var(--_grid-cols-resolved, 1), minmax(0, 1fr));
        }
      `),
    );
  });
});

describe("keyword rules", () => {
  it("emits a base keyword as written, then per tier a typed restore and a raw keyword rule", () => {
    expect(squash(keywordRules({ ...W_KW, keywords: ["auto"] }, ["md"]))).toBe(
      squash(`
        :where(:is([style*="--w: auto"])) {
          inline-size: var(--_w-resolved);
        }
        @container (width >= 48rem) {
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

  it("gates a no-base utility's tiers on a base, and its defaults copy on the tier alone", () => {
    const GRID_KW: Utility = { ...GRID_COLS, keywords: ["subgrid"] };
    expect(squash(keywordRules(GRID_KW, ["md"]))).toContain(
      squash(`
        :where([style*="--grid-cols:"][style*="--grid-cols--md:"]) {
          grid-template-columns: repeat(var(--_grid-cols-resolved), minmax(0, 1fr));
        }
      `),
    );
    const defaults = squash(keywordRules(GRID_KW, ["md"], { skips: ["hr"] }));
    expect(defaults).toContain(
      squash(`
        :where(:not(hr)[style*="--grid-cols--md:"]) {
          grid-template-columns: repeat(var(--_grid-cols-resolved), minmax(0, 1fr));
        }
      `),
    );
    // the base keyword rule lives in the utilities copy only
    expect(defaults).not.toContain('[style*="--grid-cols: subgrid"]');
  });

  it("orders keyword rules after the no-base rule and the tiers ascending", () => {
    const css = generate().get("_defaults.css")!;
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

describe("the defaults layer", () => {
  it("holds every tier-only rule, below the components, and no base-gated rule", () => {
    const css = generate().get("_defaults.css")!;
    expect(css).toContain("@layer defaults {");
    expect(css).toContain('[style*="--band--"]');
    expect(css).not.toMatch(/\[style\*="--[a-z]+(?:-[a-z]+)*:"\]/);
    for (const [file, text] of generate()) {
      if (file.startsWith("_utilities-"))
        expect(text, file).not.toContain("var(--_band-resolved, auto)");
    }
  });

  it("skips no layout child: the layout's own rule wins by layer", () => {
    expect(generate().get("_defaults.css")!).not.toContain("ui-layout > *");
  });
});

describe("no-base rules for dual utilities", () => {
  it("emits the --gap no-base rule through the typed pair with a zero fallback", () => {
    expect(squash(noBaseRule(GAP))).toBe(
      squash(`
        :where(:is([style*="--gap--"], [style*="--group-gap--"])) {
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
    expect(generate().get("_defaults.css")!).toContain(
      "grid-column: span var(--_col-span-resolved, 1) / span var(--_col-span-resolved, 1);",
    );
  });

  it("start and end follow span in source so they combine like Tailwind's", () => {
    const css = flow();
    expect(css.indexOf("grid-column-start:")).toBeGreaterThan(css.indexOf("--_col-span: var"));
    expect(css.indexOf("grid-row-end:")).toBeGreaterThan(css.indexOf("--_row-span: var"));
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

  it("a px utility resolves to one signed length, ending its chain in chainEnd", () => {
    const focusRing: Utility = {
      name: "focus-ring",
      properties: [],
      mode: "raw",
      family: "effects",
      emit: "px",
      tiers: "breakpoints",
      chainEnd: "var(--ring-width)",
    };
    expect(squash(baseRule(focusRing, ["md"]))).toBe(
      squash(`
        :where([style*="--focus-ring:"], [style*="--focus-ring--"]) {
          --_focus-ring-resolved: var(--_focus-ring-md, var(--_focus-ring, var(--ring-width)));
          --_focus-ring-len: var(--_focus-ring-resolved);
          --_focus-ring-num: var(--_focus-ring-resolved);
          --_focus-ring-w: calc(var(--_focus-ring-len) + var(--_focus-ring-num) * 1px);
        }
        :where([style*="--focus-ring:"]) {
          --_focus-ring: var(--focus-ring);
        }
      `),
    );
    expect(registrations(focusRing)).toContain(
      '@property --_focus-ring-len { syntax: "<length>"; inherits: false; initial-value: 0px; }',
    );
  });

  it("ring and shadow compose into one box-shadow behind the focus-shadow placeholder, and tier-only on plain elements", () => {
    const offset = "abs(var(--_ring-offset-w, 0px))";
    const band = `(${offset} + abs(var(--_ring-w, 0px)))`;
    const inset = "max(0, -1 * sign(var(--_ring-w, 0px)))";
    const offsetColor = "var(--_ring-offset-color-resolved, transparent)";
    const color = "var(--_ring-color-resolved, var(--color-ring))";
    const emission = `box-shadow: var(--_focus-shadow, 0 0 #0000), 0 0 0 calc(${offset} * (1 - ${inset})) ${offsetColor}, 0 0 0 calc(${band} * (1 - ${inset})) ${color}, inset 0 0 0 calc(${offset} * ${inset}) ${offsetColor}, inset 0 0 0 calc(${band} * ${inset}) ${color}, var(--_shadow-resolved, 0 0 #0000);`;
    expect(squash(compositeRule([RING, SHADOW]))).toBe(
      squash(`
        :where(:is([style*="--shadow:"], [style*="--ring:"], [style*="--ring-color:"], [style*="--ring-offset:"], [style*="--ring-offset-color:"])) {
          ${emission}
        }
      `),
    );
    expect(squash(compositeRule([RING, SHADOW], { skips: ["hr"] }))).toBe(
      squash(`
        :where(:is(:is([style*="--shadow--"], [style*="--ring--"], [style*="--ring-color--"], [style*="--ring-offset--"], [style*="--ring-offset-color--"]), :is([style*="--group-shadow--"], [style*="--group-ring--"], [style*="--group-ring-color--"], [style*="--group-ring-offset--"], [style*="--group-ring-offset-color--"])):not(hr)) {
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
  it("are the breakpoints file, the defaults layer, the kit styling data, the registrations, one registration file per breakpoint, and one file per family", () => {
    expect([...generate().keys()]).toEqual([
      "_breakpoints.css",
      "_defaults.css",
      "kit-styling.ts",
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

describe("kit-styling.ts", () => {
  const styling = kitStyling();

  it("exports the kit's styling facts with each selector stored once", async () => {
    const module = await import("../src/base/kit-styling.ts");
    const indexed = indexStyling(styling);
    expect(module.KIT_SELECTORS).toEqual(indexed.selectors);
    expect(module.TIER_READS).toEqual(indexed.reads);
    expect(module.TIER_BLOCKS).toEqual(indexed.blocks);
    expect(new Set(indexed.selectors).size).toBe(indexed.selectors.length);
  });

  it("maps each utility to the elements the kit reads it on", () => {
    expect(styling.reads.px).toContain('[data-ui~="button"]');
    expect(styling.reads.px).toContain("kbd");
    expect(styling.reads.band).toEqual([':is(ui-layout, [data-ui~="layout"]) > *']);
    // only the horizontal field's rule reads --items
    expect(styling.reads.items).toContain(
      '[data-ui~="field"][data-field-orientation="horizontal"]',
    );
    expect(styling.reads.items).not.toContain('[data-ui~="field"]');
  });

  it("maps each tier-only utility to the elements the kit sets its property on", () => {
    // a popover paints itself; a card pads itself; inline code is padded by the reset
    expect(styling.blocks.bg).toContain("[popover]");
    expect(styling.blocks.p).toContain('[data-ui~="card"]');
    expect(styling.blocks.px).toContain("code");
    // the reset's normalizing (universal zeroing, a link's inherited decoration)
    // is what the defaults layer beats
    expect(styling.blocks.p).not.toContain("*");
    expect(styling.blocks["text-decoration"]).not.toContain("a");
    // a reset value that is not the utility's literal styles the element
    expect(styling.blocks.shrink).toContain("hr");
    // `inherit` on an inherited property keeps the parent's value
    expect(styling.blocks["text-align"]).toEqual(expect.arrayContaining(["button"]));
    // the browser's own styling sits below the defaults layer too
    expect(styling.blocks.position).toContain("dialog");
    // a card sets no opacity, so --opacity--hover works on it alone
    expect(styling.blocks.opacity).not.toContain('[data-ui~="card"]');
  });

  it("skips in the defaults layer only the reset's and the browser's deliberate styling", () => {
    const { skips } = styling;
    expect(skips.px).toContain("code");
    expect(skips.position).toContain("dialog");
    expect(skips.p).not.toContain("*");
    expect(skips.p ?? []).not.toContain('[data-ui~="card"]');
    // a switch styles the label that has it, not every label
    expect(Object.values(skips).flat()).not.toContain("label");
    expect(Object.values(skips).flat()).not.toContain(":not([data-gjs-type])");
  });

  it("strips states, keeps :not(), :has(), and :is() groups, and joins a one-compound group", () => {
    expect(restSelectors(":where(kbd):not([data-x]):hover > :is(a, b):has(> i:checked)")).toEqual([
      "kbd:not([data-x]) > :is(a, b):has(> i)",
    ]);
    expect(restSelectors(':where(ui-layout, [data-ui~="layout"]) > *')).toEqual([
      ':is(ui-layout, [data-ui~="layout"]) > *',
    ]);
    expect(restSelectors("label:has(> input):not(:disabled):first-child")).toEqual([
      "label:has(> input)",
    ]);
    expect(restSelectors('input[type="radio"]:checked + [data-x~="label"]')).toEqual([
      'input[type="radio"] + [data-x~="label"]',
    ]);
    expect(restSelectors('input[role="switch"]:checked')).toEqual(['input[role="switch"]']);
    expect(restSelectors(":root")).toEqual(["html"]);
    expect(restSelectors("label::after")).toEqual([]);
    expect(restSelectors("label:after")).toEqual([]);
    expect(restSelectors(":hover")).toEqual(["*"]);
    expect(restSelectors(':where([data-ui~="badge"]):where(a[href])')).toEqual([
      'a[data-ui~="badge"][href]',
    ]);
  });

  it("counts a rule as applying at rest unless it needs a state outside :not()", () => {
    expect(appliesAtRest("button:disabled")).toBe(false);
    expect(appliesAtRest(':where([data-ui~="button"]:is(:disabled, [aria-disabled="true"]))')).toBe(
      false,
    );
    expect(appliesAtRest("button:not(:disabled)")).toBe(true);
    expect(appliesAtRest("input:placeholder-shown")).toBe(true);
    expect(appliesAtRest(":target-within")).toBe(true);
  });

  it("tracks layers and resolves a nested &", () => {
    expect(
      styleRules("@layer ui.components { a, b { @media (x) { &:hover { --y: 1 } } } }").at(0),
    ).toEqual({
      selectors: ["a:hover", "b:hover"],
      declarations: " --y: 1 ;",
      layer: "ui.components",
    });
    expect(styleRules("@layer ui { @layer components { a { b: c } } }").at(0)!.layer).toBe(
      "ui.components",
    );
    expect(styleRules("a { b { --y: 1 } }").at(0)!.selectors).toEqual(["a b"]);
    expect(styleRules("@keyframes k { 0% { opacity: 0 } }").at(0)!.selectors).toEqual([]);
  });
});

describe("shorthand tiers", () => {
  it("gates a longhand's tier on its shorthand's base, falling back to the shorthand's value", () => {
    const pt = UTILITIES.find((utility) => utility.name === "pt")!;
    expect(squash(shorthandTierRule(pt))).toBe(
      squash(`
        :where(:is([style*="--py:"], [style*="--p:"]):is([style*="--pt--"], [style*="--group-pt--"])) {
          --_pt-len: var(--_pt-resolved, var(--_py-resolved, var(--_p-resolved, 0)));
          --_pt-num: var(--_pt-resolved, var(--_py-resolved, var(--_p-resolved, 0)));
          padding-block-start: calc(var(--_pt-len) + var(--_pt-num) * var(--spacing));
        }
      `),
    );
  });
});
