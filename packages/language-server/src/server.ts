/**
 * @fileoverview The Zazz language server: LSP wiring over `src/service/`.
 * Every feature is a pure function of the parsed document and an offset; this
 * file converts offsets to positions, caches parses per document version, and
 * reads the `zazz.*` settings.
 */

import {
  CodeActionKind,
  CompletionItemKind,
  DiagnosticSeverity,
  FoldingRangeKind,
  InlayHintKind,
  InsertTextFormat,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
  type CodeAction,
  type CompletionItem,
  type Connection,
  type Diagnostic,
  type Range,
  type TextEdit,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { overlapsHole } from "./html/holes.ts";
import { parseHtml, type ParsedHtml } from "./html/parse.ts";
import { diagnose, type ZazzDiagnostic } from "./service/diagnostics.ts";
import { colorTokens } from "./service/colors.ts";
import { foldingRanges } from "./service/folding.ts";
import { styleEdit, styleEdits, type Edit } from "./service/format.ts";
import { sortImports } from "./service/imports.ts";
import { inlayHints } from "./service/inlay.ts";
import { openTagAt } from "./service/context.ts";
import { complete, type CompletionKind, type ZazzCompletion } from "./service/completion.ts";
import { hover } from "./service/hover.ts";

const COMPLETION_KINDS: Record<CompletionKind, CompletionItemKind> = {
  utility: CompletionItemKind.Property,
  tier: CompletionItemKind.EnumMember,
  prefix: CompletionItemKind.Keyword,
  hook: CompletionItemKind.Variable,
  value: CompletionItemKind.Value,
  token: CompletionItemKind.Constant,
  identity: CompletionItemKind.Class,
  attribute: CompletionItemKind.Field,
  tag: CompletionItemKind.Module,
};

/** Code action kinds the server offers; `source.fixAll.zazz` runs on save. */
export const KINDS = {
  fixAll: `${CodeActionKind.SourceFixAll}.zazz`,
  organizeImports: `${CodeActionKind.SourceOrganizeImports}.zazz`,
  sortStyles: `${CodeActionKind.Source}.sortStyles.zazz`,
  sortElementStyles: `${CodeActionKind.RefactorRewrite}.sortStyles.zazz`,
} as const;

/** `zazz/colors`: color tokens in a document, for the client's swatches. */
export const COLORS_REQUEST = "zazz/colors";

export interface Settings {
  diagnostics: { enable: boolean };
  inlayHints: { enable: boolean };
}

const DEFAULTS: Settings = { diagnostics: { enable: true }, inlayHints: { enable: true } };

export function startServer(connection: Connection = createConnection(ProposedFeatures.all)): void {
  const documents = new TextDocuments(TextDocument);
  const parses = new Map<string, { version: number; parsed: ParsedHtml }>();
  let settings = DEFAULTS;
  let pullConfiguration = false;

  const parsedOf = (doc: TextDocument): ParsedHtml => {
    const cached = parses.get(doc.uri);
    if (cached?.version === doc.version) return cached.parsed;
    const parsed = parseHtml(doc.getText(), doc.languageId);
    parses.set(doc.uri, { version: doc.version, parsed });
    return parsed;
  };
  /** Keeps the items whose range stays clear of the document's template holes. */
  const clearOfHoles = <T extends { range: [number, number] }>(parsed: ParsedHtml, items: T[]) =>
    parsed.holes.length ? items.filter((item) => !overlapsHole(parsed.holes, item.range)) : items;
  /** True when `offset` sits inside a template hole (no Zazz help there). */
  const inHole = (parsed: ParsedHtml, offset: number) =>
    overlapsHole(parsed.holes, [offset, offset + 1]) ||
    overlapsHole(parsed.holes, [offset - 1, offset]);
  const range = (doc: TextDocument, [start, end]: [number, number]): Range => ({
    start: doc.positionAt(start),
    end: doc.positionAt(end),
  });
  const textEdit = (doc: TextDocument, edit: Edit): TextEdit => ({
    range: range(doc, edit.range),
    newText: edit.newText,
  });

  // --- Diagnostics (pushed, debounced per document) ---

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const toDiagnostic = (doc: TextDocument, found: ZazzDiagnostic): Diagnostic => ({
    range: range(doc, found.range),
    message: found.message,
    severity:
      found.severity === "info" ? DiagnosticSeverity.Information : DiagnosticSeverity.Warning,
    source: "zazz",
    code: `zazz/${found.rule}`,
    ...(found.fix ? { data: found.fix } : {}),
  });
  /**
   * Publishes one document's audit. It runs from a timer and from the settings
   * load, outside any request, so a throw here would end the process; instead
   * the error is logged and the document gets no diagnostics until it changes.
   */
  const validate = (doc: TextDocument) => {
    let diagnostics: Diagnostic[] = [];
    try {
      const parsed = parsedOf(doc);
      if (settings.diagnostics.enable) {
        diagnostics = clearOfHoles(parsed, diagnose(parsed)).map((found) =>
          toDiagnostic(doc, found),
        );
      }
    } catch (error) {
      connection.console.error(
        `Zazz could not audit ${doc.uri}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      );
    }
    void connection.sendDiagnostics({ uri: doc.uri, version: doc.version, diagnostics });
  };
  const schedule = (doc: TextDocument) => {
    clearTimeout(timers.get(doc.uri));
    timers.set(
      doc.uri,
      setTimeout(() => {
        timers.delete(doc.uri);
        const current = documents.get(doc.uri);
        if (current) validate(current);
      }, 150),
    );
  };

  // --- Lifecycle and settings ---

  connection.onInitialize((params) => {
    pullConfiguration = !!params.capabilities.workspace?.configuration;
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        hoverProvider: true,
        completionProvider: { triggerCharacters: ["-", ":", " ", '"', "'", "<"] },
        codeActionProvider: {
          codeActionKinds: [CodeActionKind.QuickFix, ...Object.values(KINDS)],
        },
        inlayHintProvider: true,
        foldingRangeProvider: true,
      },
      serverInfo: { name: "zazz-language-server" },
    };
  });

  const loadSettings = async () => {
    if (!pullConfiguration) return;
    const zazz = (await connection.workspace.getConfiguration("zazz")) as Partial<Settings> | null;
    settings = {
      diagnostics: { ...DEFAULTS.diagnostics, ...zazz?.diagnostics },
      inlayHints: { ...DEFAULTS.inlayHints, ...zazz?.inlayHints },
    };
    connection.languages.inlayHint.refresh().catch(() => {});
    for (const doc of documents.all()) validate(doc);
  };
  connection.onInitialized(() => void loadSettings());
  connection.onDidChangeConfiguration(() => void loadSettings());

  documents.onDidChangeContent(({ document }) => schedule(document));
  documents.onDidClose(({ document }) => {
    parses.delete(document.uri);
    clearTimeout(timers.get(document.uri));
    void connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
  });

  // --- Hover ---

  connection.onHover(({ textDocument, position }) => {
    const doc = documents.get(textDocument.uri);
    if (!doc) return null;
    const parsed = parsedOf(doc);
    const offset = doc.offsetAt(position);
    if (inHole(parsed, offset)) return null;
    const result = hover(parsed, offset);
    return result
      ? { contents: { kind: "markdown", value: result.markdown }, range: range(doc, result.range) }
      : null;
  });

  // --- Completion ---

  const toCompletion = (doc: TextDocument, item: ZazzCompletion): CompletionItem => ({
    label: item.label,
    kind: COMPLETION_KINDS[item.kind],
    ...(item.detail ? { detail: item.detail } : {}),
    ...(item.documentation
      ? { documentation: { kind: "markdown" as const, value: item.documentation } }
      : {}),
    textEdit: { range: range(doc, item.range), newText: item.insertText },
    insertTextFormat: item.snippet ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
    ...(item.sortText ? { sortText: item.sortText } : {}),
    ...(item.retrigger
      ? { command: { title: "Suggest", command: "editor.action.triggerSuggest" } }
      : {}),
    ...(item.additionalEdits
      ? { additionalTextEdits: item.additionalEdits.map((edit) => textEdit(doc, edit)) }
      : {}),
  });

  connection.onCompletion(({ textDocument, position }) => {
    const doc = documents.get(textDocument.uri);
    if (!doc) return null;
    const parsed = parsedOf(doc);
    const offset = doc.offsetAt(position);
    if (inHole(parsed, offset)) return null;
    const items = complete(parsed, offset);
    return items.length
      ? { isIncomplete: false, items: items.map((item) => toCompletion(doc, item)) }
      : null;
  });

  // --- Code actions: quick fixes from the audit, fix-all and sort on demand ---

  // --- Inlay hints, folding, colors ---

  connection.languages.inlayHint.on(({ textDocument, range: visible }) => {
    const doc = documents.get(textDocument.uri);
    if (!doc || !settings.inlayHints.enable) return [];
    const parsed = parsedOf(doc);
    const hints = inlayHints(parsed, doc.offsetAt(visible.start), doc.offsetAt(visible.end));
    return hints
      .filter((hint) => !overlapsHole(parsed.holes, [hint.offset, hint.offset + 1]))
      .map((hint) => ({
        position: doc.positionAt(hint.offset),
        label: hint.label,
        kind: InlayHintKind.Type,
        ...(hint.tooltip ? { tooltip: hint.tooltip } : {}),
      }));
  });

  connection.onFoldingRanges(({ textDocument }) => {
    const doc = documents.get(textDocument.uri);
    if (!doc) return [];
    return foldingRanges(parsedOf(doc)).map(({ startLine, endLine, kind }) => ({
      startLine,
      endLine,
      ...(kind === "imports" ? { kind: FoldingRangeKind.Imports } : {}),
    }));
  });

  connection.onRequest(COLORS_REQUEST, ({ uri }: { uri: string }) => {
    const doc = documents.get(uri);
    if (!doc) return [];
    const parsed = parsedOf(doc);
    return clearOfHoles(parsed, colorTokens(parsed)).map((color) => ({
      ...color,
      range: range(doc, color.range),
    }));
  });

  connection.onCodeAction(({ textDocument, context, range: selection }) => {
    const doc = documents.get(textDocument.uri);
    if (!doc) return [];
    const wants = (kind: string) =>
      !context.only || context.only.some((only) => kind === only || kind.startsWith(`${only}.`));
    const actions: CodeAction[] = [];
    if (wants(CodeActionKind.QuickFix)) {
      for (const diagnostic of context.diagnostics) {
        const fix =
          diagnostic.source === "zazz" ? (diagnostic.data as ZazzDiagnostic["fix"]) : undefined;
        if (!fix) continue;
        actions.push({
          title: fix.title,
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          isPreferred: true,
          edit: { changes: { [doc.uri]: [textEdit(doc, fix)] } },
        });
      }
    }
    const parsed = parsedOf(doc);
    const offer = (kind: string, title: string, unfiltered: Edit[]) => {
      // never rewrite text that holds a template expression
      const edits = clearOfHoles(parsed, unfiltered);
      if (!edits.length) return;
      const changes = { [doc.uri]: edits.map((edit) => textEdit(doc, edit)) };
      actions.push({ title, kind, edit: { changes } });
    };
    // source actions only when asked for by kind (on save, or from the Source Action menu)
    if (context.only) {
      if (wants(KINDS.fixAll))
        offer(KINDS.fixAll, "Fix all Zazz style utilities", styleEdits(parsed));
      if (wants(KINDS.sortStyles))
        offer(KINDS.sortStyles, "Sort style utilities", styleEdits(parsed));
      if (wants(KINDS.organizeImports)) {
        offer(
          KINDS.organizeImports,
          "Sort Zazz stylesheets into cascade order",
          sortImports(parsed),
        );
      }
    }
    // the element under the cursor: sort its style (the lightbulb's refactor menu)
    if (wants(KINDS.sortElementStyles)) {
      const tag = openTagAt(parsed, doc.offsetAt(selection.start));
      const edit = tag && styleEdit(parsed.text, tag);
      if (edit) offer(KINDS.sortElementStyles, "Sort this element's style utilities", [edit]);
    }
    return actions;
  });

  documents.listen(connection);
  connection.listen();
}
