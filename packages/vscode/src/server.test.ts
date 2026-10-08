/**
 * @fileoverview The bundled server (`dist/server.cjs`, built by `vp pack`)
 * over stdio: diagnostics, hover, and the fix-all action an editor runs on save.
 */

import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { startSession, type Session } from "../test/lsp.ts";

const URI = "file:///page.html";
const PAGE = `<div style="--text: red; --display: flex; --foo: 1; --grid-cols: 1fr 1fr">x</div>`;

describe("bundled language server", () => {
  let session: Session;
  beforeAll(async () => {
    session = await startSession();
  });
  afterAll(() => session.close());

  it("publishes the audit as diagnostics", async () => {
    const published = session.diagnostics(URI);
    session.open(URI, PAGE);
    const diagnostics = await published;
    expect(diagnostics.map((d) => d.code).sort()).toEqual([
      "zazz/not-integer",
      "zazz/unknown-utility",
    ]);
  });

  it("masks template holes for a templating language", async () => {
    const uri = "file:///page.astro";
    const published = session.diagnostics(uri);
    session.open(
      uri,
      `---\nconst items = [{ label: "a" }];\n---\n<ul style="--gap: 2">{items.map((i) => <li style="--foo: 1">{i.label}</li>)}</ul>`,
      "astro",
    );
    const diagnostics = await published;
    // the real finding inside the expression's markup, nothing from the frontmatter or the code
    expect(diagnostics.map((d) => d.code)).toEqual(["zazz/unknown-utility"]);
    const inHole = await session.connection.sendRequest("textDocument/hover", {
      textDocument: { uri },
      position: { line: 1, character: 8 },
    });
    expect(inHole).toBeNull();
  });

  it("survives a Razor directive attribute and keeps answering", async () => {
    const uri = "file:///Counter.razor";
    const published = session.diagnostics(uri);
    session.open(
      uri,
      `<button data-ui="button" @onclick="Increment" style="--foo: 1">Count</button>`,
      "aspnetcorerazor",
    );
    expect((await published).map((d) => d.code)).toEqual(["zazz/unknown-utility"]);
    const hover = await session.connection.sendRequest("textDocument/hover", {
      textDocument: { uri: URI },
      position: { line: 0, character: 15 },
    });
    expect(hover).not.toBeNull();
  });

  it("answers hover on a utility", async () => {
    const result = await session.connection.sendRequest<{ contents: { value: string } }>(
      "textDocument/hover",
      { textDocument: { uri: URI }, position: { line: 0, character: 15 } },
    );
    expect(result.contents.value).toContain("`color`");
  });

  it("offers source.fixAll.zazz with the formatted style", async () => {
    const actions = await session.connection.sendRequest<
      { kind: string; edit: { changes: Record<string, { newText: string }[]> } }[]
    >("textDocument/codeAction", {
      textDocument: { uri: URI },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: { diagnostics: [], only: ["source.fixAll.zazz"] },
    });
    expect(actions.map((a) => a.kind)).toEqual(["source.fixAll.zazz"]);
    expect(actions[0]!.edit.changes[URI]![0]!.newText).toMatch(/^\n    --display: flex;\n/);
  });

  it("completes the tiers a utility takes", async () => {
    const uri = "file:///complete.html";
    const published = session.diagnostics(uri);
    session.open(uri, `<p style="--px--"></p>`);
    await published;
    const result = await session.connection.sendRequest<{ items: { label: string }[] }>(
      "textDocument/completion",
      { textDocument: { uri }, position: { line: 0, character: 16 } },
    );
    expect(result.items.map((item) => item.label)).toContain("--px--md");
  });
});
