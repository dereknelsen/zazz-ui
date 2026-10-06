/**
 * Walks `dist/` and reports internal links (`href="/…"`) that no built page
 * answers. Files with an extension are assumed to be assets and skipped.
 * Exit code 1 when anything is broken, so it can gate a deploy.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === "index.html") pages.push(full);
  }
})(dist);

const routes = new Set(
  pages.map((p) => {
    const rel = path.relative(dist, path.dirname(p)).replace(/\\/g, "/");
    return rel ? `/${rel}/` : "/";
  }),
);

const broken = new Set();
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
    let href = match[1];
    if (/\.[a-z0-9]+$/i.test(href)) continue;
    if (!href.endsWith("/")) href += "/";
    if (!routes.has(href)) broken.add(`${path.relative(dist, page)} -> ${href}`);
  }
}

console.log(`${pages.length} pages, ${broken.size} broken link(s)`);
for (const line of [...broken].sort((a, b) => a.localeCompare(b))) console.log("  " + line);
process.exit(broken.size ? 1 : 0);
