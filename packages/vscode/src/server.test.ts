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
