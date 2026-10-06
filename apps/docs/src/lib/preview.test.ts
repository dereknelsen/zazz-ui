import { describe, expect, it } from "vite-plus/test";
import { readExample } from "./kit.ts";
import { PREVIEW_META_IDS, buildPreviewDocument, previewMeta, scriptsFor } from "./preview.ts";

describe("scriptsFor", () => {
  it("lists the primitive's scripts and its dependencies'", () => {
    expect(scriptsFor("tabs/tabs")).toContain("primitives/tabs/tabs.js");
    expect(scriptsFor("button/button")).toEqual([]);
    expect(scriptsFor("lightbox/lightbox")).toEqual(
      expect.arrayContaining([
        "primitives/lightbox/lightbox.js",
        "primitives/carousel/carousel.js",
      ]),
    );
  });

  it("returns nothing for the utilities demos", () => {
    expect(scriptsFor("utilities/gap")).toEqual([]);
  });
});

describe("previewMeta", () => {
  it("only lists examples that exist in the kit", () => {
    const stale = PREVIEW_META_IDS.filter((id) => readExample(id) === null);
    expect(stale).toEqual([]);
  });
});

describe("buildPreviewDocument", () => {
  it("places the demo per the meta", () => {
    const doc = buildPreviewDocument("", { block: "start", inline: "end" }, false);
    expect(doc).toContain("align-content: start");
    expect(doc).toContain("justify-items: end");
  });

  it("wraps the fragment in the kit head, scripts only when asked", () => {
    const doc = buildPreviewDocument("<b>x</b>", previewMeta("dialog/dialog"), false);
    expect(doc).toContain("<b>x</b>");
    expect(doc).toContain("/zazz/index.css");
    expect(doc).not.toContain("/zazz/index.js");
    expect(doc).toContain("min-block-size: 500px");
    expect(buildPreviewDocument("", {}, true)).toContain("/zazz/index.js");
  });
});
