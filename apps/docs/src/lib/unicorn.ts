/**
 * The home hero's Unicorn Studio files (scripts/hero-scene.ts): the SDK and the
 * scene exported from it, vendored in `src/assets/unicorn/`.
 *
 * Each is served at `/unicorn/<name>.<hash>.<ext>` (pages/unicorn/[file].ts),
 * the hash taken from its bytes, so hosting can cache them forever
 * (`vercel.json`) and a new export or SDK version is a new URL. They are
 * imported as text, not as modules or `?url` assets: Vite's dev server would
 * rewrite the SDK into a module, which the classic `<script>` that loads it
 * can't parse.
 */
import { createHash } from "node:crypto";
import scene from "../assets/unicorn/unicorn-hero-day-night.json?raw";
import sdk from "../assets/unicorn/unicornStudio.umd.js?raw";

export const UNICORN_URL_BASE = "/unicorn";

/** `name.ext` → `name.<first 8 hex of sha256>.ext`. */
export function hashedName(name: string, body: string): string {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 8);
  const dot = name.lastIndexOf(".");
  return `${name.slice(0, dot)}.${hash}${name.slice(dot)}`;
}

// The SDK's own name ends in `.umd.js`: the hash goes before the `.js`.
const SDK_FILE = hashedName("unicornStudio.umd.js", sdk);
const SCENE_FILE = hashedName("unicorn-hero-day-night.json", scene);

/** The SDK (v2.6.0), loaded as a classic script. */
export const SDK_URL = `${UNICORN_URL_BASE}/${SDK_FILE}`;
/** The hero scene, fetched by the SDK (`filePath`). */
export const SCENE_URL = `${UNICORN_URL_BASE}/${SCENE_FILE}`;

/** Every served file: its name under `/unicorn/` and its body. */
export function unicornFiles(): { file: string; body: string }[] {
  return [
    { file: SDK_FILE, body: sdk },
    { file: SCENE_FILE, body: scene },
  ];
}
