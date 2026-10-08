/**
 * @fileoverview Checks a packaged `.vsix` the way VS Code will load it: unpacks
 * it, confirms every relative `require()` in the shipped bundles points at a
 * file that was packaged (a shared chunk left out by `.vscodeignore` breaks
 * activation), then loads `dist/client.cjs` with `vscode` stubbed and expects
 * an `activate` export. Runs after `vsce package`; exits non-zero on failure.
 *
 * Usage: node scripts/check-vsix.ts dist/zazz.vsix
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const vsix = process.argv[2];
if (!vsix || !existsSync(vsix)) {
  console.error(`check-vsix: no .vsix at ${vsix ?? "(missing argument)"}`);
  process.exit(1);
}

/** Unzips with `unzip`, or `tar` where that is missing (Windows ships bsdtar). */
function unpack(file: string, into: string): void {
  try {
    execFileSync("unzip", ["-q", file, "-d", into], { stdio: "pipe" });
  } catch {
    execFileSync("tar", ["-xf", file, "-C", into], { stdio: "pipe" });
  }
}

const root = mkdtempSync(path.join(tmpdir(), "zazz-vsix-"));
const problems: string[] = [];
try {
  unpack(path.resolve(vsix), root);
  const extension = path.join(root, "extension");
  const dist = path.join(extension, "dist");

  for (const name of readdirSync(dist).filter((f) => f.endsWith(".cjs"))) {
    const source = readFileSync(path.join(dist, name), "utf8");
    for (const [, target] of source.matchAll(/require\(["'](\.{1,2}\/[^"']+)["']\)/g)) {
      if (!existsSync(path.resolve(dist, target!))) {
        problems.push(`dist/${name} requires ${target}, which is not in the package`);
      }
    }
  }

  if (!problems.length) {
    // The extension host provides `vscode`; anything else must come from the package.
    const stub: object = new Proxy(function () {}, { get: () => stub, apply: () => stub });
    const load = (Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown })
      ._load;
    (Module as unknown as { _load: typeof load })._load = function (request, ...rest) {
      return request === "vscode" ? stub : load.call(this, request, ...rest);
    };
    try {
      const client = createRequire(path.join(dist, "client.cjs"))("./client.cjs") as {
        activate?: unknown;
      };
      if (typeof client.activate !== "function") {
        problems.push("dist/client.cjs loads but exports no activate()");
      }
    } catch (error) {
      problems.push(`dist/client.cjs fails to load: ${(error as Error).message.split("\n")[0]}`);
    } finally {
      (Module as unknown as { _load: typeof load })._load = load;
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

if (problems.length) {
  console.error(`check-vsix: ${vsix} would not activate:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-vsix: ${vsix} loads (client.cjs activates, every chunk is packaged)`);
