/**
 * @fileoverview Color swatches before `var(--color-*)` values in HTML `style`:
 * the token's light or dark literal (following the color theme), drawn as a
 * decoration. A decoration, not a DocumentColorProvider, so there is no color
 * picker that would replace the token with a literal.
 */

import { ColorThemeKind, Range, window, workspace, type Disposable, type TextEditor } from "vscode";
import type { LanguageClient } from "vscode-languageclient/node";

interface WireColor {
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  light: string;
  dark: string;
}

/**
 * @param client - The running language client (re-created when `zazz.languages` changes).
 * @param languages - The language ids the features run in.
 */
export function registerSwatches(
  client: () => LanguageClient | undefined,
  languages: () => string[],
): Disposable[] {
  const swatch = window.createTextEditorDecorationType({
    before: {
      contentText: " ",
      width: "0.75em",
      height: "0.75em",
      margin: "0 0.25em 0 0",
      border: "1px solid",
      borderColor: "rgba(127, 127, 127, 0.5)",
    },
  });
  const timers = new Map<TextEditor, ReturnType<typeof setTimeout>>();

  const enabled = () =>
    workspace.getConfiguration("zazz").get<boolean>("colorSwatches.enable", true);
  const dark = () =>
    [ColorThemeKind.Dark, ColorThemeKind.HighContrast].includes(window.activeColorTheme.kind);

  const paint = async (editor: TextEditor) => {
    if (!languages().includes(editor.document.languageId)) return;
    if (!enabled()) return editor.setDecorations(swatch, []);
    const running = client();
    if (!running) return;
    const colors = await running.sendRequest<WireColor[]>("zazz/colors", {
      uri: editor.document.uri.toString(),
    });
    editor.setDecorations(
      swatch,
      colors.map((color) => ({
        range: new Range(
          color.range.start.line,
          color.range.start.character,
          color.range.end.line,
          color.range.end.character,
        ),
        renderOptions: { before: { backgroundColor: dark() ? color.dark : color.light } },
      })),
    );
  };
  const schedule = (editor: TextEditor | undefined) => {
    if (!editor) return;
    clearTimeout(timers.get(editor));
    timers.set(
      editor,
      setTimeout(() => void paint(editor).catch(() => {}), 250),
    );
  };
  const all = () => window.visibleTextEditors.forEach(schedule);

  all();
  return [
    swatch,
    window.onDidChangeVisibleTextEditors(all),
    window.onDidChangeActiveColorTheme(all),
    workspace.onDidChangeTextDocument(({ document }) => {
      for (const editor of window.visibleTextEditors)
        if (editor.document === document) schedule(editor);
    }),
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("zazz.colorSwatches")) all();
    }),
  ];
}
