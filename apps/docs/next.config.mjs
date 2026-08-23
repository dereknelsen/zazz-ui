import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Trace from the monorepo root so the workspace-linked @zazz-ui/ui package is
  // inside the tracing boundary.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // The /zazz/[...path] route reads @zazz-ui/ui files from disk at runtime. Next's
  // tracing can't infer those dynamic reads — and Turbopack builds (the Next 16
  // default) skip `outputFileTracingIncludes` entirely — so the ONE owner of the
  // trace list is `scripts/patch-zazz-trace.mjs`, which runs after every build and
  // traces exactly the subtree the route serves (see `lib/zazz-package.ts`).
};

export default withMDX(config);
