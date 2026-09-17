"use strict";

/**
 * @fileoverview E2e for `zazz-ui migrate` against the two-version fixture kit
 * (see fixture-kit.ts, `V2_MIGRATION`). A project vendored at v1 carries a
 * css, an html and a jsx source; the rules come from `migrations/<V2>.json`
 * inside the v2 tarball, resolved through the kit engine like `update` reads
 * CHANGELOG.md. Each test gets its own project because `--write` mutates
 * sources and stamps zazz.json.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { ZazzConfig } from "../src/config.ts";
import { runInit } from "../src/commands/init.ts";
import { type MigrateFlags, runMigrate } from "../src/commands/migrate.ts";
import { V1, V2, buildFixtureKits } from "./fixture-kit.ts";

const tmpDirs: string[] = [];
let previousKitEnv: string | undefined;

beforeAll(async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-migrate-kit-"));
  tmpDirs.push(scratch);
  previousKitEnv = process.env.ZAZZ_UI_KIT;
  process.env.ZAZZ_UI_KIT = await buildFixtureKits(scratch);
});

afterAll(async () => {
  if (previousKitEnv === undefined) delete process.env.ZAZZ_UI_KIT;
  else process.env.ZAZZ_UI_KIT = previousKitEnv;
  await Promise.all(tmpDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

afterEach(() => {
  vi.restoreAllMocks();
  // migrate signals unmappables via the exit code; don't leak it into other tests.
  process.exitCode = 0;
});

/** Tokens: a one-to-one rename plus two adjacent steps of the chain shift. */
const STYLES_CSS = `:root {
  --stack-gap: var(--gap-md);
  --narrow: var(--breakpoint-xs);
  --wide: var(--breakpoint-sm);
}

.\\@xs\\:grid {
  display: grid;
}

[data-container="xs"] {
  padding: 0;
}
`;

/** Two adjacent chain prefixes in one class list, plus a data-container. */
const PAGE_HTML = `<section data-container="xs">
  <div class="stack @xs:grid @sm:flex">hello</div>
</section>
`;

/** A className expression the rules cannot follow (reported, not rewritten). */
const APP_JSX = `export function App({ wide }) {
  return <div className={wide ? "@xs:grid" : "stack"}>hi</div>;
}
`;

const SOURCES: Readonly<Record<string, string>> = {
  "src/styles.css": STYLES_CSS,
  "src/page.html": PAGE_HTML,
  "src/App.jsx": APP_JSX,
};

/** A fresh project vendored at fixture v1 with the three sources above. */
async function project(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-migrate-"));
  tmpDirs.push(dir);
  await runInit(
    `@${V1}`,
    { dir: "zazz", fonts: true, themeScript: true },
    { cwd: dir, silent: true },
  );
  for (const [file, content] of Object.entries(SOURCES)) {
    const dest = path.join(dir, ...file.split("/"));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content);
  }
  return dir;
}

/** A CDN/npm-style project: the same three sources, no zazz.json. */
async function bareProject(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "zazz-e2e-migrate-bare-"));
  tmpDirs.push(dir);
  for (const [file, content] of Object.entries(SOURCES)) {
    const dest = path.join(dir, ...file.split("/"));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content);
  }
  return dir;
}

async function readConfig(root: string): Promise<ZazzConfig> {
  return JSON.parse(await readFile(path.join(root, "zazz.json"), "utf8")) as ZazzConfig;
}

const at = (root: string, file: string): string => path.join(root, ...file.split("/"));

async function readSources(root: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const file of Object.keys(SOURCES)) out[file] = await readFile(at(root, file), "utf8");
  return out;
}

/** Runs migrate with everything it prints (steps, diffs, warnings) captured. */
async function capturedMigrate(root: string, flags: MigrateFlags = {}): Promise<string> {
  const lines: string[] = [];
  const record = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  vi.spyOn(console, "log").mockImplementation(record);
  vi.spyOn(console, "warn").mockImplementation(record);
  await runMigrate([], { to: `@${V2}`, ...flags }, { cwd: root });
  return stripVTControlCharacters(lines.join("\n"));
}

describe("zazz-ui migrate (e2e, fixture kit)", () => {
  it("dry run prints the diff and the unmappable report, writes nothing, exits 2", async () => {
    const root = await project();
    const configBefore = await readFile(path.join(root, "zazz.json"), "utf8");

    const output = await capturedMigrate(root);

    expect(output).toContain(`Scanned 3 files (${V1} → ${V2})`);
    // Unified diffs per changed file, old and new lines side by side.
    expect(output).toContain("src/styles.css");
    expect(output).toContain("-  --stack-gap: var(--gap-md);");
    expect(output).toContain("+  --stack-gap: var(--space-md);");
    expect(output).toContain("src/page.html");
    expect(output).toContain('-  <div class="stack @xs:grid @sm:flex">hello</div>');
    expect(output).toContain('+  <div class="stack @sm:grid @md:flex">hello</div>');
    // Rule hit counts and the files-changed total.
    expect(output).toContain("Rules applied:");
    expect(output).toContain("--gap-md → --space-md");
    expect(output).toContain("className={ (by hand)");
    expect(output).toContain("2 of 3 files changed.");
    // The jsx expression is the one place the rules cannot follow.
    expect(output).toContain("Could not map 1 place — migrate these by hand:");
    expect(output).toMatch(/src\/App\.jsx:2: .*className=\{/);
    expect(output).toContain("Dry run — nothing written.");

    expect(await readSources(root)).toEqual(SOURCES);
    expect(await readFile(path.join(root, "zazz.json"), "utf8")).toBe(configBefore);
    expect(process.exitCode).toBe(2);
  });

  it("--write rewrites tokens, class prefixes and data-container, stamps zazz.json, exits 2", async () => {
    const root = await project();

    const output = await capturedMigrate(root, { write: true });

    const after = await readSources(root);
    // css: one-to-one rename, chain shifted one step (never two), escaped
    // selector and attribute selector included.
    expect(after["src/styles.css"]).toBe(`:root {
  --stack-gap: var(--space-md);
  --narrow: var(--breakpoint-sm);
  --wide: var(--breakpoint-md);
}

.\\@sm\\:grid {
  display: grid;
}

[data-container="sm"] {
  padding: 0;
}
`);
    expect(after["src/styles.css"]).not.toContain("--breakpoint-lg");
    // html: adjacent prefixes in one class list each move exactly one step.
    expect(after["src/page.html"]).toBe(`<section data-container="sm">
  <div class="stack @sm:grid @md:flex">hello</div>
</section>
`);
    expect(after["src/page.html"]).not.toContain("@lg:");
    // jsx: reported, left alone.
    expect(after["src/App.jsx"]).toBe(APP_JSX);
    expect(output).toContain("Could not map 1 place");
    expect(output).toMatch(/src\/App\.jsx:2: /);
    expect(process.exitCode).toBe(2);

    // Stamped; the kit itself has not moved yet, so update is the next step.
    const config = await readConfig(root);
    expect(config.migrated).toBe(V2);
    expect(config.kit.version).toBe(V1);
    expect(output).toContain(`Rewrote 2 files for ${V2}; zazz.json now records migrated ${V2}.`);
    expect(output).toContain(`Next: \`zazz-ui update @${V2}\`.`);
    // The vendored directory is not a migration target.
    expect(await readFile(at(root, "zazz/index.css"), "utf8")).not.toContain("@sm:");
  });

  it("without zazz.json, --write rewrites but warns that nothing records the migration", async () => {
    const root = await bareProject();

    const output = await capturedMigrate(root, { write: true, from: V1 });

    expect((await readSources(root))["src/page.html"]).toContain('class="stack @sm:grid @md:flex"');
    expect(output).toContain(`Rewrote 2 files for ${V2}.`);
    expect(output).toContain("no zazz.json — nothing records");
    expect(output).toContain("run --write once");
    // A dry run has nothing to record yet, so it stays quiet about the stamp.
    expect(await capturedMigrate(await bareProject(), { from: V1 })).not.toContain("no zazz.json");
  });

  it("refuses a second run as already migrated and leaves the sources alone", async () => {
    const root = await project();
    await capturedMigrate(root, { write: true });
    process.exitCode = 0;
    const migrated = await readSources(root);
    const configBefore = await readFile(path.join(root, "zazz.json"), "utf8");

    await expect(capturedMigrate(root, { write: true })).rejects.toThrow(
      `already migrated: this project is at ${V2}, the rules target ${V2}`,
    );

    // A second pass would have shifted the chain again (@sm: → @md:); it did not.
    expect(await readSources(root)).toEqual(migrated);
    expect(await readFile(path.join(root, "zazz.json"), "utf8")).toBe(configBefore);
    expect(process.exitCode ?? 0).toBe(0);
  });
});
