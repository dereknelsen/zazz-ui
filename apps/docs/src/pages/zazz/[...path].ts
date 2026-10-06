/**
 * Serves the installed kit at `/zazz/*`: `src/` for the preview iframes
 * (`buildHead({ base: "/zazz" })` links `/zazz/index.css`, `/zazz/index.js`,
 * and the per-primitive files) and `dist/` for the site's own stylesheet and
 * script. Prerendered at build; read live in `astro dev`.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { readFileSync } from "node:fs";
import { contentType, servedFiles } from "../../lib/kit.ts";

export const getStaticPaths = (() =>
  servedFiles().map(({ path, file }) => ({
    params: { path },
    props: { file },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ file: string }> = ({ props }) => {
  return new Response(readFileSync(props.file), {
    // Static output keeps only the body; the host serves media types by
    // extension, and the playground's CORS needs live in the hosting config.
    headers: { "Content-Type": contentType(props.file) },
  });
};
