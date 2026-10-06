/**
 * Playground client: Monaco (on demand) over a textarea fallback, a sandboxed
 * iframe for the output, and the editor's code in the URL hash.
 */
import { findings, formatEdits } from "../lib/playground-format.ts";
import { decodeHash, encodeCode } from "../lib/playground-hash.ts";

interface Template {
  id: string;
  label: string;
  html: string;
}
interface Data {
  head: string;
  templates: Template[];
}

const root = document.querySelector<HTMLElement>("[data-playground]");
const dataNode = document.querySelector<HTMLScriptElement>("[data-playground-data]");
const output = root?.querySelector<HTMLIFrameElement>("[data-playground-output]");
const host = root?.querySelector<HTMLElement>("[data-playground-editor]");
const fallback = root?.querySelector<HTMLTextAreaElement>("[data-playground-fallback]");
const templateSelect = root?.querySelector<HTMLSelectElement>("[data-playground-template]");
const copyButton = root?.querySelector<HTMLButtonElement>("[data-playground-copy]");
const resetButton = root?.querySelector<HTMLButtonElement>("[data-playground-reset]");
const status = root?.querySelector<HTMLElement>("[data-playground-status]");

if (
  root &&
  dataNode &&
  output &&
  host &&
  fallback &&
  templateSelect &&
  copyButton &&
  resetButton &&
  status
) {
  const editorHost = host;
  const textarea = fallback;
  const data = JSON.parse(dataNode.textContent ?? "{}") as Data;
  const blank = data.templates[0]?.html ?? "";

  // --- the document the output renders -----------------------------------
  const theme = (): string | null => {
    const pinned = document.documentElement.getAttribute("data-ui-theme");
    if (pinned) return pinned;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const render = (code: string): void => {
    const scheme = theme();
    output.srcdoc = `<!doctype html>
<html lang="en"${scheme ? ` data-ui-theme="${scheme}"` : ""}>
<head>
${data.head}
<title>Playground output</title>
</head>
<body style="--p: 8;">
${code}
</body>
</html>`;
  };

  // --- editor: textarea until Monaco arrives --------------------------------
  let getCode = (): string => textarea.value;
  let setCode = (code: string): void => {
    textarea.value = code;
  };
  // "Formatting styles…" fades in while the formatter runs and out shortly after,
  // from any path: Cmd/Ctrl+S, Shift+Alt+F, or format on paste.
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  const announce = (): void => {
    status.style.setProperty("--opacity", "1");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => status.style.setProperty("--opacity", "0"), 900);
  };

  // Without Monaco, saving rewrites the textarea in place.
  let formatCode = (): void => {
    announce();
    const code = getCode();
    const edits = formatEdits(code);
    if (!edits.length) return;
    let out = code;
    for (const edit of [...edits].sort((a, b) => b.range[0] - a.range[0])) {
      out = out.slice(0, edit.range[0]) + edit.newText + out.slice(edit.range[1]);
    }
    setCode(out);
    changed();
  };
  const listeners = new Set<() => void>();
  const changed = (): void => {
    for (const fn of listeners) fn();
  };
  textarea.addEventListener("input", changed);

  const isDark = (): boolean => theme() === "dark";
  let monacoContainer: HTMLElement | undefined;

  async function mountMonaco(): Promise<void> {
    // monaco-editor's export map serves `monaco-editor/<path>` from `esm/vs/<path>.js`;
    // the ESM modules import their own CSS.
    const [monaco, , htmlLanguage] = await Promise.all([
      import("monaco-editor/editor/editor.api"),
      import("monaco-editor/basic-languages/monaco.contribution"),
      import("monaco-editor/language/html/monaco.contribution"),
    ]);
    const [{ default: EditorWorker }, { default: HtmlWorker }] = await Promise.all([
      import("monaco-editor/editor/editor.worker?worker"),
      import("monaco-editor/language/html/html.worker?worker"),
    ]);
    (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
      getWorker: (_: string, label: string) =>
        label === "html" ? new HtmlWorker() : new EditorWorker(),
    };
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;inset:0";
    monacoContainer = container;
    const editor = monaco.editor.create(container, {
      value: getCode(),
      language: "html",
      theme: isDark() ? "vs-dark" : "vs",
      automaticLayout: true,
      minimap: { enabled: false },
      wordWrap: "on",
      fontSize: 13,
      tabSize: 2,
      scrollBeyondLastLine: false,
      lineNumbersMinChars: 3,
      padding: { top: 12 },
      formatOnPaste: true,
    });
    editorHost.append(container);
    textarea.hidden = true;
    getCode = () => editor.getValue();
    setCode = (code) => editor.setValue(code);
    editor.onDidChangeModelContent(changed);
    const retheme = (): void => monaco.editor.setTheme(isDark() ? "vs-dark" : "vs");

    // --- Zazz tooling inside the editor: the style formatter and the audit ---
    const model = editor.getModel();
    if (model) {
      const toRange = (range: [number, number]) => {
        const start = model.getPositionAt(range[0]);
        const end = model.getPositionAt(range[1]);
        return new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
      };
      // The HTML worker's own formatter would compete for Shift+Alt+F; the Zazz one wins.
      const htmlDefaults = (
        htmlLanguage as {
          htmlDefaults: {
            modeConfiguration: Record<string, boolean>;
            setModeConfiguration(config: Record<string, boolean>): void;
          };
        }
      ).htmlDefaults;
      htmlDefaults.setModeConfiguration({
        ...htmlDefaults.modeConfiguration,
        documentFormattingEdits: false,
        documentRangeFormattingEdits: false,
      });
      const toMonacoEdits = (text: string) => {
        announce();
        return formatEdits(text).map((edit) => ({
          range: toRange(edit.range),
          text: edit.newText,
        }));
      };
      monaco.languages.registerDocumentFormattingEditProvider("html", {
        displayName: "Zazz style utilities",
        provideDocumentFormattingEdits: (target) => toMonacoEdits(target.getValue()),
      });
      // Format on paste asks for the pasted range only.
      monaco.languages.registerDocumentRangeFormattingEditProvider("html", {
        displayName: "Zazz style utilities",
        provideDocumentRangeFormattingEdits: (target, range) =>
          toMonacoEdits(target.getValue()).filter((edit) =>
            monaco.Range.areIntersectingOrTouching(edit.range, range),
          ),
      });
      // Cmd/Ctrl+S: there is no file, so "save" formats the styles and writes the share link.
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => save());
      // Saving applies the edits directly (as one undo step); Shift+Alt+F goes through the provider.
      formatCode = () => {
        announce();
        const edits = formatEdits(model.getValue());
        if (!edits.length) return;
        editor.pushUndoStop();
        editor.executeEdits(
          "zazz",
          edits.map((edit) => ({ range: toRange(edit.range), text: edit.newText })),
        );
        editor.pushUndoStop();
      };
      // The <ui-debug> audit as markers, on a short debounce.
      let auditTimer: ReturnType<typeof setTimeout> | undefined;
      const audit = (): void => {
        const found = findings(model.getValue());
        editorHost.dataset.markers = String(found.length); // readable by tests
        monaco.editor.setModelMarkers(
          model,
          "zazz",
          found.map((found) => {
            const range = toRange(found.range);
            return {
              startLineNumber: range.startLineNumber,
              startColumn: range.startColumn,
              endLineNumber: range.endLineNumber,
              endColumn: range.endColumn,
              message: found.message,
              code: `zazz/${found.rule}`,
              source: "zazz",
              severity:
                found.severity === "info"
                  ? monaco.MarkerSeverity.Info
                  : monaco.MarkerSeverity.Warning,
            };
          }),
        );
      };
      editor.onDidChangeModelContent(() => {
        clearTimeout(auditTimer);
        auditTimer = setTimeout(audit, 200);
      });
      audit();
    }
    new MutationObserver(retheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-ui-theme"],
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  }

  // --- wiring ----------------------------------------------------------------
  let renderTimer: ReturnType<typeof setTimeout> | undefined;
  let hashTimer: ReturnType<typeof setTimeout> | undefined;
  const writeHash = (): Promise<void> =>
    encodeCode(getCode()).then((hash) => history.replaceState(null, "", `#${hash}`));
  /** Cmd/Ctrl+S: format the styles, render, and write the link, with no debounce. */
  const save = (): void => {
    formatCode();
    clearTimeout(renderTimer);
    clearTimeout(hashTimer);
    render(getCode());
    void writeHash();
  };
  // The same shortcut over the textarea fallback (and anywhere else in the page): never the
  // browser's Save dialog. Inside Monaco its own keybinding runs `save`.
  root.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    if (monacoContainer?.contains(event.target as Node)) return;
    save();
  });
  listeners.add(() => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => render(getCode()), 250);
    if (applyingHash) return;
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => void writeHash(), 600);
  });

  // Theme changes re-render the output (the sandbox has no shared document to mirror into).
  new MutationObserver(() => render(getCode())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-ui-theme"],
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => render(getCode()));

  templateSelect.addEventListener("change", () => {
    const template = data.templates.find((t) => t.id === templateSelect.value);
    if (!template) return;
    setCode(template.html);
    changed();
  });

  resetButton.addEventListener("click", () => {
    templateSelect.value = "blank";
    setCode(blank);
    changed();
  });

  copyButton.addEventListener("click", async () => {
    const hash = await encodeCode(getCode());
    history.replaceState(null, "", `#${hash}`);
    const label = copyButton.querySelector("span");
    try {
      await navigator.clipboard.writeText(location.href);
      if (label) label.textContent = "Copied";
    } catch {
      if (label) label.textContent = "Copy failed";
    }
    setTimeout(() => {
      if (label) label.textContent = "Copy link";
    }, 1500);
  });

  // A link to a different snippet while the page is open (back/forward, a pasted hash).
  let applyingHash = false;
  window.addEventListener("hashchange", () => {
    void decodeHash(location.hash).then((code) => {
      if (code === null || code === getCode()) return;
      applyingHash = true; // the editor's change event must not rewrite the hash we are reading
      setCode(code);
      applyingHash = false;
      render(code);
    });
  });

  // --- boot --------------------------------------------------------------
  void (async () => {
    const shared = await decodeHash(location.hash);
    setCode(shared ?? blank);
    if (shared) templateSelect.value = "blank";
    render(getCode());
    try {
      await mountMonaco();
    } catch (error) {
      console.warn("[playground] Monaco failed to load; using the plain editor.", error);
    }
  })();
}
