# Zazz for VS Code

Editor support for the [Zazz Design Framework](https://zazz.sh) in HTML. It runs
the kit's own code (`@zazz-ui/core`) in a language server
(`@zazz-ui/language-server`), so the editor, `<ui-debug>`, and
`vp run lint:html` agree.

| Feature          | What you get                                                                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnostics      | The `<ui-debug>` audit as you type, plus a primitive the page's head block does not load (information).                                                                                                                                 |
| Completions      | Utility names, then only the tiers a utility takes after `--x--`; `--group-` and pseudo forms; hooks for the identities in reach; values with resolved tokens; `data-ui` identities, presets, `ui-*` tags.                              |
| Auto-imports     | On a page whose `<!-- zazz:head {…} -->` block lists primitives, completing an identity adds its primitive to the head.                                                                                                                 |
| Code actions     | Quick fixes from the audit; **Organize Imports** sorts kit stylesheets into cascade order; **Sort style utilities** for the file or the element under the cursor.                                                                       |
| Formatting       | `source.fixAll.zazz` on save writes every `style` in cascade order, one utility per line (the same code as the `zazz/style-format` lint fix). Oxc stays the formatter.                                                                  |
| Hover            | What a utility sets and when its tier applies, a token's resolved value, a hook's default, an identity's summary, presets, and slots.                                                                                                   |
| Inlay hints      | `--p: 4` ≈ 0.9–1rem, `--px--md` ≥ 65ch, `--shadow: md` = `var(--shadow-md)`, size token ranges (`zazz.inlayHints.enable`).                                                                                                              |
| Highlighting     | Utility names by family, tiers, `group-`/pseudo prefixes, hooks, and `data-ui` identities; swatches before `var(--color-*)` (`zazz.colorSwatches.enable`).                                                                              |
| Folding          | Multi-line `style` attributes, `zazz:head` blocks, runs of kit stylesheets.                                                                                                                                                             |
| Snippets & Emmet | `zazz-<example>` for every kit example (ids as linked tab stops); Emmet `ui-card>h2` with the repo's `emmet.extensionsPath`.                                                                                                            |
| Languages        | HTML, plus any templating language in `zazz.languages` (`astro`, `razor`, `erb`, `phoenix-heex`, `handlebars`, …): the server masks the language's expressions before parsing, so only the markup is audited, completed, and formatted. |
| Templates        | **Zazz: New Page…** (also in **New File…**): blank page, page from a primitive, swap-navigation page, primitive fragment.                                                                                                               |

## Develop

From the repo root:

- `vp run zazz-vscode#build`, then **Run Zazz extension** in the Run and Debug
  view (**Attach to Zazz language server** debugs the server).
- `vp run zazz-vscode#generate` regenerates the grammar, Emmet abbreviations,
  and snippets after kit changes (run `vp run core#generate` first).
- `vp run zazz-vscode#test` runs the unit tests and drives the bundled server
  over stdio; `vp run zazz-vscode#test:e2e` runs the extension in a downloaded
  VS Code.
- `vp run zazz-vscode#package` builds `dist/zazz.vsix`; install it with
  `code --install-extension packages/vscode/dist/zazz.vsix`.
