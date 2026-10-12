/**
 * Playground client: Monaco (on demand) over a textarea fallback, a sandboxed
 * iframe for the output. A docs preview's "Open in playground" link carries
 * its example in the URL hash, read once at boot.
 */
import { findings, formatEdits } from "../lib/playground-format.ts";
import { decodeHash } from "../lib/playground-hash.ts";

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
const resetButton = root?.querySelector<HTMLButtonElement>("[data-playground-reset]");

if (root && dataNode && output && host && fallback && templateSelect && resetButton) {
  const editorHost = host;
  const textarea = fallback;
  const data = JSON.parse(dataNode.textContent ?? "{}") as Data;
  const initial = data.templates[0]?.html ?? "";
  const blank = data.templates.find((t) => t.id === "blank")?.html ?? initial;

  // --- the document the output renders -----------------------------------
  const theme = (): string | null => {
    const pinned = (document.documentElement.dataset.ui ?? "")
      .split(/\s+/)
      .find((t) => t === "theme-dark" || t === "theme-light");
    if (pinned) return pinned.slice("theme-".length);
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  // A render reloads the whole frame (every kit file, every image, a full style
  // pass), so an unchanged document is never written twice.
  let rendered = "";
  const render = (code: string): void => {
    const scheme = theme();
    const doc = `<!doctype html>
<html lang="en"${scheme ? ` data-ui="theme-${scheme}"` : ""}>
<head>
${data.head}
<title>Playground output</title>
</head>
<body>
${code}
</body>
</html>`;
    if (doc === rendered) return;
    rendered = doc;
    output.srcdoc = doc;
  };

  // --- editor: textarea until Monaco arrives --------------------------------
  let getCode = (): string => textarea.value;
  let setCode = (code: string): void => {
    textarea.value = code;
  };

  // Without Monaco, saving rewrites the textarea in place.
  let formatCode = (): void => {
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
    const [monaco, , htmlLanguage, { default: monacoCss }] = await Promise.all([
      import("monaco-editor/editor/editor.api"),
      import("monaco-editor/basic-languages/monaco.contribution"),
      import("monaco-editor/language/html/monaco.contribution"),
      // Not in the package exports map; the docs app depends on monaco-editor directly.
      import("../../node_modules/monaco-editor/min/vs/editor/editor.main.css?inline"),
    ]);
    const [{ default: EditorWorker }, { default: HtmlWorker }] = await Promise.all([
      import("monaco-editor/editor/editor.worker?worker"),
      import("monaco-editor/language/html/html.worker?worker"),
    ]);
    (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
      getWorker: (_: string, label: string) =>
        label === "html" ? new HtmlWorker() : new EditorWorker(),
    };
    // Monaco lives in a shadow root. Its few hundred inline-styled nodes would
    // otherwise be tested against every one of the page's `[style*=]` utility
    // selectors on each keystroke and scroll: about 30x the restyle cost,
    // shared with the preview frame's main thread in dev. Its stylesheet is
    // adopted into the root; the codicon @font-face it carries only works from
    // the document, where Monaco's own CSS imports already put it. Monaco puts
    // its theme rules in the root itself once the container is attached.
    const shell = document.createElement("div");
    shell.style.cssText = "position:absolute;inset:0";
    const shadow = shell.attachShadow({ mode: "open" });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(monacoCss);
    shadow.adoptedStyleSheets = [sheet];
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;inset:0";
    shadow.append(container);
    editorHost.append(shell);
    monacoContainer = shell;
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
      // Cmd/Ctrl+S: there is no file, so "save" formats the styles and re-renders.
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => save());
      // Saving applies the edits directly (as one undo step); Shift+Alt+F goes through the provider.
      formatCode = () => {
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
      attributeFilter: ["data-ui"],
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", retheme);
  }

  // --- wiring ----------------------------------------------------------------
  let renderTimer: ReturnType<typeof setTimeout> | undefined;
  /** Cmd/Ctrl+S: format the styles and render, with no debounce. */
  const save = (): void => {
    formatCode();
    clearTimeout(renderTimer);
    render(getCode());
  };
  // The same shortcut over the textarea fallback (and anywhere else in the page): never the
  // browser's Save dialog. Inside Monaco its own keybinding runs `save`.
  root.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    // Events from inside the shadow root arrive retargeted to its host.
    if (monacoContainer?.contains(event.target as Node)) return;
    save();
  });

  // --- layout: drag the divider (lg and up), collapse the code (below lg) ----
  const split = root.querySelector<HTMLElement>("[data-playground-split]");
  const resizer = root.querySelector<HTMLElement>("[data-playground-resizer]");
  if (split && resizer) {
    let percent = 50;
    let frame = 0;
    const setSplit = (next: number): void => {
      percent = Math.min(80, Math.max(20, Math.round(next)));
      resizer.setAttribute("aria-valuenow", String(percent));
      // One layout per frame, however fast the pointer moves.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        split.style.setProperty(
          "--template-cols--lg",
          `minmax(0, ${percent}fr) auto minmax(0, ${100 - percent}fr)`,
        ),
      );
    };
    resizer.style.touchAction = "none";
    resizer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      resizer.setPointerCapture(event.pointerId);
      // The frame would swallow the pointer while it crosses the preview.
      output.style.setProperty("--pointer-events", "none");
      const box = split.getBoundingClientRect();
      const drag = new AbortController();
      resizer.addEventListener(
        "pointermove",
        (move) => setSplit(((move.clientX - box.left) / box.width) * 100),
        { signal: drag.signal },
      );
      resizer.addEventListener(
        "lostpointercapture",
        () => {
          drag.abort();
          output.style.removeProperty("--pointer-events");
        },
        { signal: drag.signal },
      );
    });
    resizer.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 10 : 2;
      const next = { ArrowLeft: percent - step, ArrowRight: percent + step, Home: 20, End: 80 }[
        event.key
      ];
      if (next === undefined) return;
      event.preventDefault();
      setSplit(next);
    });
    resizer.addEventListener("dblclick", () => setSplit(50));
  }

  const toggle = root.querySelector<HTMLButtonElement>("[data-playground-toggle]");
  const toggleLabel = toggle?.querySelector<HTMLElement>("[data-playground-toggle-label]");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    if (toggleLabel) toggleLabel.textContent = open ? "Hide code" : "Show code";
    // Only the base value changes: the markup's --display--lg keeps the code visible at lg.
    editorHost.style.setProperty("--display", open ? "block" : "none");
  });
  listeners.add(() => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => render(getCode()), 250);
  });

  // Theme changes re-render the output (the sandbox has no shared document to mirror into).
  new MutationObserver(() => render(getCode())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-ui"],
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

  // --- boot --------------------------------------------------------------
  void (async () => {
    const shared = await decodeHash(location.hash);
    setCode(shared ?? initial);
    if (shared) templateSelect.value = "blank";
    render(getCode());
    try {
      await mountMonaco();
    } catch (error) {
      console.warn("[playground] Monaco failed to load; using the plain editor.", error);
    }
  })();
}
