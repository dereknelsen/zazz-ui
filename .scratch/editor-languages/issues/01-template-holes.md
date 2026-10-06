# 01 Zazz language features in templating languages (HTML with holes)

Status: resolved
Type: task

Derek (2026-10-06): run the Zazz extension in `.astro`, `.asp`, `.razor`, `.heex`/`.ex`, and other HTML-with-template-expression files, with a setting for the file types. JSX/TSX is out of scope ("JS frameworks have tons of UI options already").

## Design

- `packages/language-server/src/html/holes.ts`: `maskTemplateHoles(text, languageId)` masks a language's expressions to spaces, same length and newlines kept, so every offset the services compute is a real document offset. One scanner list per VS Code language id: `astro` (frontmatter + `{}` with JSX inside left visible), `svelte` (`{}`), `vue` and the mustache family (`{{ }}`, `{% %}`, `{# #}`), `razor`/`aspnetcorerazor` (comments, `@{ }`, `@( )`, `@keyword (…) {` heads and their closing braces incl. `else`, line directives, implicit `@Model.X()` chains, `@@`, email guard), `asp`/`aspx`/`erb` (`<% %>`), `php` (`<? ?>`), `phoenix-heex`/`html-eex`/`eex` (`<% %>`, `{}`, `<.comp>`/`<:slot>` tags renamed to parseable names), `elixir` (everything but `~H` sigil bodies), `blade` (mustache + `@directive(...)`).
- `parseHtml(source, languageId = "html")` masks first and records `holes` on `ParsedHtml`; the ESLint plugin keeps the one-argument form.
- `server.ts` parses with `doc.languageId` and drops any diagnostic, color, inlay hint, or edit that touches a hole, and answers no hover or completion inside one. A `style` holding a hole is therefore never reformatted.
- Extension: `zazz.languages` setting (default `["html"]`) drives the document selector; the client restarts when it changes; activation events cover every known id; the grammar injects into the host grammars' scopes; swatches follow the setting.

## Comments

- 2026-10-06: tests first — `src/html/holes.test.ts` (shape preservation per language, Astro JSX inside expressions stays parseable, Razor heads/emails/`@@`, HEEx tags, Elixir sigils, mustache family, `overlapsHole`, and a razor integration case: the audit reports the real mistake and nothing inside a hole; a style with a hole yields an edit the server drops). `packages/vscode/src/server.test.ts`: an `.astro` document over the bundled server reports only the finding inside the expression's markup and answers no hover in the frontmatter.
- 2026-10-06: not done — JSX/TSX (per Derek); ESLint plugin stays HTML-only; the grammar injection scopes are a best guess per host grammar and need a look in the editor. Repo setting: `.vscode/settings.json` runs the features in `astro` for the docs site.
- 2026-10-06: green — language server 55 tests (incl. an emoji case: masking works on UTF-16 code units so LSP offsets stay exact), extension 22 tests over the bundled server, `vp check` 0 errors. Side finding: `vp check --fix` had been reformatting the generated `snippets/zazz.code-snippets` (trailing commas), which breaks its byte-for-byte generator test; the three generated extension files are now in the root formatter's `ignorePatterns`, and the snippets file is the generator's exact output again.
- 2026-10-06: resolved.
