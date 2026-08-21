/**
 * Adds @zazzdesign/ui's files to the /zazz/[...path] route's output-file-trace.
 *
 * next.config.mjs declares these via `outputFileTracingIncludes`, but Turbopack
 * builds (the Next 16 default) skip `collect-build-traces` — the step that applies
 * that option — so deployment bundlers that honor .nft.json (Vercel, `output:
 * "standalone"`) would omit the package and every /zazz/* asset would 404 in
 * production. This script replicates what collect-build-traces would have done:
 * glob the package's src/ and examples/ trees and merge them into the trace.
 * Runs as part of `pnpm build`, after `next build`. Delete it if a future Next
 * release applies outputFileTracingIncludes under Turbopack.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const appDir = process.cwd();
const require = createRequire(path.join(appDir, "package.json"));
const pkgRoot = path.dirname(require.resolve("@zazzdesign/ui/package.json"));

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
walk(path.join(pkgRoot, "examples"));

const trace = JSON.parse(readFileSync(traceFile, "utf8"));
const merged = new Set(trace.files);
for (const file of files) {
  merged.add(path.relative(traceDir, file));
}
trace.files = [...merged].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
writeFileSync(traceFile, JSON.stringify(trace));

console.log(
  `patch-zazz-trace: added ${files.length} @zazzdesign/ui files to ${path.relative(appDir, traceFile)}`,
);
