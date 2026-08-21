// Server-only by usage: imported solely by server components (`Preview`, the debug
// gallery), which render at build time. Do not import from a client component — it reads
// the filesystem.
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { WEB_COMPONENT_SCRIPT_FILES, type ExampleScript } from "@zazzdesign/ui/manifest";

// Anchor module resolution at the app directory rather than import.meta.url — the
// bundler rewrites import.meta.url in compiled server code, which breaks createRequire.
const require = createRequire(path.join(process.cwd(), "package.json"));
const PKG_ROOT = path.dirname(require.resolve("@zazzdesign/ui/package.json"));
const SRC_ROOT = path.join(PKG_ROOT, "src");
const COMPONENTS_ROOT = path.join(SRC_ROOT, "ui");

/**
 * Reads one vanilla-HTML example fragment from the centralized Zazz component
 * source. `src` is an id like `button/variants` → `src/ui/button/variants.html`
 * inside the installed `@zazzdesign/ui` package.
 *
 * This is the single read point for example markup. `<Preview>` renders both the live
 * iframe and the code block from this one string, so no second copy can drift. Runs only
 * on the server (the docs pages are statically generated, so this executes at build time).
 *
 * @returns the file contents, or `null` if the example does not exist.
 */
export function readExample(src: string): string | null {
  const id = src.replace(/\.html$/, "");
  const filePath = path.resolve(COMPONENTS_ROOT, `${id}.html`);

  // Keep reads inside the package's src/ui — `src` comes from MDX authors, not end
  // users, but a stray `../` should still never escape the source tree.
  if (!filePath.startsWith(COMPONENTS_ROOT + path.sep)) {
    return null;
  }

  try {
    return readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * Lists every example id (`"<component>/<example>"`) under the package's `src/ui`.
 * Used by the debug gallery to render every primitive at once.
 */
export function listExamples(): string[] {
  const ids: string[] = [];

  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const id = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), id);
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        ids.push(id.replace(/\.html$/, ""));
      }
    }
  };

  walk(COMPONENTS_ROOT, "");

  // Only the nested component examples (e.g. `button/variants`) — not the root demo pages.
  return ids.filter((id) => id.includes("/")).sort();
}

/**
 * Reads the component-specific CSS file for a given example id.
 * `src` is like `button/variants` → reads `src/ui/button/button.css`.
 *
 * The `utilities/*` namespace is intentionally skipped: a utility demo composes
 * atomic classes rather than redrawing one component, so its "source" is the
 * entire `_utilities.css` atomic layer (>100 KB). Dumping that into a CSS tab
 * would bury the example, so utility previews show Preview + HTML only.
 *
 * @returns the file contents, or `null` if no dedicated CSS file exists.
 */
export function readComponentCss(src: string): string | null {
  const component = src.split("/")[0];
  if (component === "utilities") return null;
  const filePath = path.resolve(COMPONENTS_ROOT, component, `${component}.css`);

  if (!filePath.startsWith(COMPONENTS_ROOT + path.sep)) return null;

  try {
    return readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * Reads the web-component scripts an example uses, based on its manifest metadata.
 * Paths come from the package's `WEB_COMPONENT_SCRIPT_FILES` map (relative to `src/`)
 * and point at the emitted `.js` — exactly what vanilla consumers load. Shared runtime
 * dependencies such as `base/utils.js`, `base/embla.js`, and CDN bundles are
 * implementation details of the preview iframe.
 */
export function readComponentJs(scripts?: readonly ExampleScript[]): string | null {
  if (!scripts?.length) return null;

  const files = Array.from(
    new Set(scripts.flatMap((script) => WEB_COMPONENT_SCRIPT_FILES[script] ?? [])),
  );

  if (files.length === 0) return null;

  const blocks = files.flatMap((file) => {
    const filePath = path.resolve(SRC_ROOT, file);
    if (!filePath.startsWith(SRC_ROOT + path.sep)) return [];

    try {
      return [`// ${file}\n${readFileSync(filePath, "utf8").trim()}`];
    } catch {
      return [];
    }
  });

  return blocks.length > 0 ? blocks.join("\n\n") : null;
}
