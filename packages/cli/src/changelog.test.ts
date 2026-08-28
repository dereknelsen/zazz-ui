"use strict";

/**
 * @fileoverview Changelog slicing: version-range selection, scope filtering
 * against the vendored set, and the plain version comparator.
 */

import { describe, expect, it } from "vite-plus/test";
import { compareVersions, parseChangelog, sliceChangelog } from "./changelog.ts";

const CHANGELOG = `# Changelog

Intro prose that never appears in slices.

## 0.3.0 (2026-10-01)

### base

- New token scale. **BREAKING** — rename \`--old\` to \`--new\`.

### combobox

- Multi-select keyboard fixes.

### carousel

- New autoplay attribute.

## 0.2.0 (2026-09-01)

Interim release notes.

### button

- Hover state contrast.

## 0.1.0 (2026-08-28)

### base

- First release.
`;

describe("sliceChangelog", () => {
  it("selects versions in (from, to] only", () => {
    const slice = sliceChangelog(
      CHANGELOG,
      { from: "0.1.0", to: "0.3.0" },
      new Set(["button", "combobox"]),
    );
    expect(slice).toContain("## 0.3.0");
    expect(slice).toContain("## 0.2.0");
    expect(slice).not.toContain("## 0.1.0");
    expect(slice).not.toContain("Intro prose");
  });

  it("filters sections to base + vendored scopes", () => {
    const slice = sliceChangelog(CHANGELOG, { from: "0.1.0", to: "0.3.0" }, new Set(["button"]));
    expect(slice).toContain("### base");
    expect(slice).toContain("### button");
    expect(slice).not.toContain("combobox");
    expect(slice).not.toContain("carousel");
  });

  it("keeps breaking entries visible", () => {
    const slice = sliceChangelog(CHANGELOG, { from: "0.2.0", to: "0.3.0" }, new Set());
    expect(slice).toContain("**BREAKING**");
  });

  it("drops a version whose sections are all out of scope", () => {
    const onlyPrimitives = `## 0.2.0\n\n### carousel\n\n- Something.\n`;
    const slice = sliceChangelog(
      onlyPrimitives,
      { from: "0.1.0", to: "0.2.0" },
      new Set(["button"]),
    );
    expect(slice).toBeNull();
  });

  it("returns null when the range is empty or inverted", () => {
    expect(sliceChangelog(CHANGELOG, { from: "0.3.0", to: "0.3.0" }, new Set())).toBeNull();
    expect(sliceChangelog(CHANGELOG, { from: "0.3.0", to: "0.1.0" }, new Set())).toBeNull();
  });
});

describe("parseChangelog", () => {
  it("splits version blocks and their scoped sections", () => {
    const blocks = parseChangelog(CHANGELOG);
    expect(blocks.map((block) => block.version)).toEqual(["0.3.0", "0.2.0", "0.1.0"]);
    expect(blocks[0]?.sections.map((section) => section.scope)).toEqual([
      "base",
      "combobox",
      "carousel",
    ]);
    // Preamble between the version header and the first section stays put.
    expect(blocks[1]?.header.join("\n")).toContain("Interim release notes.");
  });
});

describe("compareVersions", () => {
  it("orders plain versions numerically per segment", () => {
    expect(compareVersions("0.2.0", "0.1.0")).toBeGreaterThan(0);
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "0.99.99")).toBeGreaterThan(0);
    expect(compareVersions("0.1.0", "0.1.0")).toBe(0);
  });

  it("ranks a prerelease below its release", () => {
    expect(compareVersions("0.2.0-beta.1", "0.2.0")).toBeLessThan(0);
    expect(compareVersions("0.2.0", "0.2.0-beta.1")).toBeGreaterThan(0);
  });
});
