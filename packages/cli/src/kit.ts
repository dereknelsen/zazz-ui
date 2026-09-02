"use strict";

/**
 * @fileoverview The kit engine: npm tarball → validated, importable kit.
 * @description Resolves a `@zazz-ui/core` spec through pacote (npm-identical
 * semver/dist-tag resolution, SSRI verification, offline-capable caching),
 * extracts the tarball into a version-keyed cache directory, then imports the
 * kit's own compiled `src/manifest.js` and `src/head.js` straight out of the
 * extract — the manifest in the tarball is the registry (ADR-0006), and the
 * kit's own `buildHead`/`resolveClosure` run rather than reimplementations.
 * `MANIFEST_VERSION` gates everything: a kit newer than this CLI understands
 * fails with "upgrade the CLI", never a parse error (ADR-0010).
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pacote from "pacote";
import { ZazzError, kitTooNew, offlineMiss } from "./errors.ts";
import type { FetchOptions } from "./npmrc.ts";

/** The one package the CLI vendors from (ADR-0005: no package split). */
export const KIT_PACKAGE = "@zazz-ui/core";

/** Inclusive range of kit manifest versions this CLI understands. */
const SUPPORTED_MANIFEST = { min: 1, max: 1 };

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** One primitive's distribution facts (mirror of the kit's `PrimitiveEntry`). */
export interface PrimitiveEntry {
  css: string[];
  js: string[];
  base: string[];
  primitives: string[];
  bare: string[];
  examples: string[];
}

/** The validated slice of the kit's manifest module the CLI consumes. */
export interface KitManifest {
  manifestVersion: number;
  primitives: Record<string, PrimitiveEntry>;
  cssCascadeOrder: string[];
  /** The kit's own closure resolver, imported — not reimplemented. */
  resolveClosure(names: string[]): string[];
  /** Base stylesheet inventory, when the kit exports one (post-v1). */
  baseCss?: string[];
  /** Core runtime scripts, when the kit exports them (post-v1). */
  coreRuntime?: string[];
}

/** A resolved, extracted, validated kit at one exact version. */
export interface ResolvedKit {
  version: string;
  /** SSRI of the tarball ("" for local file: specs without one). */
  integrity: string;
  /** Root of the extracted package (contains package.json, src/, dist/). */
  extractDir: string;
  manifest: KitManifest;
  /** The tarball's own head builder (`src/head.js` → `buildHead`). */
  buildHead(options: Record<string, unknown>): string;
  /** Pristine bytes of a `src/`-relative file (e.g. "base/utils.js"). */
  readFile(srcRelPath: string): Promise<Buffer>;
  has(srcRelPath: string): boolean;
}

/**
 * @description Turns a user-facing version argument into a full pacote spec.
 * The `ZAZZ_UI_KIT` environment variable overrides the whole spec (e2e tests
 * point it at a `file:…tgz`); otherwise `@zazz-ui/core@<version>`. An
 * override may contain `{version}`, substituted per request — the seam the
 * update/diff e2e uses to serve different fixture tarballs per version.
 */
export function kitSpec(version: string): string {
  const override = process.env.ZAZZ_UI_KIT;
  if (override !== undefined) return override.replaceAll("{version}", version);
  return `${KIT_PACKAGE}@${version}`;
}

function isFileSpec(spec: string): boolean {
  return spec.startsWith("file:") || spec.endsWith(".tgz") || spec.startsWith("/");
}

/**
 * @description Resolves a spec to an exact version, extracts the tarball
 * (cache-keyed by version for registry specs; fresh temp dir for file specs,
 * which can change between builds), and loads + validates the kit modules.
 *
 * @param spec - Anything pacote accepts: `@zazz-ui/core@0.3.0`, `…@latest`,
 * a range, or a `file:` tarball.
 * @param fetch - Flattened npm/pacote options from `loadFetchOptions`.
 */
export async function resolveKit(spec: string, fetch: FetchOptions): Promise<ResolvedKit> {
  const fileSpec = isFileSpec(spec);
  // Exact published versions are immutable — a stale cache entry is correct
  // by definition. Tags and ranges re-resolve against the registry.
  const exact = !fileSpec && EXACT_VERSION.test(spec.slice(KIT_PACKAGE.length + 1));
  const options = { ...fetch, preferOffline: exact || fetch.offline === true };

  let manifest: { version: string; dist?: { integrity?: string }; _integrity?: string };
  try {
    manifest = (await pacote.manifest(spec, options)) as typeof manifest;
  } catch (error) {
    if (fetch.offline || fetch.preferOffline) throw offlineMiss(spec);
    throw new ZazzError(`could not resolve ${spec}: ${(error as Error).message}`);
  }

  const version = manifest.version;
  const integrity = manifest.dist?.integrity ?? manifest._integrity ?? "";
  const extractDir = fileSpec
    ? await extractFresh(spec, options)
    : await extractCached(version, options);

  return loadKitFromDir(extractDir, { version, integrity });
}

/** Registry tarballs are immutable → extract once per version, reuse forever. */
async function extractCached(version: string, options: FetchOptions): Promise<string> {
  const dir = path.join(options.cache, "extract", KIT_PACKAGE, version);
  if (existsSync(path.join(dir, "package.json"))) return dir;

  // Extract into a sibling temp dir, then rename: a half-extracted tree never
  // gets the final name, and concurrent runs race harmlessly.
  await mkdir(path.dirname(dir), { recursive: true });
  const tmp = await mkdtemp(`${dir}.tmp-`);
  try {
    await pacote.extract(`${KIT_PACKAGE}@${version}`, tmp, options);
    await rename(tmp, dir);
  } catch (error) {
    await rm(tmp, { recursive: true, force: true });
    // Another process may have won the rename race; that extract is as good.
    if (existsSync(path.join(dir, "package.json"))) return dir;
    throw error;
  }
  return dir;
}

/** file: tarballs can change between builds → always extract fresh. */
async function extractFresh(spec: string, options: FetchOptions): Promise<string> {
  const base = path.join(options.cache, "extract", "local");
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(path.join(base, "kit-"));
  await pacote.extract(spec, dir, options);
  return dir;
}

/**
 * @description Imports and validates the kit modules from an extracted
 * package directory. Exported separately from `resolveKit` so the gating
 * logic is testable against plain fixture directories, no tarball involved.
 */
export async function loadKitFromDir(
  extractDir: string,
  meta: { version: string; integrity: string },
): Promise<ResolvedKit> {
  const srcDir = path.join(extractDir, "src");

  let manifestModule: Record<string, unknown>;
  let headModule: Record<string, unknown>;
  try {
    // The compiled kit modules are dependency-free ESM (manifest.js imports
    // nothing; head.js imports only ./manifest.js), so Node loads them
    // straight from the extract. pathToFileURL keeps Windows paths valid.
    manifestModule = (await import(pathToFileURL(path.join(srcDir, "manifest.js")).href)) as Record<
      string,
      unknown
    >;
    headModule = (await import(pathToFileURL(path.join(srcDir, "head.js")).href)) as Record<
      string,
      unknown
    >;
  } catch (error) {
    throw kitTooNew(meta.version, `its modules could not load: ${(error as Error).message}`);
  }

  const manifestVersion = manifestModule.MANIFEST_VERSION;
  if (typeof manifestVersion !== "number" || !Number.isInteger(manifestVersion)) {
    throw kitTooNew(meta.version, "it declares no manifest version");
  }
  if (manifestVersion < SUPPORTED_MANIFEST.min || manifestVersion > SUPPORTED_MANIFEST.max) {
    throw kitTooNew(
      meta.version,
      `manifest v${manifestVersion} > supported v${SUPPORTED_MANIFEST.max}`,
    );
  }

  const primitives = manifestModule.PRIMITIVES;
  const cascade = manifestModule.CSS_CASCADE_ORDER;
  const resolveClosure = manifestModule.resolveClosure;
  const buildHead = headModule.buildHead;
  if (
    typeof primitives !== "object" ||
    primitives === null ||
    !Array.isArray(cascade) ||
    typeof resolveClosure !== "function" ||
    typeof buildHead !== "function"
  ) {
    throw kitTooNew(meta.version, "its manifest shape is unrecognized");
  }

  // Kits newer than manifest v1 may export their base inventory; v1 kits
  // don't, and plan.ts falls back to the v1 list pinned to that version.
  const baseCss = manifestModule.BASE_CSS;
  const coreRuntime = manifestModule.CORE_RUNTIME;

  return {
    version: meta.version,
    integrity: meta.integrity,
    extractDir,
    manifest: {
      manifestVersion,
      primitives: primitives as Record<string, PrimitiveEntry>,
      cssCascadeOrder: cascade as string[],
      resolveClosure: resolveClosure as (names: string[]) => string[],
      ...(Array.isArray(baseCss) ? { baseCss: baseCss as string[] } : {}),
      ...(Array.isArray(coreRuntime) ? { coreRuntime: coreRuntime as string[] } : {}),
    },
    buildHead: buildHead as (options: Record<string, unknown>) => string,
    readFile: async (srcRelPath) => readFile(resolveWithin(srcDir, srcRelPath)),
    has: (srcRelPath) => existsSync(resolveWithin(srcDir, srcRelPath)),
  };
}

/** Path-traversal guard for manifest-supplied paths. */
function resolveWithin(root: string, relative: string): string {
  const resolved = path.resolve(root, relative);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new ZazzError(`kit manifest referenced a path outside the package: ${relative}`);
  }
  return resolved;
}
