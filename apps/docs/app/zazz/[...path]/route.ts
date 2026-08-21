import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serves the raw Zazz framework assets (`src/**.css`, emitted `src/**.js`, `examples/*.html`)
 * of the installed `@zazzdesign/ui` package over HTTP at `/zazz/*`, straight from the
 * single source on disk — no copy into `public/`, no bundling. This is what the
 * documented "served directly at `/zazz/src/*.js`" contract (see the package's
 * `CONVENTIONS.scripts.md`) relies on, and what lets the component-preview iframes load
 * `index.css` — whose internal `@import "./…"` rules then resolve relative to
 * `/zazz/src/index.css`.
 */

export const runtime = "nodejs";

// Anchor module resolution at the app directory rather than import.meta.url — the
// bundler rewrites import.meta.url in compiled route code, which breaks createRequire.
const require = createRequire(path.join(process.cwd(), "package.json"));
const ZAZZ_ROOT = path.dirname(require.resolve("@zazzdesign/ui/package.json"));

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

  const filePath = path.resolve(ZAZZ_ROOT, relative);

  // Defend against path traversal: the resolved path must stay inside zazz/.
  if (filePath !== ZAZZ_ROOT && !filePath.startsWith(ZAZZ_ROOT + path.sep)) {
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
