# 08 Phase 7: repo-wide 0.5 pass

Status: resolved
Type: task
Blocked by: 05

## Comments

- 2026-10-06: `.claude/skills/zazz/SKILL.md` (layer name `ui`, docs link `/api/primitives/{name}/`), `references/components.md` (docs column → `/api/primitives/*/`, `/api/foundations/layout/`), `references/tokens.md` + `packages/core/AUTHORING.md` (no `text-link` role exists), `CONTEXT.md` (no `text-lead`; default band `xl`; the docs site line). `zazz-new-design-style` rewritten off the non-existent `zazz-pass/` paths and onto 0.5 markup. `zazz-version-bump` notes the docs site reads the version itself. Cursor and Copilot rule files link the site and `llms.txt`. Root `README.md` rewritten (alpha notice, every package and app). `AGENTS.md`: Astro docs entry, `packages/cli` added, `next dev` note gone. `apps/docs/README.md` rewritten. ADR-0015 (docs on Astro + generated API); ADR-0013 header no longer says `data-ui-slot`. `.scratch/docs-drift/` issues marked superseded. `packages/ui/` deleted (Phase 0).
- 2026-10-06: `packages/core/README.md` brought to 0.5 (alpha notice, the CLI exists, layout bands with `--col`, links to the new site); its CDN snippet still pins 0.4.1 on purpose (the published version; the version-bump skill sweeps it). Memory `project-zazz-0-5-migration` rewritten with the open follow-ups.
- 2026-10-06: resolved.
- 2026-10-06: control sizes — Derek's rule written into the `zazz` skill (`SKILL.md` golden rules + do/don't, `PATTERNS.md` "Control sizes"): the regular size ~95% of the time; `sm` / `icon-sm` only for input-group addons, table row actions, and tight toolbars; never nav links or header actions. Site updated: header GitHub and menu buttons and the footer GitHub button are `icon`; the playground toolbar buttons are regular. The preview frame's corner controls stay `icon-sm` (overlay toolbar).
- 2026-10-06: CLI — `zazz-ui init --legacy` now writes `layer(legacy.imports)` (and the placeholder comment says so); `wiring.test.ts` asserts no bare `layer(legacy)`. Derek's broader idea (declare the `legacy` layer and sublayers only when `--legacy` is used) was not taken: `_layers.css` is a kit file the CLI vendors byte-for-byte, an empty layer costs nothing, and the declaration must exist for a later hand-written `layer(legacy.imports)` import to land in the right order. Docs page updated.
