// Server-only by usage: imported solely by server components (`Preview`), which render
// at build time. Do not import from a client component — it reads the filesystem.
import { readFileSync } from "node:fs";
import { WEB_COMPONENT_SCRIPT_FILES, type ExampleScript } from "@zazzdesign/ui/manifest";
import { componentCssFile, exampleFile, scriptFile } from "@/lib/zazz-package";

/**
 * Reads one vanilla-HTML example fragment from the centralized Zazz component
 * source. `src` is an id like `button/variants` → `src/ui/button/variants.html`
 * inside the installed `@zazzdesign/ui` package (resolved by `lib/zazz-package.ts`).
 *
 * This is the single read point for example markup. `<Preview>` renders both the live
 * iframe and the code block from this one string, so no second copy can drift. Runs only
 * on the server (the docs pages are statically generated, so this executes at build time).
 *
 * @returns the file contents, or `null` if the example does not exist.
 */
export function readExample(src: string): string | null {
  // `src` comes from MDX authors, not end users, but a stray `../` should still
  // never escape the source tree — exampleFile() guards traversal.
  const filePath = exampleFile(src);
  if (!filePath) return null;

  try {
    return readFileSync(filePath, "utf8").trim();
  } catch {
    return null;
  }
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

  const filePath = componentCssFile(component);
  if (!filePath) return null;

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
 * dependencies such as `base/utils.js` and `base/embla.js` are implementation
 * details of the preview iframe.
 */
export function readComponentJs(scripts?: readonly ExampleScript[]): string | null {
  if (!scripts?.length) return null;

  const files = Array.from(
    new Set(scripts.flatMap((script) => WEB_COMPONENT_SCRIPT_FILES[script] ?? [])),
  );

  const blocks = files.flatMap((file) => {
    const filePath = scriptFile(file);
    if (!filePath) return [];

    try {
      return [`// ${file}\n${readFileSync(filePath, "utf8").trim()}`];
    } catch {
      return [];
    }
  });

  return blocks.length > 0 ? blocks.join("\n\n") : null;
}
