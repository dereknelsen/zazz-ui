"use strict";

/**
 * @fileoverview `zazz-ui codemod` — rewrite a project's markup for a breaking
 * kit change.
 * @description Two codemods. `small-sizes`: the kit removed the small control
 * sizes (`data-button-size` and `data-toggle-size` lost `"sm"` and
 * `"icon-sm"`); it asks whether to remove them from the markup (the default)
 * or keep them by adding their rules back (`runSmallSizes` below).
 * `data-font`: typography roles left `data-ui`
 * for `data-font`, and `text-link` became the `link` identity. In a vendored
 * project it first moves the kit forward when the recorded version predates
 * the change (`update`, to latest or to an `@version` argument; that brings the
 * new `_variables.css` and `_typography.css`), vendors the primitives the
 * markup now needs (`add`: font, link, prose), then rewrites the source files.
 * A project that loads the kit from npm or a CDN gets the rewrite alone. It
 * never touches a vendored kit directory. The transform is
 * `codemods/data-font.ts`.
 */

import { existsSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { primitivesUsed, rewriteDataFont, type Review } from "../codemods/data-font.ts";
import {
  hasRestoredSmallSizes,
  removeSmallSizes,
  smallSizesCss,
  type SizedPrimitive,
} from "../codemods/small-sizes.ts";
import { CONFIG_NAME, loadConfig } from "../config.ts";
import { ZazzError } from "../errors.ts";
import { kitSpec, resolveKit } from "../kit.ts";
import { loadFetchOptions } from "../npmrc.ts";
import { createUi } from "../ui.ts";
import { runAdd } from "./add.ts";
import type { GlobalFlags } from "./init.ts";
import { runUpdate } from "./update.ts";

export interface CodemodFlags {
  keep?: boolean;
  theirs?: boolean;
  markers?: boolean;
  force?: boolean;
  dryRun?: boolean;
  /** small-sizes: keep the small sizes (add their rules back) instead of removing them. */
  restore?: boolean;
}

export const CODEMODS: Readonly<Record<string, string>> = {
  "data-font": 'data-ui="text-sm" → data-font="sm"; data-ui="text-link" → data-ui="link"',
  "small-sizes":
    'removes data-button-size / data-toggle-size "sm" ("icon-sm" → "icon"), or keeps them with --restore',
};

/** The stylesheet a project without zazz.json gets when it keeps the small sizes. */
export const SMALL_SIZES_FILE = "zazz-small-sizes.css";

/**
 * Markup, templates, scripts, and stylesheets: anywhere the attribute or its
 * selector is written. Plain Markdown is left out (a changelog that names the
 * old token is history, not markup); name a file to rewrite it anyway.
 */
const EXTENSIONS = new Set(
  (
    "html htm xhtml astro vue svelte marko webc jsx tsx js mjs cjs ts mts cts mdx json " +
    "css scss sass less styl pcss " +
    "erb haml slim php twig latte tpl njk jinja j2 liquid hbs handlebars mustache ejs pug " +
    "cshtml vbhtml razor aspx asp jsp heex eex leex ex exs templ rb py cs go"
  ).split(" "),
);
/** Dependencies and build output, at any depth; dot-directories are skipped too. */
const SKIPPED_DIRS = new Set([
  "node_modules",
  "bower_components",
  "dist",
  "build",
  "out",
  "coverage",
  "target",
  "bin",
  "obj",
  "deps",
  "_build",
  "_site",
  "storybook-static",
]);
/** Skipped only at the top of the scan: Composer's and Bundler's `vendor`, and `tmp`. Deeper ones are authored (`resources/views/vendor`). */
const SKIPPED_AT_ROOT = new Set(["vendor", "tmp"]);
/** Larger files are generated or bundled, not authored. */
const MAX_BYTES = 2_000_000;
const MINIFIED = /\.min\.[a-z]+$/i;

const within = (file: string, dir: string) => file === dir || file.startsWith(dir + path.sep);

/**
 * Every source file under `start` (a file or a directory). A directory holding
 * a `zazz.json` adds its kit directory to `kits`, which the caller filters out:
 * the kit's own stylesheets are `update`'s to change, never the codemod's.
 */
async function sourceFiles(start: string, kits: Set<string>): Promise<string[]> {
  const info = await stat(start).catch(() => null);
  if (!info) throw new ZazzError(`no such file or directory: ${start}`);
  if (info.isFile()) return [start];
  const found: string[] = [];
  const walk = async (dir: string, top: boolean): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === CONFIG_NAME)) {
      const nested = await loadConfig(dir).catch(() => null);
      if (nested) kits.add(path.resolve(nested.root, nested.config.dir));
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || SKIPPED_DIRS.has(entry.name)) continue;
        if (top && SKIPPED_AT_ROOT.has(entry.name)) continue;
        await walk(full, false);
      } else if (
        entry.isFile() &&
        EXTENSIONS.has(path.extname(entry.name).slice(1).toLowerCase()) &&
        !MINIFIED.test(entry.name)
      ) {
        found.push(full);
      }
    }
  };
  await walk(start, true);
  return found.sort();
}

export async function runCodemod(
  name: string,
  args: string[],
  flags: CodemodFlags,
  global: GlobalFlags,
): Promise<void> {
  if (!CODEMODS[name]) {
    throw new ZazzError(`unknown codemod "${name}"`, {
      hint: `available: ${Object.keys(CODEMODS).join(", ")}`,
    });
  }
  if (name === "small-sizes") return runSmallSizes(args, flags, global);
  const cwd = path.resolve(global.cwd);
  const ui = createUi({ silent: global.silent === true, yes: global.yes === true });
  const dryRun = flags.dryRun === true;
  // an @-prefixed argument is the kit version to update to, as in `update`, unless
  // it names something on disk (`@app/`); the rest are paths
  const isVersion = (arg: string) => arg.startsWith("@") && !existsSync(path.resolve(cwd, arg));
  const target = args.filter(isVersion);
  const paths = args.filter((arg) => !isVersion(arg));
  const loaded = await loadConfig(cwd);
  const root = loaded?.root ?? cwd;

  ui.intro(`zazz-ui codemod ${name}`);

  // The rewrite, in memory: nothing is written until the kit side has succeeded.
  const kits = new Set(loaded ? [path.resolve(root, loaded.config.dir)] : []);
  const starts = paths.length ? paths.map((given) => path.resolve(cwd, given)) : [root];
  const walked = (await Promise.all(starts.map((start) => sourceFiles(start, kits)))).flat();
  const files = [...new Set(walked)].filter((file) => ![...kits].some((kit) => within(file, kit)));
  const changed: { file: string; output: string; count: number }[] = [];
  const review: (Review & { file: string })[] = [];
  const unread: string[] = [];
  const used = new Set<string>();
  for (const file of files) {
    const bytes = await readFile(file);
    const source = bytes.toString("utf8");
    // too large to be authored, or not UTF-8: writing it back would damage it
    if (bytes.length > MAX_BYTES || !Buffer.from(source, "utf8").equals(bytes)) {
      if (/data-ui/.test(bytes.toString("latin1"))) unread.push(file);
      continue;
    }
    const result = rewriteDataFont(source);
    if (result.output !== source) changed.push({ file, ...result });
    for (const item of result.review) review.push({ file, ...item });
    for (const primitive of primitivesUsed(result.output)) used.add(primitive);
  }
  const total = changed.reduce((sum, { count }) => sum + count, 0);
  const relative = (file: string) => path.relative(root, file) || path.basename(file);

  if (loaded) {
    const fetch = await loadFetchOptions({
      cwd,
      registry: global.registry,
      offline: global.offline,
      preferOffline: global.preferOffline,
    });
    let { config } = loaded;
    let kit = await resolveKit(kitSpec(config.kit.version), fetch);
    if (!kit.manifest.primitives["font"]) {
      ui.step(
        `@zazz-ui/core@${kit.version} predates data-font: updating the kit first (base, _variables.css, _typography.css, and what you have vendored).`,
      );
      await runUpdate(target, flags, global);
      if (dryRun) {
        ui.step("After that update, the codemod vendors font (and link, prose where used).");
      } else {
        config = (await loadConfig(cwd))!.config;
        kit = await resolveKit(kitSpec(config.kit.version), fetch);
        if (!kit.manifest.primitives["font"]) {
          throw new ZazzError(`@zazz-ui/core@${kit.version} has no \`font\` primitive`, {
            hint: "that kit predates data-font; pass the version that has it (`zazz-ui codemod data-font @<version>`)",
          });
        }
      }
    }
    const missing = [...used].filter(
      (primitive) => kit.manifest.primitives[primitive] && !config.primitives[primitive],
    );
    if (missing.length) {
      try {
        await runAdd(missing, { force: flags.force, dryRun }, global);
      } catch (error) {
        ui.warn(
          `Vendoring ${missing.join(", ")} failed, so no markup was rewritten. Run the codemod again once that is fixed; it picks up where it stopped.`,
        );
        throw error;
      }
    }
  } else {
    ui.step(
      "No zazz.json here, so only the markup is rewritten. A page that loads the kit per primitive also needs font.css (and link.css) from a kit that has data-font.",
    );
  }

  if (changed.length) {
    ui.step(
      `${dryRun ? "Would rewrite" : "Rewriting"} ${total} place(s) in ${changed.length} file(s):\n${changed
        .map(({ file, count }) => `  ${relative(file)} (${count})`)
        .join("\n")}`,
    );
  }
  if (!dryRun) {
    await Promise.all(changed.map(({ file, output }) => writeFile(file, output)));
  }
  if (unread.length) {
    ui.warn(
      `Skipped ${unread.length} file(s) that mention data-ui but are not UTF-8 or are over 2 MB; check them by hand:\n${unread
        .map((file) => `  ${relative(file)}`)
        .join("\n")}`,
    );
    process.exitCode = 2;
  }
  if (review.length) {
    ui.warn(
      `${review.length} place(s) still set a text-* token through data-ui and need a hand (two roles on one element, a value with template syntax or built in script, an unquoted selector):\n${review
        .map(({ file, line, text }) => `  ${relative(file)}:${line}  ${text.slice(0, 100)}`)
        .join("\n")}`,
    );
    process.exitCode = 2;
  }
  ui.outro(
    dryRun
      ? "Dry run — nothing written."
      : changed.length
        ? `Rewrote ${total} place(s) in ${changed.length} file(s).`
        : "Nothing to rewrite.",
  );
}

/** Source files under the given paths (or the project root), outside any vendored kit. */
async function projectFiles(root: string, cwd: string, paths: string[], kits: Set<string>) {
  const starts = paths.length ? paths.map((given) => path.resolve(cwd, given)) : [root];
  const walked = (await Promise.all(starts.map((start) => sourceFiles(start, kits)))).flat();
  return [...new Set(walked)].filter((file) => ![...kits].some((kit) => within(file, kit)));
}

/**
 * `zazz-ui codemod small-sizes`. Remove (the default, and the answer under
 * `-y` or without a terminal): rewrite the markup, `"sm"` dropped and
 * `"icon-sm"` made `"icon"`. Keep (`--restore`, or picked at the prompt): add
 * the removed rules back and leave the markup alone. In a vendored project they
 * go at the end of the vendored button.css and toggle.css, where `update`
 * merges them like any local edit; without a zazz.json they go in a stylesheet
 * of the project's own (`zazz-small-sizes.css`), loaded after the kit's.
 * Fields never had a small size and are not touched.
 */
async function runSmallSizes(
  args: string[],
  flags: CodemodFlags,
  global: GlobalFlags,
): Promise<void> {
  const cwd = path.resolve(global.cwd);
  const ui = createUi({ silent: global.silent === true, yes: global.yes === true });
  const dryRun = flags.dryRun === true;
  const loaded = await loadConfig(cwd);
  const root = loaded?.root ?? cwd;
  const relative = (file: string) => path.relative(root, file) || path.basename(file);
  // this codemod never updates the kit, so an @version argument has nothing to do
  const isVersion = (arg: string) => arg.startsWith("@") && !existsSync(path.resolve(cwd, arg));
  const versions = args.filter(isVersion);
  const paths = args.filter((arg) => !isVersion(arg));

  ui.intro("zazz-ui codemod small-sizes");
  if (versions.length) {
    ui.warn(`small-sizes doesn't update the kit, so ${versions.join(", ")} is ignored.`);
  }
  const choice = flags.restore
    ? "keep"
    : await ui.select(
        'The kit no longer has data-button-size or data-toggle-size "sm" and "icon-sm". What should happen to them?',
        [
          {
            value: "remove",
            label: "Remove them from the markup",
            hint: '"sm" goes, "icon-sm" becomes "icon"',
          },
          {
            value: "keep",
            label: "Keep them",
            hint: loaded
              ? "add their rules back to the vendored button and toggle"
              : `write their rules to ${SMALL_SIZES_FILE}`,
          },
        ],
        "remove",
      );

  if (choice === "keep") {
    const writes: { file: string; content: string }[] = [];
    // primitives whose rules go in the project's own stylesheet: none is vendored
    const own: SizedPrimitive[] = [];
    for (const primitive of ["button", "toggle"] as SizedPrimitive[]) {
      const vendored = loaded?.config.primitives[primitive];
      const key = vendored
        ? Object.keys(vendored.files).find((file) => file.endsWith(`${primitive}/${primitive}.css`))
        : undefined;
      const file = loaded && key ? path.join(root, loaded.config.dir, key) : undefined;
      if (!file || !existsSync(file)) {
        own.push(primitive);
        continue;
      }
      const css = await readFile(file, "utf8");
      if (hasRestoredSmallSizes(css, primitive)) {
        ui.step(`${relative(file)} already has the small ${primitive} sizes.`);
        continue;
      }
      writes.push({ file, content: `${css.replace(/\n*$/, "\n")}\n${smallSizesCss(primitive)}` });
    }
    if (own.length) {
      const file = path.join(root, SMALL_SIZES_FILE);
      const existing = existsSync(file) ? await readFile(file, "utf8") : "";
      const missing = own.filter((primitive) => !hasRestoredSmallSizes(existing, primitive));
      if (missing.length) {
        const added = missing.map((primitive) => smallSizesCss(primitive)).join("\n");
        writes.push({
          file,
          content: existing ? `${existing.replace(/\n*$/, "\n")}\n${added}` : added,
        });
        ui.step(
          `Load ${SMALL_SIZES_FILE} after the kit's stylesheet; it adds the rules to the kit's ui.components layer.`,
        );
      } else {
        ui.step(`${relative(file)} already has the small sizes.`);
      }
    }
    if (writes.length) {
      ui.step(
        `${dryRun ? "Would add" : "Adding"} the small sizes to:\n${writes
          .map(({ file }) => `  ${relative(file)}`)
          .join("\n")}`,
      );
      ui.step(
        "Inside an input group or a password group, a small size wins over the size the group gives its buttons; drop it there to let the group size them.",
      );
    }
    if (!dryRun) await Promise.all(writes.map(({ file, content }) => writeFile(file, content)));
    ui.outro(
      dryRun
        ? "Dry run — nothing written."
        : writes.length
          ? "Kept the small sizes. The markup is unchanged."
          : "Nothing to add.",
    );
    return;
  }

  const kits = new Set(loaded ? [path.resolve(root, loaded.config.dir)] : []);
  const files = await projectFiles(root, cwd, paths, kits);
  const changed: { file: string; output: string; count: number }[] = [];
  const review: { file: string; line: number; text: string }[] = [];
  const unread: string[] = [];
  for (const file of files) {
    const bytes = await readFile(file);
    const source = bytes.toString("utf8");
    // too large to be authored, or not UTF-8: writing it back would damage it
    if (bytes.length > MAX_BYTES || !Buffer.from(source, "utf8").equals(bytes)) {
      if (/data-(?:button|toggle)-size/i.test(bytes.toString("latin1"))) unread.push(file);
      continue;
    }
    const result = removeSmallSizes(source);
    if (result.output !== source)
      changed.push({ file, output: result.output, count: result.count });
    for (const item of result.review) review.push({ file, ...item });
  }
  const total = changed.reduce((sum, { count }) => sum + count, 0);
  if (changed.length) {
    ui.step(
      `${dryRun ? "Would rewrite" : "Rewriting"} ${total} place(s) in ${changed.length} file(s):\n${changed
        .map(({ file, count }) => `  ${relative(file)} (${count})`)
        .join("\n")}`,
    );
  }
  if (!dryRun) await Promise.all(changed.map(({ file, output }) => writeFile(file, output)));
  if (unread.length) {
    ui.warn(
      `Skipped ${unread.length} file(s) that mention a size but are not UTF-8 or are over 2 MB; check them by hand:\n${unread
        .map((file) => `  ${relative(file)}`)
        .join("\n")}`,
    );
    process.exitCode = 2;
  }
  if (review.length) {
    ui.warn(
      `${review.length} place(s) still set a small size and need a hand (a selector, a value built in script or a template):\n${review
        .map(({ file, line, text }) => `  ${relative(file)}:${line}  ${text.slice(0, 100)}`)
        .join("\n")}`,
    );
    process.exitCode = 2;
  }
  ui.outro(
    dryRun
      ? "Dry run — nothing written."
      : changed.length
        ? `Rewrote ${total} place(s) in ${changed.length} file(s).`
        : "Nothing to rewrite.",
  );
}
