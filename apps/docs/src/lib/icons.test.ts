import { expect, test } from "vite-plus/test";
import { icon, iconMask, parseIcon } from "./icons.ts";

const file =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 504 560"><!--! License --><path fill="currentColor" d="M0 0z"/></svg>';

test("parseIcon reads the viewBox and the shapes, without the license comment", () => {
  expect(parseIcon(file)).toEqual({
    viewBox: "0 0 504 560",
    body: '<path fill="currentColor" d="M0 0z"/>',
  });
});

test("parseIcon rejects a file that is not an svg", () => {
  expect(() => parseIcon("<p>nope</p>")).toThrow(/Not an icon/);
});

test("icon finds a file by name and fails on an unknown one", () => {
  expect(icon("check").body).toContain("<path");
  expect(() => icon("no-such-icon")).toThrow(/No icon named "no-such-icon"/);
});

test("iconMask is a data URI CSS can use as is", () => {
  expect(iconMask("check")).toMatch(/^url\("data:image\/svg\+xml,%3Csvg[^"]+"\)$/);
});
