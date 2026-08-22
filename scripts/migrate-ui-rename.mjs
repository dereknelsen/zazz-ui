// @ts-nocheck -- Node-only migration codemod; deleted at the end of the migration.
/**
 * @fileoverview One-shot codemod for the ui- dual-form primitives migration
 * (docs/adr/0001, docs/adr/0002). Axis-by-axis, allowlist-driven, idempotent.
 *
 * Usage: node scripts/migrate-ui-rename.mjs --axis=slots|tags|classes|tokens [--dry-run]
 *
 * TS files are only touched by the `tags` and `tokens` axes; slot/class edits
 * in TS are hand-made (class strings there may be element-creation code, not
 * selectors, and the carousel root retarget is behavioral).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "node:fs";

const AXIS = (process.argv.find((a) => a.startsWith("--axis=")) || "").slice(7);
const DRY = process.argv.includes("--dry-run");
if (!["slots", "tags", "classes", "tokens"].includes(AXIS)) {
  console.error("--axis=slots|tags|classes|tokens required");
  process.exit(1);
}

const GLOBS = {
  css: ["packages/ui/src/**/*.css"],
  html: ["packages/ui/src/**/*.html", "packages/ui/examples/*.html"],
  ts: ["packages/ui/src/**/*.ts"],
  md: [
    "apps/docs/content/**/*.mdx",
    ".claude/skills/zazz/**/*.md",
    ".claude/skills/zazz-new-design-style/**/*.md",
    "packages/ui/CONVENTIONS.styles.md",
    "packages/ui/CONVENTIONS.scripts.md",
    "packages/ui/README.md",
  ],
};
const files = (kinds) =>
  kinds
    .flatMap((k) => GLOBS[k].flatMap((g) => globSync(g)))
    .filter((f) => !/node_modules|\/dist\/|\.js$|\.map$|\.d\.ts$/.test(f));

// ---------------------------------------------------------------- slot maps
// BEM modifier specials must run before their base part.
const BEM_SPECIALS = [
  ["password-group__icon--hide", "password-group-icon-hide"],
  ["password-group__icon--show", "password-group-icon-show"],
];
const BEM_PARTS = {
  dialog: ["content", "header", "footer", "close", "body"],
  dropdown: ["popover"],
  field: ["label", "hint", "error", "description"],
  "input-group": ["addon", "text"],
  lightbox: [
    "thumb-content",
    "thumbs-prev",
    "thumbs-next",
    "thumbs",
    "thumb",
    "slide",
    "content",
    "stage",
    "dialog",
    "gallery",
    "prev",
    "next",
    "close",
    "counter",
  ],
  "mobile-menu": ["viewport", "body", "header", "footer"],
  "navigation-menu": [
    "submenu-trigger",
    "submenu",
    "link",
    "popover",
    "viewport",
    "item",
    "trigger",
    "list",
  ],
  "password-group": ["addon", "toggle", "icon", "text"],
  tabs: ["label-text", "list", "panel", "label", "indicator"],
  toaster: ["toast", "list", "icon", "title", "description", "content", "close", "action"],
  tooltip: ["content", "arrow", "trigger"],
};
const BEM_PAIRS = [
  ...BEM_SPECIALS,
  ...Object.entries(BEM_PARTS).flatMap(([comp, parts]) =>
    parts.map((p) => [`${comp}__${p}`, `${comp}-${p}`]),
  ),
];
const CAROUSEL_ROLES = ["viewport", "container", "slide", "thumbs", "prev", "next", "dots", "dot"];

// ---------------------------------------------------------------- tag maps
const TAGS = [
  ["slide-carousel", "ui-carousel"],
  ["media-lightbox", "ui-lightbox"],
  ["input-password", "ui-password"],
  ["tab-group", "ui-tabs"],
  ["toast-region", "ui-toaster"],
];
const IDENTIFIERS = [
  ["SlideCarouselHostElement", "UiCarouselHostElement"],
  ["SlideCarouselElement", "UiCarouselElement"],
  ["ToastRegionElement", "UiToasterElement"],
  ["MediaLightbox", "UiLightbox"],
  ["InputPassword", "UiPassword"],
  ["TabGroup", "UiTabs"],
  ["ToastRegion", "UiToaster"],
];

// ------------------------------------------------------------- class maps
// Longest-first so boundary regexes never see a shorter prefix win.
const ROOT_CLASSES = [
  "navigation-menu",
  "password-group",
  "button-group",
  "toggle-group",
  "field-group",
  "input-group",
  "input-color",
  "input-file",
  "mobile-menu",
  "radio-group",
  "accordion",
  "breadcrumbs",
  "textarea",
  "dropdown",
  "lightbox",
  "toaster",
  "tooltip",
  "badge",
  "button",
  "dialog",
  "field",
  "input",
  "prose",
  "radio",
  "select",
  "table",
  "tabs",
  "toggle",
];
// note: "breadcrumbs" has no CSS class today — harmless if absent. "carousel" root
// class is introduced by hand in Phase C, not swept.

// ------------------------------------------------------------- token maps
const TOKEN_EXCLUDES = ["--input-foreground", "--popover-foreground"];
const TOKEN_STEMS = [
  ["--input-group-", "--ui-input-group-"],
  ["--field-group-", "--ui-field-group-"],
  ["--password-group-", "--ui-password-group-"],
  ["--mobile-menu-", "--ui-mobile-menu-"],
  ["--navigation-", "--ui-navigation-menu-"],
  ["--lightbox-", "--ui-lightbox-"],
  ["--carousel-", "--ui-carousel-"],
  ["--checkbox-", "--ui-checkbox-"],
  ["--accordion-", "--ui-accordion-"],
  ["--dropdown-", "--ui-dropdown-"],
  ["--textarea-", "--ui-textarea-"],
  ["--toaster-", "--ui-toaster-"],
  ["--tooltip-", "--ui-tooltip-"],
  ["--popover-", "--ui-popover-"],
  ["--option-", "--ui-option-"],
  ["--badge-", "--ui-badge-"],
  ["--button-", "--ui-button-"],
  ["--dialog-", "--ui-dialog-"],
  ["--input-", "--ui-input-"],
  ["--field-", "--ui-field-"],
  ["--kbd-", "--ui-kbd-"],
  ["--prose-", "--ui-prose-"],
  ["--radio-", "--ui-radio-"],
  ["--range-", "--ui-slider-"],
  ["--reveal-", "--ui-reveal-"],
  ["--select-", "--ui-select-"],
  ["--switch-", "--ui-switch-"],
  ["--table-", "--ui-table-"],
  ["--tabs-", "--ui-tabs-"],
  ["--toggle-", "--ui-toggle-"],
];

// --------------------------------------------------------------- engine
const counts = {};
const bump = (rule, n = 1) => (counts[rule] = (counts[rule] || 0) + n);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function replaceAll(text, regex, replacement, rule) {
  let n = 0;
  const out = text.replace(regex, (...args) => {
    n++;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  if (n) bump(rule, n);
  return out;
}

// Rewrite class="..." attributes: BEM tokens become data-slot; root tokens gain ui-.
function rewriteClassAttrs(text, mode) {
  return text.replace(/class=(["'])([^"']*)\1/g, (m, q, value) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    const slots = [];
    const kept = [];
    for (const t of tokens) {
      if (mode === "slots") {
        const pair = BEM_PAIRS.find(([from]) => from === t);
        if (pair) {
          slots.push(pair[1]);
          bump(`slot:${pair[0]}`);
          continue;
        }
        kept.push(t);
      } else if (mode === "classes") {
        if (t.startsWith("ui-")) {
          kept.push(t);
        } else if (ROOT_CLASSES.includes(t)) {
          kept.push(`ui-${t}`);
          bump(`class:${t}`);
        } else {
          kept.push(t);
        }
      }
    }
    if (mode === "slots" && slots.length) {
      const slotAttrs = slots.map((s) => `data-slot=${q}${s}${q}`).join(" ");
      return kept.length ? `class=${q}${kept.join(" ")}${q} ${slotAttrs}` : slotAttrs;
    }
    return `class=${q}${kept.join(" ")}${q}`;
  });
}

function applySlots(text, kind) {
  if (kind === "html" || kind === "md") text = rewriteClassAttrs(text, "slots");
  // .comp__part selector/prose mentions (css files, md prose, css-in-md)
  for (const [from, to] of BEM_PAIRS) {
    text = replaceAll(
      text,
      new RegExp(`\\.${esc(from)}(?![\\w-])`, "g"),
      `[data-slot="${to}"]`,
      `slot-sel:${from}`,
    );
  }
  // carousel role attributes (markup + [attr] selectors), both quote styles
  text = replaceAll(
    text,
    new RegExp(`data-carousel=(["'])(${CAROUSEL_ROLES.join("|")})\\1`, "g"),
    (m, q, role) => `data-slot=${q}carousel-${role}${q}`,
    "slot:carousel-role",
  );
  return text;
}

function applyTags(text) {
  for (const [from, to] of TAGS) {
    text = replaceAll(
      text,
      new RegExp(`(?<![\\w-])${esc(from)}(?![\\w-])`, "g"),
      to,
      `tag:${from}`,
    );
  }
  for (const [from, to] of IDENTIFIERS) {
    text = replaceAll(text, new RegExp(`(?<!\\w)${esc(from)}(?!\\w)`, "g"), to, `ident:${from}`);
  }
  return text;
}

function applyClasses(text, kind) {
  if (kind === "html" || kind === "md") text = rewriteClassAttrs(text, "classes");
  // .name selector/prose mentions
  for (const name of ROOT_CLASSES) {
    text = replaceAll(
      text,
      new RegExp(`\\.(?!ui-)${esc(name)}(?![\\w-])`, "g"),
      `.ui-${name}`,
      `class-sel:${name}`,
    );
  }
  return text;
}

function applyTokens(text) {
  // Protect exact semantic names that lexically sit inside renamed families.
  TOKEN_EXCLUDES.forEach((name, i) => {
    text = text.split(name + "").join(` X${i} `);
  });
  for (const [from, to] of TOKEN_STEMS) {
    text = replaceAll(text, new RegExp(`(?<!ui-)${esc(from)}`, "g"), to, `token:${from}`);
  }
  TOKEN_EXCLUDES.forEach((name, i) => {
    text = text.split(` X${i} `).join(name);
  });
  return text;
}

const kindsForAxis = {
  slots: ["css", "html", "md"], // ts by hand
  tags: ["css", "html", "ts", "md"],
  classes: ["css", "html", "md"], // ts by hand (Phase C behavioral edits)
  tokens: ["css", "html", "ts", "md"],
};

let changed = 0;
for (const kind of kindsForAxis[AXIS]) {
  for (const file of files([kind])) {
    const before = readFileSync(file, "utf8");
    let after = before;
    if (AXIS === "slots") after = applySlots(after, kind);
    if (AXIS === "tags") after = applyTags(after);
    if (AXIS === "classes") after = applyClasses(after, kind);
    if (AXIS === "tokens") after = applyTokens(after);
    if (after !== before) {
      changed++;
      if (!DRY) writeFileSync(file, after);
      else console.log(`would change: ${file}`);
    }
  }
}

console.log(`\n=== axis=${AXIS} ${DRY ? "(dry-run)" : ""} — ${changed} files changed ===`);
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
let total = 0;
for (const [rule, n] of sorted) {
  total += n;
  console.log(String(n).padStart(6), rule);
}
console.log(String(total).padStart(6), "TOTAL replacements");
