"use strict";

/**
 * @fileoverview npm configuration → pacote options.
 * @description Loads the user's real npm config through `@npmcli/config`
 * (builtin → project → user → global → env, npm's own precedence) so
 * registries, scoped registries, proxies, and auth all behave exactly like
 * `npm install` would (ticket 02). The flattened config is spread into every
 * pacote call, then the CLI's own flags override. If the config machinery
 * can't load (an npm-internals layout change), the CLI degrades to registry
 * defaults rather than failing — a plain public-registry fetch needs nothing.
 */

import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Flattened options handed to every pacote call. */
export type FetchOptions = Record<string, unknown> & {
  cache: string;
  registry?: string;
  offline?: boolean;
  preferOffline?: boolean;
  preferOnline?: boolean;
};

/** Flag values that override the loaded npm config. */
export interface FetchFlags {
  cwd: string;
  registry?: string | undefined;
  offline?: boolean | undefined;
  preferOffline?: boolean | undefined;
}

/** The CLI's own cacache directory (never npm's). */
export function cacheDir(): string {
  const base = process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");
  return path.join(base, "zazz-ui");
}

async function loadNpmFlatConfig(cwd: string): Promise<Record<string, unknown>> {
  try {
    const [{ default: Config }, defs] = await Promise.all([
      import("@npmcli/config"),
      import("@npmcli/config/lib/definitions/index.js"),
    ]);
    const config = new Config({
      definitions: defs.definitions,
      shorthands: defs.shorthands,
      flatten: defs.flatten,
      // npmPath anchors the "builtin" npmrc lookup; the CLI has no builtin,
      // so its own directory is a harmless anchor.
      npmPath: path.dirname(fileURLToPath(import.meta.url)),
      argv: [],
      cwd,
    });
    await config.load();
    return config.flat;
  } catch {
    return {};
  }
}

/**
 * @description Builds the pacote option bag: the user's npm config flattened,
 * the zazz cache directory, then flag overrides on top.
 */
export async function loadFetchOptions(flags: FetchFlags): Promise<FetchOptions> {
  const flat = await loadNpmFlatConfig(flags.cwd);
  const options: FetchOptions = {
    ...flat,
    cache: cacheDir(),
  };
  if (flags.registry !== undefined) options.registry = flags.registry;
  if (flags.offline) options.offline = true;
  if (flags.preferOffline) options.preferOffline = true;
  return options;
}
