/**
 * @fileoverview End to end in a real VS Code (`vp run zazz-vscode#test:e2e`):
 * the extension activates on HTML, publishes the audit, answers hover, and
 * offers `source.fixAll.zazz`. Plain CommonJS: it runs inside the extension
 * host under Mocha.
 */

const assert = require("node:assert");
const path = require("node:path");
const vscode = require("vscode");

const FIXTURE = vscode.Uri.file(path.join(__dirname, "fixtures", "page.html"));

async function until(probe, timeout = 20000) {
  const end = Date.now() + timeout;
  for (;;) {
    const value = await probe();
    if (value) return value;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

suite("Zazz extension", () => {
  suiteSetup(async () => {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(FIXTURE));
  });

  test("publishes the audit as diagnostics", async () => {
    const diagnostics = await until(() => {
      const found = vscode.languages.getDiagnostics(FIXTURE).filter((d) => d.source === "zazz");
      return found.length ? found : undefined;
    });
    assert.deepStrictEqual(
      diagnostics.map((d) => (typeof d.code === "object" ? d.code.value : d.code)),
      ["zazz/unknown-utility"],
    );
  });

  test("answers hover on a utility", async () => {
    const hovers = await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      FIXTURE,
      new vscode.Position(0, 15),
    );
    const text = hovers.flatMap((h) => h.contents.map((c) => c.value ?? String(c))).join("\n");
    assert.match(text, /`color`/);
  });

  test("offers source.fixAll.zazz", async () => {
    const actions = await vscode.commands.executeCommand(
      "vscode.executeCodeActionProvider",
      FIXTURE,
      new vscode.Range(0, 0, 0, 0),
      "source.fixAll.zazz",
    );
    const fixAll = actions.find((a) => a.kind && a.kind.value === "source.fixAll.zazz");
    assert.ok(fixAll, "no source.fixAll.zazz action");
    const [[, edits]] = fixAll.edit.entries();
    assert.match(edits[0].newText, /--display: flex;\n\s+--text: red;/);
  });

  test("completes the tiers a utility takes", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "html",
      content: '<p style="--px--"></p>',
    });
    const list = await vscode.commands.executeCommand(
      "vscode.executeCompletionItemProvider",
      doc.uri,
      new vscode.Position(0, 16),
    );
    const labels = list.items.map((item) =>
      typeof item.label === "string" ? item.label : item.label.label,
    );
    assert.ok(labels.includes("--px--md"), `no --px--md in ${labels.slice(0, 20).join(", ")}`);
    assert.ok(!labels.includes("--px--hover"), "offered a state tier on a breakpoint utility");
  });

  test("shows inlay hints in style", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "html",
      content: '<p style="--p: 4; --px--md: 6"></p>',
    });
    const hints = await until(async () => {
      const found = await vscode.commands.executeCommand(
        "vscode.executeInlayHintProvider",
        doc.uri,
        new vscode.Range(0, 0, 1, 0),
      );
      return found && found.length ? found : undefined;
    });
    const labels = hints.map((hint) =>
      typeof hint.label === "string" ? hint.label : hint.label.map((p) => p.value).join(""),
    );
    assert.ok(labels.includes(" ≥ 65ch"), labels.join(" | "));
    assert.ok(
      labels.some((label) => /≈ .*rem/.test(label)),
      labels.join(" | "),
    );
  });

  test("folds a multi-line style", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "html",
      content: '<p\n  style="\n    --px: 4;\n    --py: 2;\n  "\n>a</p>',
    });
    const ranges = await until(async () => {
      const found = await vscode.commands.executeCommand(
        "vscode.executeFoldingRangeProvider",
        doc.uri,
      );
      return found && found.some((r) => r.start === 1) ? found : undefined;
    });
    assert.ok(ranges.some((r) => r.start === 1 && r.end === 3));
  });

  test("sorts Zazz stylesheets with organize imports", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "html",
      content:
        '<head>\n<link rel="stylesheet" href="zazz/base/_reset.css">\n<link rel="stylesheet" href="zazz/base/_layers.css">\n</head>',
    });
    const actions = await until(async () => {
      const found = await vscode.commands.executeCommand(
        "vscode.executeCodeActionProvider",
        doc.uri,
        new vscode.Range(0, 0, 0, 0),
        "source.organizeImports",
      );
      return found && found.length ? found : undefined;
    });
    const action = actions.find((a) => a.kind && a.kind.value === "source.organizeImports.zazz");
    assert.ok(action, actions.map((a) => a.kind && a.kind.value).join(", "));
  });

  const HEAD_PAGE = [
    "<html>",
    "<head>",
    '<!-- zazz:head {"base":"./zazz","primitives":["layout"],"fontDisplay":false,"theme":false} -->',
    '<link rel="stylesheet" href="./zazz/primitives/layout/layout.css">',
    "<!-- /zazz:head -->",
    "</head>",
    "<body>",
    "<ui-carousel></ui-carousel>",
    '<div data-ui="dia"></div>',
    "</body>",
    "</html>",
  ].join("\n");

  test("offers fragment snippets", async () => {
    const doc = await vscode.workspace.openTextDocument({ language: "html", content: "zazz-dia" });
    await vscode.window.showTextDocument(doc);
    const list = await vscode.commands.executeCommand(
      "vscode.executeCompletionItemProvider",
      doc.uri,
      new vscode.Position(0, 8),
    );
    const labels = list.items.map((item) =>
      typeof item.label === "string" ? item.label : item.label.label,
    );
    assert.ok(labels.includes("zazz-dialog"), labels.slice(0, 30).join(", "));
  });

  test("auto-imports a primitive into the page head on completion", async () => {
    const doc = await vscode.workspace.openTextDocument({ language: "html", content: HEAD_PAGE });
    const line = 8;
    const list = await vscode.commands.executeCommand(
      "vscode.executeCompletionItemProvider",
      doc.uri,
      new vscode.Position(line, '<div data-ui="dia'.length),
    );
    const dialog = list.items.find(
      (item) => (typeof item.label === "string" ? item.label : item.label.label) === "dialog",
    );
    assert.ok(dialog, "no dialog completion");
    assert.ok(dialog.additionalTextEdits && dialog.additionalTextEdits.length, "no head edit");
    assert.match(dialog.additionalTextEdits[0].newText, /primitives\/dialog\/dialog\.css/);
  });

  test("reports a primitive the head does not load, as information with a fix", async () => {
    const doc = await vscode.workspace.openTextDocument({ language: "html", content: HEAD_PAGE });
    const missing = await until(() => {
      const found = vscode.languages
        .getDiagnostics(doc.uri)
        .filter(
          (d) => (typeof d.code === "object" ? d.code.value : d.code) === "zazz/missing-import",
        );
      return found.length ? found : undefined;
    });
    assert.strictEqual(missing[0].severity, vscode.DiagnosticSeverity.Information);
    const actions = await vscode.commands.executeCommand(
      "vscode.executeCodeActionProvider",
      doc.uri,
      missing[0].range,
      "quickfix",
    );
    assert.ok(
      actions.some((a) => /Add carousel to the page head/.test(a.title)),
      actions.map((a) => a.title).join(", "),
    );
  });
});
