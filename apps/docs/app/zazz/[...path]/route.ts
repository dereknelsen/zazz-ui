import { readFile } from "node:fs/promises";
import path from "node:path";
import { SERVED_ROOT, resolveWithin } from "@/lib/zazz-package";

/**
 * Serves the raw Zazz framework source (`src/**` of the installed
 * `@zazzdesign/ui` package — stylesheets, emitted `.js`, example fragments)
 * over HTTP at `/zazz/*`, straight from the single source on disk — no copy
 * into `public/`, no bundling. Serving `src/` as the root means the docs'
 * live URLs match what the prose teaches consumers: `/zazz/index.css` is the
 * kit stylesheet, and its internal `@import "./…"` rules resolve against
 * `/zazz/`. This is the "served directly at `/zazz/**`" contract the
 * package's `CONVENTIONS.scripts.md` documents. Path facts come from
 * `lib/zazz-package.ts` — the one adapter over the kit's layout.
 */

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const relative = segments.join("/");
  const ext = path.extname(relative).toLowerCase();
  const contentType = CONTENT_TYPES[ext];

  // Only known static asset types — never let this become an arbitrary file reader.
  if (!contentType) {
    return new Response("Unsupported asset type", { status: 415 });
  }

  // Defend against path traversal: the resolved path must stay inside src/.
  const filePath = resolveWithin(SERVED_ROOT, relative);
  if (!filePath) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const body = await readFile(filePath);
    const cacheControl =
      process.env.NODE_ENV === "production"
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "no-store";
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": contentType, "Cache-Control": cacheControl },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
