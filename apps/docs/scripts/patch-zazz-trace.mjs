/**
 * Adds @zazz-ui/core's files to the /zazz/[...path] route's output-file-trace.
 *
 * Turbopack builds (the Next 16 default) skip `collect-build-traces` — the step
 * that would apply `outputFileTracingIncludes` — so deployment bundlers that
 * honor .nft.json (Vercel, `output: "standalone"`) would omit the package and
 * every /zazz/* asset would 404 in production. This script is the ONE owner of
 * that trace list: it globs exactly the subtree the route serves — the kit's
 * `src/` tree, per `lib/zazz-package.ts` (SERVED_ROOT; this script can't import
 * TS, so keep the two in sync) — and merges it into the trace. Runs as part of
 * `pnpm build`, after `next build`. Delete it if a future Next release applies
 * outputFileTracingIncludes under Turbopack.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const appDir = process.cwd();
const require = createRequire(path.join(appDir, "package.json"));
const pkgRoot = path.dirname(require.resolve("@zazz-ui/core/package.json"));

const traceFile = path.join(appDir, ".next/server/app/zazz/[...path]/route.js.nft.json");
const traceDir = path.dirname(traceFile);

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) files.push(full);
  }
};
walk(path.join(pkgRoot, "src"));

// lib/zazz-package.ts locates the package with require.resolve at module
// scope, which walks node_modules — so the traced bundle also needs the
// package.json it resolves to AND the workspace symlink resolution walks
// through. Without these the route throws on import and every /zazz/*
// request 500s in deployment (the src files alone only fix the 404s).
files.push(path.join(pkgRoot, "package.json"));
files.push(path.join(appDir, "node_modules", "@zazz-ui", "core"));

const trace = JSON.parse(readFileSync(traceFile, "utf8"));
const merged = new Set(trace.files);
for (const file of files) {
  merged.add(path.relative(traceDir, file));
}
trace.files = [...merged].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
writeFileSync(traceFile, JSON.stringify(trace));

console.log(
  `patch-zazz-trace: added ${files.length} @zazz-ui/core files to ${path.relative(appDir, traceFile)}`,
);
