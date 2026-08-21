import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Trace from the monorepo root so the workspace-linked @zazzdesign/ui package is
  // inside the tracing boundary.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // The /zazz/[...path] route reads @zazzdesign/ui files from disk at runtime. Next's
  // file tracing can't infer those dynamic reads, so include the package explicitly or
  // the assets 404 in a production build. Both spellings on purpose: pnpm exposes the
  // package via a node_modules symlink, and glob expansion across that symlink is
  // unreliable — the workspace-real path is the belt-and-braces fallback.
  outputFileTracingIncludes: {
    "/zazz/[...path]": [
      "./node_modules/@zazzdesign/ui/src/**/*",
      "./node_modules/@zazzdesign/ui/examples/**/*",
      "../../packages/ui/src/**/*",
      "../../packages/ui/examples/**/*",
    ],
  },
};

export default withMDX(config);
