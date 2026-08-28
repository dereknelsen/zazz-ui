"use strict";

/**
 * @fileoverview Classification matrix for update's per-file dispositions,
 * plus the 3-way merge behaviors that matter: false-conflict exclusion,
 * CRLF tolerance, diff3-labeled markers, binary guard.
 */

import { describe, expect, it } from "vite-plus/test";
import { type ClassifyInput, classify, isBinary, merge3 } from "./merge.ts";
import { sha256 } from "./vendor.ts";

const labels = { ours: "yours", base: "0.1.0", theirs: "0.2.0" };

function input(overrides: Partial<ClassifyInput>): ClassifyInput {
  return { ours: null, base: null, theirs: null, recordedHash: null, labels, ...overrides };
}

const BASE = "/* header */\n.a {\n  color: red;\n}\n\n.b {\n  margin: 0;\n}\n";
const THEIRS_TOP = BASE.replace("/* header */", "/* header v2 */");
const OURS_BOTTOM = BASE.replace("margin: 0;", "margin: 4px;");

describe("classify", () => {
  it("unchanged: ours already equals theirs", () => {
    const result = classify(
      input({
        ours: Buffer.from(BASE),
        base: BASE,
        theirs: BASE,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("unchanged");
  });

  it("take-theirs: pristine here, changed upstream", () => {
    const result = classify(
      input({
        ours: Buffer.from(BASE),
        base: BASE,
        theirs: THEIRS_TOP,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("take-theirs");
  });

  it("keep-ours: edited here, unchanged upstream", () => {
    const result = classify(
      input({
        ours: Buffer.from(OURS_BOTTOM),
        base: BASE,
        theirs: BASE,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("keep-ours");
  });

  it("auto-merged: non-overlapping edits combine both sides", () => {
    const result = classify(
      input({
        ours: Buffer.from(OURS_BOTTOM),
        base: BASE,
        theirs: THEIRS_TOP,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("auto-merged");
    if (result.kind === "auto-merged") {
      expect(result.content).toContain("/* header v2 */");
      expect(result.content).toContain("margin: 4px;");
    }
  });

  it("conflict: overlapping edits produce diff3-labeled markers", () => {
    const ours = BASE.replace("color: red;", "color: blue;");
    const theirs = BASE.replace("color: red;", "color: green;");
    const result = classify(
      input({
        ours: Buffer.from(ours),
        base: BASE,
        theirs,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("conflict");
    if (result.kind === "conflict") {
      expect(result.markers).toContain("<<<<<<< yours");
      expect(result.markers).toContain("||||||| 0.1.0");
      expect(result.markers).toContain(">>>>>>> 0.2.0");
      expect(result.markers).toContain("color: blue;");
      expect(result.markers).toContain("color: green;");
    }
  });

  it("excludes false conflicts: identical both-sides edits merge cleanly", () => {
    const same = BASE.replace("color: red;", "color: blue;");
    const theirs = same.replace("/* header */", "/* header v2 */");
    const result = classify(
      input({
        ours: Buffer.from(same),
        base: BASE,
        theirs,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("auto-merged");
  });

  it("tolerates CRLF on our side; merged output is LF-normalized", () => {
    const oursCrlf = OURS_BOTTOM.replaceAll("\n", "\r\n");
    const result = classify(
      input({
        ours: Buffer.from(oursCrlf),
        base: BASE,
        theirs: THEIRS_TOP,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("auto-merged");
    if (result.kind === "auto-merged") {
      expect(result.content).not.toContain("\r");
      expect(result.content).toContain("margin: 4px;");
    }
  });

  it("binary content conflicts without markers", () => {
    const result = classify(
      input({
        ours: Buffer.from([0x89, 0x00, 0x02]),
        base: Buffer.from([0x89, 0x00, 0x01]),
        theirs: Buffer.from([0x89, 0x00, 0x03]),
        recordedHash: sha256(Buffer.from([0x89, 0x00, 0x01])),
      }),
    );
    expect(result).toEqual({ kind: "conflict", markers: null });
  });

  it("restore: locally deleted, still shipped upstream", () => {
    const result = classify(
      input({ ours: null, base: BASE, theirs: THEIRS_TOP, recordedHash: sha256(BASE) }),
    );
    expect(result.kind).toBe("restore");
  });

  it("delete-pristine: removed upstream, unedited here", () => {
    const result = classify(
      input({ ours: Buffer.from(BASE), base: BASE, theirs: null, recordedHash: sha256(BASE) }),
    );
    expect(result.kind).toBe("delete-pristine");
  });

  it("delete-pristine: removed upstream and already gone locally", () => {
    const result = classify(
      input({ ours: null, base: BASE, theirs: null, recordedHash: sha256(BASE) }),
    );
    expect(result.kind).toBe("delete-pristine");
  });

  it("removed-upstream-edited: removed upstream but edited here", () => {
    const result = classify(
      input({
        ours: Buffer.from(OURS_BOTTOM),
        base: BASE,
        theirs: null,
        recordedHash: sha256(BASE),
      }),
    );
    expect(result.kind).toBe("removed-upstream-edited");
  });

  it("create: a file with no provenance record", () => {
    const result = classify(input({ ours: null, base: null, theirs: BASE, recordedHash: null }));
    expect(result.kind).toBe("create");
  });
});

describe("merge3 / isBinary", () => {
  it("preserves the trailing newline through split/join", () => {
    const result = merge3(OURS_BOTTOM, BASE, THEIRS_TOP, labels);
    expect(result.kind).toBe("auto-merged");
    if (result.kind === "auto-merged") expect(result.content.endsWith("}\n")).toBe(true);
  });

  it("flags NUL bytes as binary in both buffers and strings", () => {
    expect(isBinary(Buffer.from("a\0b"))).toBe(true);
    expect(isBinary("a\0b")).toBe(true);
    expect(isBinary("plain text\n")).toBe(false);
  });
});
