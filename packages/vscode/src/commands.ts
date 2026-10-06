/**
 * @fileoverview Commands: `zazz.newPage` (page templates and new primitive
 * fragments) and `zazz.formatStyles` (the fix-all action on demand).
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { PRIMITIVES } from "@zazz-ui/core/manifest.ts";
import {
  SnippetString,
  Uri,
  commands,
  window,
  workspace,
  type Disposable,
  type ExtensionContext,
} from "vscode";
import {
  TEMPLATES,
  fragmentSnippet,
  isPrimitiveName,
  pageSnippet,
  templatePrimitives,
} from "./templates.ts";

interface Snippet {
  prefix: string;
  body: string[];
  description: string;
}

/** Where new primitive fragments go in this repo. */
const PRIMITIVES_DIR = "packages/core/src/primitives";

/** The primitive whose manifest lists the example file `file` (`dialog.html` → `dialog`). */
function primitiveOfExample(file: string): string | undefined {
  return Object.entries(PRIMITIVES).find(([, entry]) =>
    entry.examples.some((example) => basename(example) === file),
  )?.[0];
}

async function insertInNewDocument(snippet: string): Promise<void> {
  const doc = await workspace.openTextDocument({ language: "html", content: "" });
  const editor = await window.showTextDocument(doc);
  await editor.insertSnippet(new SnippetString(snippet));
}

async function newFragment(): Promise<void> {
  const name = await window.showInputBox({
    title: "New primitive fragment",
    prompt: "Primitive name",
    placeHolder: "chip-group",
    validateInput: (value) =>
      isPrimitiveName(value) ? undefined : "Use kebab-case, like chip-group",
  });
  if (!name) return;
  const folder = workspace.workspaceFolders?.[0];
  let file = folder && Uri.joinPath(folder.uri, PRIMITIVES_DIR, name, `${name}.html`);
  const inRepo =
    folder &&
    (await workspace.fs.stat(Uri.joinPath(folder.uri, PRIMITIVES_DIR)).then(
      () => true,
      () => false,
    ));
  if (!inRepo) {
    file = await window.showSaveDialog({ title: "Save the fragment", filters: { HTML: ["html"] } });
    if (!file) return;
  }
  const exists = await workspace.fs.stat(file!).then(
    () => true,
    () => false,
  );
  if (exists) {
    void window.showErrorMessage(`${workspace.asRelativePath(file!)} already exists.`);
    return;
  }
  await workspace.fs.writeFile(file!, new Uint8Array());
  const editor = await window.showTextDocument(file!);
  await editor.insertSnippet(new SnippetString(fragmentSnippet(name)));
  if (inRepo) {
    void window.showInformationMessage(
      `Add "${name}" to PRIMITIVES in packages/core/src/manifest.ts (its test checks every primitive directory has an entry), then run vp run core#generate.`,
    );
  }
}

export function registerCommands(context: ExtensionContext): Disposable[] {
  const readSnippets = (): Record<string, Snippet> =>
    JSON.parse(readFileSync(context.asAbsolutePath("snippets/zazz.code-snippets"), "utf8"));

  const newPage = async () => {
    const template = await window.showQuickPick(
      TEMPLATES.map((t) => ({ label: t.label, detail: t.detail, template: t.kind })),
      { title: "New Zazz page", placeHolder: "Template" },
    );
    if (!template) return;
    if (template.template === "fragment") return newFragment();
    const base = workspace.getConfiguration("zazz").get<string>("templates.base", "./zazz");
    if (template.template !== "primitive") {
      return insertInNewDocument(
        pageSnippet({
          base,
          primitives: templatePrimitives(template.template),
          swap: template.template === "swap",
        }),
      );
    }
    const example = await window.showQuickPick(
      Object.values(readSnippets()).map((snippet) => ({
        label: snippet.prefix.replace(/^zazz-/, ""),
        detail: snippet.description,
        body: snippet.body.join("\n"),
      })),
      { title: "Page from a primitive", placeHolder: "Example", matchOnDetail: true },
    );
    if (!example) return;
    const primitive = primitiveOfExample(`${example.label}.html`);
    return insertInNewDocument(
      pageSnippet({
        base,
        primitives: templatePrimitives("primitive", primitive),
        body: example.body,
      }),
    );
  };

  return [
    commands.registerCommand("zazz.newPage", newPage),
    commands.registerCommand("zazz.formatStyles", () =>
      commands.executeCommand("editor.action.sourceAction", {
        kind: "source.fixAll.zazz",
        apply: "first",
      }),
    ),
  ];
}
