/**
 * Playground client: CodeMirror (on demand) over a textarea fallback, a sandboxed
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

  // --- editor: textarea until CodeMirror arrives ----------------------------
  let getCode = (): string => textarea.value;
  let setCode = (code: string): void => {
    textarea.value = code;
  };

  // Without CodeMirror, saving rewrites the textarea in place.
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

  let editorShell: HTMLElement | undefined;

  async function mountEditor(): Promise<void> {
    const [
      { EditorState },
      {
        EditorView,
        keymap,
        lineNumbers,
        highlightActiveLine,
        highlightActiveLineGutter,
        drawSelection,
      },
      { defaultKeymap, history, historyKeymap, indentWithTab },
      { HighlightStyle, bracketMatching, indentOnInput, indentUnit, syntaxHighlighting },
      { html },
      { linter, lintGutter, lintKeymap },
      { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap },
      { highlightSelectionMatches, searchKeymap },
      { tags },
    ] = await Promise.all([
      import("@codemirror/state"),
      import("@codemirror/view"),
      import("@codemirror/commands"),
      import("@codemirror/language"),
      import("@codemirror/lang-html"),
      import("@codemirror/lint"),
      import("@codemirror/autocomplete"),
      import("@codemirror/search"),
      import("@lezer/highlight"),
    ]);

    // The editor lives in a shadow root. Its nodes would otherwise be tested
    // against every one of the page's `[style*=]` utility selectors on each
    // keystroke and scroll, and the kit's reset and typography would reach
    // them. CodeMirror mounts its own styles into the root it is given; the
    // site's custom properties inherit across the boundary, so the theme reads
    // them and follows the page's light/dark scheme with no code of its own.
    const shell = document.createElement("div");
    shell.style.cssText = "position:absolute;inset:0";
    const shadow = shell.attachShadow({ mode: "open" });
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;inset:0";
    shadow.append(container);

    const chrome = EditorView.theme({
      "&": {
        height: "100%",
        color: "var(--color-foreground)",
        backgroundColor: "var(--color-background)",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: "var(--font-family-mono)",
        fontSize: "13px",
        lineHeight: "1.6",
      },
      // iOS zooms the page into any focused editable text smaller than 16px.
      "@media (pointer: coarse)": { ".cm-scroller": { fontSize: "16px" } },
      ".cm-content": { padding: "12px 0", caretColor: "var(--color-foreground)" },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-foreground)" },
      ".cm-gutters": {
        color: "var(--color-muted-foreground)",
        backgroundColor: "var(--color-background)",
        borderRight: "1px solid var(--color-border)",
      },
      ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--color-muted)" },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
        { backgroundColor: "color-mix(in oklch, var(--color-ring) 25%, transparent)" },
      ".cm-tooltip": {
        color: "var(--color-foreground)",
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
      },
    });
    // Fixed hues rather than the brand scales, which vary per site; each pair
    // flips with the page's color-scheme.
    const syntax = HighlightStyle.define([
      { tag: [tags.tagName, tags.angleBracket], color: "light-dark(#116329, #7ee787)" },
      { tag: tags.attributeName, color: "light-dark(#0550ae, #79c0ff)" },
      { tag: [tags.attributeValue, tags.string], color: "light-dark(#0a3069, #a5d6ff)" },
      { tag: tags.comment, color: "light-dark(#6e7781, #8b949e)", fontStyle: "italic" },
      { tag: [tags.keyword, tags.propertyName], color: "light-dark(#cf222e, #ff7b72)" },
      { tag: [tags.number, tags.atom, tags.bool], color: "light-dark(#953800, #ffa657)" },
      { tag: tags.invalid, color: "light-dark(#82071e, #ffa198)" },
    ]);

    const toChanges = (edits: ReturnType<typeof formatEdits>) =>
      edits.map((edit) => ({ from: edit.range[0], to: edit.range[1], insert: edit.newText }));

    // Pasted markup is formatted in the same transaction, so one undo removes both.
    const formatOnPaste = EditorState.transactionFilter.of((tr) => {
      if (!tr.docChanged || !tr.isUserEvent("input.paste")) return tr;
      const pasted: [number, number][] = [];
      tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => pasted.push([fromB, toB]));
      const edits = formatEdits(tr.newDoc.toString()).filter((edit) =>
        pasted.some(([from, to]) => edit.range[0] <= to && edit.range[1] >= from),
      );
      return edits.length ? [tr, { changes: toChanges(edits), sequential: true }] : tr;
    });

    // The <ui-debug> audit as diagnostics; the linter debounces it.
    const audit = linter(
      (view) => {
        const found = findings(view.state.doc.toString());
        editorHost.dataset.markers = String(found.length); // readable by tests
        return found.map((finding) => ({
          from: finding.range[0],
          to: finding.range[1],
          message: finding.message,
          severity: finding.severity,
          source: `zazz/${finding.rule}`,
        }));
      },
      { delay: 200 },
    );

    const view = new EditorView({
      parent: container,
      root: shadow,
      state: EditorState.create({
        doc: getCode(),
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          EditorState.tabSize.of(2),
          indentUnit.of("  "),
          html(),
          chrome,
          syntaxHighlighting(syntax),
          audit,
          lintGutter(),
          formatOnPaste,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) changed();
          }),
          keymap.of([
            // Cmd/Ctrl+S: there is no file, so "save" formats the styles and re-renders.
            { key: "Mod-s", run: () => (save(), true), preventDefault: true },
            { key: "Shift-Alt-f", run: () => (formatCode(), true) },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...completionKeymap,
            ...lintKeymap,
            // Tab indents; Escape then Tab leaves the editor.
            indentWithTab,
          ]),
        ],
      }),
    });

    editorHost.append(shell);
    editorShell = shell;
    textarea.hidden = true;
    getCode = () => view.state.doc.toString();
    setCode = (code) =>
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    // One transaction, so one undo step.
    formatCode = () => {
      const edits = formatEdits(getCode());
      if (edits.length) view.dispatch({ changes: toChanges(edits) });
    };
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
  // browser's Save dialog. Inside CodeMirror its own keybinding runs `save`.
  root.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    // Events from inside the shadow root arrive retargeted to its host.
    if (editorShell?.contains(event.target as Node)) return;
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
      await mountEditor();
    } catch (error) {
      console.warn("[playground] CodeMirror failed to load; using the plain editor.", error);
    }
  })();
}
