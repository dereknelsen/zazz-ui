/**
 * Serves the hero's Unicorn Studio SDK and scene at content-hashed URLs
 * (lib/unicorn.ts), prerendered at build. The long cache header lives in the
 * hosting config (`vercel.json`). `astro dev` computes these paths once, at
 * start: after replacing a file, restart the dev server.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { contentType } from "../../lib/kit.ts";
import { unicornFiles } from "../../lib/unicorn.ts";

export const getStaticPaths = (() =>
  unicornFiles().map(({ file, body }) => ({
    params: { file },
    props: { file, body },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ file: string; body: string }> = ({ props }) =>
  new Response(props.body, { headers: { "Content-Type": contentType(props.file) } });
