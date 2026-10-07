"use strict";

/**
 * @fileoverview `<ui-debug>`: domain gating and the
 * documented warning, plus one case per audit warning, through the pure
 * `audit()` seam.
 */

import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { DEBUG_WARNING, audit, navigationReport } from "./debug.ts";

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

/** Messages the audit raises for `html`, joined so substring checks read well. */
const IDENTITIES = [
  "button",
  "button-group",
  "field",
  "field-group",
  "radio-group",
  "carousel",
  "dialog",
  "otp",
  "reveal",
];

function warningsFor(html: string, hooks: Record<string, string[]> = {}): string[] {
  const root = mount(`<div>${html}</div>`);
  return audit(root, { hooks, identities: IDENTITIES }).map((warning) => warning.message);
}

describe("<ui-debug> domain gating (claim 25)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("stays on a listed domain", () => {
    const el = mount(
      `<ui-debug data-debug-domains="${location.hostname}, staging.example.com"></ui-debug>`,
    );
    expect(el.isConnected).toBe(true);
  });

  it("on an unlisted domain removes itself and logs the documented warning once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(
      `<div><ui-debug data-debug-domains="nowhere.invalid"></ui-debug><ui-debug data-debug-domains="nowhere.invalid"></ui-debug></div>`,
    );
    expect(document.querySelector("ui-debug")).toBeNull();
    expect(warn.mock.calls.map((call) => call[0])).toEqual([DEBUG_WARNING]);
    expect(DEBUG_WARNING).toBe(
      'Style utility debug tools are still loaded in this domain, but not enabled. If this is intentional, you can ignore this warning by setting data-debug-warnings="false".',
    );
  });

  it('logs nothing with data-debug-warnings="false"', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(`<ui-debug data-debug-domains="nowhere.invalid" data-debug-warnings="false"></ui-debug>`);
    expect(document.querySelector("ui-debug")).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("audit warnings", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is silent on well-formed utilities", () => {
    expect(
      warningsFor(
        `<div style="--w: 4; --w--md: 6rem; --display: grid; --grid-cols--md: 3; --bg: red; --bg--hover: blue"></div>`,
      ),
    ).toEqual([]);
  });

  it("flags an unknown utility name", () => {
    expect(warningsFor(`<div style="--foo: 1"></div>`)).toEqual([expect.stringContaining("--foo")]);
    expect(warningsFor(`<div style="--foo: 1"></div>`)[0]).toMatch(/unknown/);
  });

  it("flags a wrong mode: a stray word on a dual utility, a number on a keyword utility", () => {
    expect(warningsFor(`<div style="--w: fit"></div>`)).toEqual([
      expect.stringMatching(/--w: fit.*keyword/),
    ]);
    expect(warningsFor(`<div style="--w: fit-content"></div>`)).toEqual([]);
    expect(warningsFor(`<div style="--display: 3"></div>`)).toEqual([
      expect.stringMatching(/--display: 3.*keyword/),
    ]);
  });

  it("flags a track list on an integer utility, base or tier, and points at the template form", () => {
    expect(warningsFor(`<div style="--grid-cols: 7fr 5fr"></div>`)).toEqual([
      expect.stringMatching(/--grid-cols: 7fr 5fr.*integer.*--template-cols/),
    ]);
    expect(warningsFor(`<div style="--grid-cols: 1; --grid-cols--md: 1fr 2fr"></div>`)).toEqual([
      expect.stringMatching(/--grid-cols--md: 1fr 2fr.*--template-cols--md/),
    ]);
    expect(warningsFor(`<div style="--grid-rows: auto 1fr"></div>`)).toEqual([
      expect.stringMatching(/--grid-rows: auto 1fr.*--template-rows/),
    ]);
    expect(warningsFor(`<p style="--line-clamp: two"></p>`)).toEqual([
      expect.stringMatching(/^`--line-clamp: two` is not an integer\.$/),
    ]);
    expect(
      warningsFor(
        `<div style="--grid-cols: 3; --grid-cols--md: var(--n); --grid-rows: calc(1 + 1); --line-clamp: 2; --line-clamp--md: none"></div>`,
      ),
    ).toEqual([]);
  });

  it("flags a tier without a base on a utility outside the no-base allowlist", () => {
    expect(warningsFor(`<div style="--w--md: 4"></div>`)).toEqual([
      expect.stringMatching(/--w--md.*base/),
    ]);
    expect(warningsFor(`<div style="--grid-cols--md: 3"></div>`)).toEqual([]);
  });

  it("flags a modifier on a family that has none, and a tier the family lacks", () => {
    expect(warningsFor(`<div style="--rounded: 4; --rounded--md: 8"></div>`)).toEqual([
      expect.stringMatching(/--rounded--md.*tier/),
    ]);
    // color takes breakpoints and states; effects only states
    expect(
      warningsFor(`<div style="--bg: red; --bg--md: blue; --bg--hover: green"></div>`),
    ).toEqual([]);
    expect(warningsFor(`<div style="--opacity: 1; --opacity--md: 0.5"></div>`)).toEqual([
      expect.stringMatching(/--opacity--md.*tier/),
    ]);
    expect(
      warningsFor(`<div data-ui="group"><i style="--bg: red; --group-bg--md: blue"></i></div>`),
    ).toEqual([expect.stringMatching(/--group-bg--md.*state/)]);
  });

  it("flags a base utility that flattens a state a primitive hook covers (claim 27)", () => {
    const hooks = { button: ["bg--hover"] };
    expect(warningsFor(`<button data-ui="button" style="--bg: red"></button>`, hooks)).toEqual([
      expect.stringMatching(/--bg.*hover.*--ui-button-bg--hover/),
    ]);
    expect(
      warningsFor(`<button data-ui="button" style="--bg: red; --bg--hover: blue"></button>`, hooks),
    ).toEqual([]);
    expect(warningsFor(`<button data-ui="button" style="--bg: red"></button>`)).toEqual([]);
  });

  it("trusts a utility on a primitive that carries a variant preset", () => {
    const hooks = { button: ["text--hover", "text--active"] };
    expect(
      warningsFor(
        `<a data-ui="button" data-button-variant="ghost" style="--text: var(--color-white)"></a>`,
        hooks,
      ),
    ).toEqual([]);
  });

  it("flags a border shorthand value that is not one color, number, or length", () => {
    // the unit DOM accepts every value; stand in for a browser's color parser
    const colors = new Set(["red", "currentcolor", "transparent"]);
    vi.stubGlobal("CSS", {
      supports: (property: string, value?: string) =>
        property === "color" && colors.has(String(value).toLowerCase()),
    });
    expect(warningsFor(`<div style="--border: 1px solid red"></div>`)).toEqual([
      expect.stringMatching(/--border: 1px solid red.*one color, number, or length/),
    ]);
    expect(warningsFor(`<div style="--border-b: 50%"></div>`)).toEqual([
      expect.stringMatching(/--border-b: 50%/),
    ]);
    expect(warningsFor(`<div style="--border-x: rde"></div>`)).toEqual([
      expect.stringMatching(/--border-x: rde/),
    ]);
    expect(warningsFor(`<div style="--border: red; --border--hover: b"></div>`)).toEqual([
      expect.stringMatching(/--border--hover: b/),
    ]);
    expect(
      warningsFor(
        `<div style="--border: red; --border-l: 2; --border-r: -3px; --border-t: var(--color-primary); --border-b: calc(1px + 1px); --border-y: oklch(0.5 0.1 20 / 50%); --border-x: currentColor"></div>`,
      ),
    ).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("flags a border shorthand that flattens a primitive's border-color state", () => {
    const hooks = { input: ["border-color--hover"] };
    expect(warningsFor(`<input data-ui="input" style="--border-b: red">`, hooks)).toEqual([
      expect.stringMatching(/--border-b.*hover.*--ui-input-border-color--hover/),
    ]);
    expect(
      warningsFor(`<input data-ui="input" style="--border: red; --border--hover: blue">`, hooks),
    ).toEqual([]);
    expect(
      warningsFor(
        `<input data-ui="input" style="--border-b: red; --border-color--hover: blue">`,
        hooks,
      ),
    ).toEqual([]);
  });

  it("accepts numbers and keywords mixed across one utility's tiers (claim 23)", () => {
    expect(warningsFor(`<div style="--w: auto; --w--md: 4"></div>`)).toEqual([]);
    expect(warningsFor(`<div style="--w: 4; --w--md: auto"></div>`)).toEqual([]);
  });

  it("leaves other utilities' numbers alone next to a keyword", () => {
    expect(warningsFor(`<div style="--w: fit-content; --h: 4"></div>`)).toEqual([]);
    expect(warningsFor(`<img style="--w: 100%; --max-w: 56; --mx: auto" />`)).toEqual([]);
  });

  it("accepts grid track keywords and the span utilities", () => {
    expect(
      warningsFor(
        `<div style="--display: grid; --grid-cols: subgrid; --grid-rows: 2; --col-span: 2; --col-start: 1; --row-span--md: 3"></div>`,
      ),
    ).toEqual([]);
    expect(warningsFor(`<div style="--grid-cols: 1; --grid-cols--md: subgrid"></div>`)).toEqual([]);
    expect(warningsFor(`<div style="--col-span: full"></div>`)).toEqual([
      expect.stringMatching(/--col-span: full.*integer.*--col-start: 1; --col-end: -1/),
    ]);
    expect(warningsFor(`<div style="--row-span--md: full"></div>`)).toEqual([
      expect.stringMatching(/--row-span--md: full.*integer.*--row-start--md: 1; --row-end--md: -1/),
    ]);
    expect(warningsFor(`<div style="--row: span 2"></div>`)).toEqual([
      expect.stringMatching(/`--row` is an unknown utility/),
    ]);
  });

  it("understands group states: valid on state families, base still required", () => {
    expect(
      warningsFor(
        `<div data-ui="group"><span style="--opacity: 1; --group-opacity--hover: 0.5; --text: red; --group-text--hover: blue"></span></div>`,
      ),
    ).toEqual([]);
    expect(warningsFor(`<span style="--group-bg--hover: red"></span>`)).toEqual([
      expect.stringMatching(/--group-bg--hover.*base/),
    ]);
    expect(warningsFor(`<span style="--px: 2; --group-px--hover: 4"></span>`)).toEqual([
      expect.stringMatching(/--group-px--hover.*tier/),
    ]);
  });

  it("understands pseudo forms and !important", () => {
    expect(
      warningsFor(
        `<div style="--before-content: 'x'; --before-w: 4; --after-bg--hover: red; --after-bg: blue"></div>`,
      ),
    ).toEqual([]);
    // display has a pseudo form now; gap (a container property) still does not
    expect(warningsFor(`<div style="--before-display: grid"></div>`)).toEqual([]);
    expect(warningsFor(`<div style="--before-gap: 4"></div>`)).toEqual([
      expect.stringMatching(/--before-gap.*::before/),
    ]);
    expect(warningsFor(`<div style="--w: 4 !important"></div>`)).toEqual([]);
  });

  it("flags a raw property shadowing a utility", () => {
    expect(warningsFor(`<div style="padding: 10px; --p: 4"></div>`)).toEqual([
      expect.stringMatching(/padding.*--p/),
    ]);
  });

  it("flags a whitespace form the gates cannot match", () => {
    expect(warningsFor(`<div style="--w : 4"></div>`)).toEqual([
      expect.stringMatching(/--w.*whitespace|--w.*space/),
    ]);
  });

  it("flags a data-<name>-* attribute outside its identity, not slots, states, tag forms, or descendants", () => {
    expect(warningsFor(`<button data-button-variant="primary"></button>`)).toEqual([
      expect.stringMatching(/data-button-variant.*data-ui/),
    ]);
    expect(warningsFor(`<button data-ui="button" data-button-variant="primary"></button>`)).toEqual(
      [],
    );
    expect(
      warningsFor(`<div data-ui="field-group" data-field-orientation="horizontal"></div>`),
    ).toEqual([]);
    expect(warningsFor(`<div data-ui="dialog"><h2 data-dialog-slot="title"></h2></div>`)).toEqual(
      [],
    );
    expect(warningsFor(`<div data-carousel-state="active"></div>`)).toEqual([]);
    expect(
      warningsFor(
        `<ui-carousel data-carousel-loop="true"><div data-carousel-slot="viewport"></div></ui-carousel>`,
      ),
    ).toEqual([]);
    expect(warningsFor(`<ui-otp data-otp-groups="3"></ui-otp>`)).toEqual([]);
    expect(
      warningsFor(`<ui-button-group data-button-group-orientation="vertical"></ui-button-group>`),
    ).toEqual([]);
    expect(warningsFor(`<div data-reveal="slide-up" data-reveal-duration="300"></div>`)).toEqual(
      [],
    );
    expect(warningsFor(`<div data-probe data-transition-layer="x"></div>`)).toEqual([]);
  });
});

describe("navigation report", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-ui-navigation");
  });

  it("says nothing on a page that neither swaps nor persists", () => {
    document.body.innerHTML = `<header>x</header>`;
    expect(navigationReport(document)).toEqual({ notes: [], warnings: [] });
  });

  it("lists the persisted elements on a swap page", () => {
    document.documentElement.setAttribute("data-ui-navigation", "swap");
    document.body.innerHTML = `<header><div data-ui-persist="cart"></div></header><ui-toaster data-ui-persist="toaster"></ui-toaster>`;
    const { notes, warnings } = navigationReport(document);
    expect(warnings).toEqual([]);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.message).toMatch(/2 elements persist/);
    expect(notes[0]!.message).toMatch(/"cart".*"toaster"/);
    expect(notes[0]!.elements).toHaveLength(2);
  });

  it("notes a swap page where nothing persists", () => {
    document.documentElement.setAttribute("data-ui-navigation", "swap");
    document.body.innerHTML = `<main></main>`;
    expect(navigationReport(document).notes[0]!.message).toMatch(/nothing persists/);
  });

  it("warns on a missing id, a duplicate id, nesting, and persistence without the opt-in", () => {
    document.body.innerHTML = `<div data-ui-persist></div>`;
    expect(navigationReport(document).warnings.map((w) => w.message)).toEqual([
      expect.stringMatching(/data-ui-navigation="swap"/),
    ]);
    document.documentElement.setAttribute("data-ui-navigation", "swap");
    document.body.innerHTML = `<div data-ui-persist></div><p data-ui-persist="a"></p><p data-ui-persist="a"></p><section data-ui-persist="outer"><span data-ui-persist="inner"></span></section>`;
    const messages = navigationReport(document).warnings.map((w) => w.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/no id/),
        expect.stringMatching(/"a".*twice|duplicate.*"a"/),
        expect.stringMatching(/"inner".*inside.*"outer"/),
      ]),
    );
    expect(messages).toHaveLength(3);
  });

  it("lists the scroll-carried elements, and warns on persist-scroll that cannot work", () => {
    document.body.innerHTML = `<aside data-ui-persist-scroll="side"></aside>`;
    expect(navigationReport(document).warnings.map((w) => w.message)).toEqual([
      expect.stringMatching(/data-ui-persist-scroll.*data-ui-navigation="swap"/),
    ]);
    document.documentElement.setAttribute("data-ui-navigation", "swap");
    expect(navigationReport(document).notes[0]!.message).toMatch(
      /1 element comes from the next page but keeps its scroll offset \("side"\)/,
    );
    document.body.innerHTML = `<div data-ui-persist="cart"></div>`;
    expect(navigationReport(document).notes[0]!.message).toMatch(/1 element persists across/);
    document.body.innerHTML = `<aside data-ui-persist-scroll></aside><nav data-ui-persist-scroll="a"></nav><nav data-ui-persist-scroll="a"></nav><header data-ui-persist="head"><nav data-ui-persist-scroll="inner"></nav></header><div data-ui-persist="self" data-ui-persist-scroll="both"></div>`;
    const messages = navigationReport(document).warnings.map((w) => w.message);
    expect(messages).toEqual([
      expect.stringMatching(/data-ui-persist-scroll` has no id/),
      expect.stringMatching(/data-ui-persist-scroll="a"` is used twice/),
      expect.stringMatching(/"inner".*inside.*data-ui-persist="head"/),
      expect.stringMatching(/"both".*data-ui-persist="self"/),
    ]);
  });

  it("flags an incomplete gradient: a type without stops, stops without a type, two types", () => {
    expect(warningsFor(`<div style="--bg-linear: to right; --bg-stops: red, blue"></div>`)).toEqual(
      [],
    );
    expect(warningsFor(`<div style="--bg-linear: to right"></div>`)).toEqual([
      expect.stringMatching(/--bg-linear.*--bg-stops/),
    ]);
    expect(warningsFor(`<div style="--bg-stops: red, blue"></div>`)).toEqual([
      expect.stringMatching(/--bg-stops.*gradient type/),
    ]);
    expect(
      warningsFor(
        `<div style="--bg-linear: to right; --bg-radial: circle; --bg-stops: red, blue"></div>`,
      ),
    ).toEqual([expect.stringMatching(/One gradient per element/)]);
    expect(warningsFor(`<div style="--bg: none"></div>`)).toEqual([]);
  });

  it("knows the stuck state and its --stuck-state modifier", () => {
    expect(
      warningsFor(
        `<header style="--position: sticky; --top: 0; --stuck-state: top"><p style="--bg: red; --bg--stuck: blue; --opacity--stuck: .5"></p></header>`,
      ),
    ).toEqual([]);
    expect(warningsFor(`<header style="--position: sticky; --stuck-state: up"></header>`)).toEqual([
      expect.stringMatching(/--stuck-state: up.*side/),
    ]);
    expect(
      warningsFor(`<header style="--position: sticky; --stuck-state--md: top"></header>`),
    ).toEqual([expect.stringMatching(/--stuck-state--md.*no tiers/)]);
    expect(
      warningsFor(`<header style="--position: sticky; --bg: red; --bg--stuck: blue"></header>`),
    ).toEqual([expect.stringMatching(/--bg--stuck.*sticky container itself/)]);
    expect(
      warningsFor(`<p data-ui="group"><i style="--bg: red; --group-bg--stuck: blue"></i></p>`),
    ).toEqual([expect.stringMatching(/--group-bg--stuck.*no group form/)]);
    expect(warningsFor(`<p style="--w: 4; --w--stuck: 8"></p>`)).toEqual([
      expect.stringMatching(/--w--stuck.*tier/),
    ]);
  });

  it("knows the starting state: no base needed where the utility has a default, no group form", () => {
    expect(
      warningsFor(
        `<p style="--opacity--starting: 0; --opacity: 1; --translate--starting: 0 1rem; --transition: opacity .3s, translate .3s"></p>`,
      ),
    ).toEqual([]);
    expect(warningsFor(`<p style="--bg--starting: red"></p>`)).toEqual([
      expect.stringMatching(/--bg--starting.*no base/),
    ]);
    expect(
      warningsFor(
        `<p data-ui="group"><i style="--opacity: 1; --group-opacity--starting: 0"></i></p>`,
      ),
    ).toEqual([expect.stringMatching(/--group-opacity--starting.*no group form/)]);
    expect(warningsFor(`<p style="--w: 4; --w--starting: 0"></p>`)).toEqual([
      expect.stringMatching(/--w--starting.*tier/),
    ]);
  });

  it("points standard weight names to numbers, and --flex-direction to the display shorthands", () => {
    expect(warningsFor(`<p style="--font-weight: medium"></p>`)).toEqual([
      expect.stringMatching(/medium.*write `500`/),
    ]);
    expect(warningsFor(`<p style="--font-weight: strong; --font-weight--md: 600"></p>`)).toEqual(
      [],
    );
    expect(warningsFor(`<p style="--flex-direction: column"></p>`)).toEqual([
      expect.stringMatching(/--flex-direction.*--display: flex-col/),
    ]);
    expect(
      warningsFor(`<p style="--display: flex-col; --display--md: inline-flex-row-reverse"></p>`),
    ).toEqual([]);
    expect(
      warningsFor(`<p style="--shadow: md; --shadow--hover: xl; --shadow-hue: red"></p>`),
    ).toEqual([]);
  });
});
