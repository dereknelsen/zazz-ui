"use strict";

/**
 * @fileoverview Cross-document view transitions are opt-in: no kit stylesheet
 * declares `@view-transition`, so a page only animates navigations when its
 * own CSS enables them. The kit's `::view-transition-*` styling still applies
 * once it does, and to the same-document transitions of swap navigation.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const stylesheets = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter((file) =>
  file.endsWith(".css"),
);

describe("cross-document view transitions", () => {
  it("are never enabled by a kit stylesheet", () => {
    const enabling = stylesheets.filter((file) =>
      /@view-transition\b/.test(
        readFileSync(join(SRC, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
      ),
    );
    expect(enabling).toEqual([]);
  });
});
