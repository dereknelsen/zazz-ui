/**
 * @fileoverview Elevation prototype: writes the shadow formula as CSS from the
 * controls, so the browser evaluates the same math the generator will emit.
 * `elevationLayers()` is the function to port to `generate-utilities.ts`.
 */

import "@zazz-ui/core/index.ts";

interface Layer {
  /** Elevation at which the layer starts to show. */
  t: number;
  /** Opacity gained per unit of elevation past `t`. */
  m: number;
  /** Opacity cap. */
  c: number;
  /** Blur as a share of the layer's distance. */
  r: number;
}

/** Derek's tuning (2026-10-15): four layers; blur ratios fitted to today's `--shadow-2xl`. */
const LAYERS: Layer[] = [
  { t: 0, m: 0.04, c: 0.08, r: 2.2 },
  { t: 0.5, m: 0.02, c: 0.06, r: 1 },
  { t: 1.5, m: 0.012, c: 0.05, r: 0.6 },
  { t: 4, m: 0.006, c: 0.04, r: 0.4 },
  { t: 8, m: 0.003, c: 0.03, r: 0.28 },
];

/**
 * The layers for an elevation expression, nearest first. `form` picks
 * `drop-shadow()` functions (for `filter`) or a box-shadow list. Layer k of
 * `count` sits at `n × spacing × 4 × (k / count)²`.
 */
export function elevationLayers(
  n: string,
  layers: readonly Layer[],
  form: "drop" | "box",
  angle = "var(--angle, 0deg)",
  tint = "var(--tint, var(--color-shadow))",
): string {
  const count = layers.length;
  return layers
    .map((layer, i) => {
      const f = ((i + 1) / count) ** 2;
      const d = `(abs(${n}) * var(--spacing) * ${4 * f})`;
      const x = `calc(${d} * -1 * sin(${angle}))`;
      const y = `calc(${d} * cos(${angle}))`;
      const blur = `max(1px, calc(${d} * ${layer.r}))`;
      const alpha = `clamp(0, calc((abs(${n}) - ${layer.t}) * ${layer.m}), ${layer.c})`;
      const color = `oklch(from ${tint} l c h / ${alpha})`;
      return form === "drop"
        ? `drop-shadow(${color} ${x} ${y} ${blur})`
        : `${x} ${y} ${blur} 0 ${color}`;
    })
    .join(form === "drop" ? " " : ", ");
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const tbody = $("params").querySelector("tbody")!;
const fields = ["t", "m", "c", "r"] as const;

LAYERS.forEach((layer, i) => {
  const row = tbody.insertRow();
  row.insertCell().textContent = String(i + 1);
  for (const field of fields) {
    const input = document.createElement("input");
    Object.assign(input, {
      type: "number",
      step: "any",
      name: `${field}${i}`,
      value: layer[field],
    });
    input.style.cssText = "--w: 20";
    input.addEventListener("input", () => {
      layer[field] = Number(input.value);
      render();
    });
    row.insertCell().append(input);
  }
});

/** Today's token heights to compare against, and the elevation each is drawn at. */
const LADDER: [string, number][] = [
  ["xs", 0.5],
  ["sm", 1.5],
  ["md", 4],
  ["lg", 8],
  ["xl", 12],
  ["2xl", 16],
];

const ladder = $("ladder");
ladder.style.cssText += `; grid-template-columns: repeat(${LADDER.length}, 1fr)`;
for (const [size, n] of LADDER) {
  for (const kind of ["drop", "box", "token"]) {
    const cell = document.createElement("div");
    cell.className = `sample ${kind === "token" ? "" : kind}`;
    cell.style.cssText = `--bg: var(--color-background); --n: ${n}; block-size: 6rem;`;
    if (kind === "token") cell.style.boxShadow = `var(--shadow-${size})`;
    cell.textContent = kind === "token" ? `--shadow-${size}` : `${kind} ${n}`;
    cell.style.order = String(["drop", "box", "token"].indexOf(kind) * 10);
    ladder.append(cell);
  }
}

function render(): void {
  const count = Number($<HTMLSelectElement>("layers").value);
  // the first `count` rows, so the table's rows are the layers drawn
  const layers = LAYERS.slice(0, count);
  const css = `.drop { filter: ${elevationLayers("var(--n)", layers, "drop")}; }
.box { box-shadow: ${elevationLayers("var(--n)", layers, "box")}; }`;
  $("formula").textContent =
    `.sample { block-size: 10rem; border-radius: var(--radius-lg); display: grid; place-items: center; }
:root { --n: ${$<HTMLInputElement>("n").value}; --angle: ${$<HTMLInputElement>("angle").value}deg; ${
      $<HTMLInputElement>("tint-on").checked ? `--tint: ${$<HTMLInputElement>("tint").value};` : ""
    } }
${css}`;
  $("css").textContent = css;
  $("n-out").textContent = $<HTMLInputElement>("n").value;
  $("angle-out").textContent = `${$<HTMLInputElement>("angle").value}deg`;
}

for (const id of ["n", "angle", "tint", "tint-on", "layers"])
  $(id).addEventListener("input", render);
$("theme").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.ui?.includes("theme-dark");
  root.dataset.ui = dark ? "" : "theme-dark";
});
render();
