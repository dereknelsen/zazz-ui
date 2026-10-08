import { describe, expect, it } from "vite-plus/test";
import { primitiveNames } from "./api/primitives.ts";
import { readExample } from "./kit.ts";
import { kitchenSink, primitiveLabel } from "./kitchen-sink.ts";

describe("primitiveLabel", () => {
  it("is the name in sentence case", () => {
    expect(primitiveLabel("button")).toBe("Button");
    expect(primitiveLabel("alert-dialog")).toBe("Alert dialog");
    expect(primitiveLabel("navigation-menu")).toBe("Navigation menu");
  });

  it("keeps acronyms upper case", () => {
    expect(primitiveLabel("otp")).toBe("OTP");
  });
});

describe("kitchenSink", () => {
  const html = kitchenSink();
  const sections = [...html.matchAll(/<section id="([a-z-]+)"/g)].map((m) => m[1]);

  it("has one section per primitive with an example, in alphabetical order", () => {
    const expected = primitiveNames()
      .filter((n) => readExample(`${n}/${n}`) !== null)
      .sort();
    expect(sections).toEqual(expected);
    expect(sections).toContain("accordion");
    expect(sections).toContain("tooltip");
  });

  it("leaves out the utility demos and primitives without an example", () => {
    expect(sections).not.toContain("utilities");
    expect(sections).not.toContain("debug");
  });

  it("titles each section and includes the primitive's main example", () => {
    expect(html).toContain(`<h2 data-ui="text-h6">Alert dialog</h2>`);
    const button = readExample("button/button")!.trim().split("\n")[0];
    expect(html).toContain(button);
  });

  it("is one layout page", () => {
    expect(html.startsWith(`<main data-ui="layout"`)).toBe(true);
    expect(html.trimEnd().endsWith("</main>")).toBe(true);
  });
});
