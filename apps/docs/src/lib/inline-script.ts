/**
 * Turns a self-contained TypeScript module into a classic inline script, for
 * the few jobs that must run during parse, before first paint, where a module
 * script (deferred until the document has parsed) would be too late. Runs at
 * build, in a page's frontmatter.
 *
 * The module may import nothing and exports top-level declarations only; the
 * script scopes them in an IIFE and runs `call`, which names them.
 */
import { minify, transformWithOxc } from "vite-plus";

export async function inlineScript(
  source: string,
  filename: string,
  call: string,
): Promise<string> {
  if (/^\s*import\b/m.test(source)) {
    throw new Error(`inlineScript: ${filename} imports; an inline script must be self-contained`);
  }
  const { code } = await transformWithOxc(source, filename, { lang: "ts" });
  const body = code.replace(/^export\s+(?=(?:async\s+)?function|const|let|class)/gm, "");
  if (/^export\b/m.test(body)) {
    throw new Error(`inlineScript: ${filename} has an export other than a declaration`);
  }
  const { code: min } = await minify(`${filename}.js`, `(() => {\n${body}\n${call}\n})();`, {
    compress: true,
    mangle: true,
  });
  return min.trim();
}
