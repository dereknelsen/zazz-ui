// Checks a clip on the BUILT release post, in Chromium, WebKit, and Firefox,
// light and dark. The harness page can't show what only the site does: Astro's
// scoped selectors (`[data-astro-cid-…]` on every compound, so `.a > *` outranks
// a later `.b`), the site's own fonts, and the post's prose styles on `code`/`b`.
//
// Run from the repo root after `vp run --no-cache docs#build`, with the post at
// `draft: false` (a draft is not built as a page):
//
//   vp node .claude/skills/zazz-release-clip/scripts/built.mjs \
//     --post zazz-0-15 --prefix fc-hs --out <scratchpad>/built \
//     --frames 10,45,59,70,92 \
//     --hits 10.5:.fc-hs-link,34:.fc-hs-tab-cdn,59:.fc-hs-back \
//     --apart ".fc-hs-labels|.fc-hs-caption,.fc-hs-tab-npm|.fc-hs-tab-cdn"
//
// --hits    pct:selector pairs; the pointer (`.<prefix>-cursor`) is measured at
//           its tip (top-left), or its center with --fingertip, against the
//           target's center. Fails over 2px.
// --apart   a|b selector pairs whose boxes must not overlap at any frame (for
//           grouped labels, list every label: a wide site font wraps them).
// Frames land in --out as <Clip>-<engine>-<theme>-<pct>.png for sheet.sh.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";

/** Each `--name value` as a string; a bare `--flag` is "true". @type {Record<string, string>} */
const args = {};
process.argv.slice(2).forEach((arg, i, all) => {
  const next = all[i + 1];
  if (arg.startsWith("--")) args[arg.slice(2)] = next && !next.startsWith("--") ? next : "true";
});
const { post, prefix, out } = args;
if (!post || !prefix || !out) throw new Error("--post, --prefix, and --out are required");
const frames = (args.frames ?? "10,50,90").split(",").map(Number);
const hits = args.hits
  ? args.hits.split(",").map((h) => [Number(h.split(":")[0]), h.slice(h.indexOf(":") + 1)])
  : [];
const apart = args.apart ? args.apart.split(",").map((p) => p.split("|")) : [];
const clip = args.clip ?? "Clip";

const dist = resolve("apps/docs/dist");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  let path = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path.endsWith("/")) path += "index.html";
  try {
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const url = `http://127.0.0.1:${server.address().port}/blog/${post}/`;

/** Gives the page `__fcSeek(pct)`, which pauses only this clip's animations at pct of the 10s loop. */
const installSeek = (page) =>
  page.evaluate((p) => {
    globalThis.__fcSeek = (pct) =>
      document
        .getAnimations()
        .filter((a) => a.animationName?.startsWith(p))
        .forEach((a) => {
          a.pause();
          a.currentTime = pct * 100;
        });
  }, prefix);
let failed = false;
const fail = (msg) => {
  failed = true;
  console.log("FAIL", msg);
};

for (const [name, engine] of Object.entries({ chromium, webkit, firefox })) {
  const browser = await engine.launch();
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 900 },
      colorScheme: scheme,
    });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await installSeek(page);
    const figure = page.locator(`.${prefix}`).first();
    if (!(await figure.count()))
      throw new Error(`no .${prefix} on ${url}: is the post built with draft: false?`);
    await figure.scrollIntoViewIfNeeded();

    const count = await page.evaluate(
      (p) => document.getAnimations().filter((a) => a.animationName?.startsWith(p)).length,
      prefix,
    );
    if (scheme === "light") console.log(name, "animations", count);

    for (const pct of frames) {
      const overlaps = await page.evaluate(
        ([pct, pairs]) => {
          globalThis.__fcSeek(pct);
          const box = (s) =>
            [...document.querySelectorAll(s)]
              .filter((el) => getComputedStyle(el).opacity !== "0")
              .map((el) => el.getBoundingClientRect());
          const hit = (a, b) =>
            a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          return pairs
            .filter(([a, b]) => box(a).some((ra) => box(b).some((rb) => hit(ra, rb))))
            .map((p) => p.join(" overlaps "));
        },
        [pct, apart],
      );
      overlaps.forEach((o) => fail(`${name} ${scheme} ${pct}%: ${o}`));
      await figure.screenshot({ path: join(out, `${clip}-${name}-${scheme}-${pct}.png`) });
    }

    if (scheme === "light") {
      for (const [pct, target] of hits) {
        const [dx, dy] = await page.evaluate(
          ([pct, cursor, target, center]) => {
            globalThis.__fcSeek(pct);
            const c = document.querySelector(cursor).getBoundingClientRect();
            const t = document.querySelector(target).getBoundingClientRect();
            const [x, y] = center ? [c.left + c.width / 2, c.top + c.height / 2] : [c.left, c.top];
            return [Math.round(x - (t.left + t.width / 2)), Math.round(y - (t.top + t.height / 2))];
          },
          [pct, `.${prefix}-cursor`, target, args.fingertip === "true"],
        );
        const ok = Math.abs(dx) <= 2 && Math.abs(dy) <= 2;
        (ok ? console.log : fail)(`${name} pointer ${pct}% on ${target}: ${dx},${dy}px`);
      }
    }
    await page.close();
  }

  // Phone width: no horizontal page scroll. Reduced motion: nothing runs, pointer hidden.
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await phone.goto(url);
  const { overflow, running, cursor } = await phone.evaluate(
    (p) => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      running: document
        .getAnimations()
        .filter((a) => a.animationName?.startsWith(p) && a.playState === "running").length,
      cursor: getComputedStyle(document.querySelector(`.${p}-cursor`) ?? document.body).display,
    }),
    prefix,
  );
  if (overflow) fail(`${name}: horizontal scroll at 390px`);
  if (running) fail(`${name}: ${running} animations run under reduced motion`);
  if (cursor !== "none") fail(`${name}: pointer visible under reduced motion`);
  await phone
    .locator(`.${prefix}`)
    .first()
    .screenshot({ path: join(out, `${clip}-${name}-reduced.png`) });
  await browser.close();
}

server.close();
console.log(failed ? "Some checks failed." : "All built-page checks passed.");
process.exitCode = failed ? 1 : 0;
