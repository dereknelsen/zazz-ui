# 01 Phase 0: browser test harness

Status: resolved
Type: task

Prove that Vitest browser mode (Chromium via Playwright) runs inside `vp test` alongside the happy-dom unit project, with a helper module that mounts markup and reads computed styles. Exit criterion: SPEC claim 1 passes green in Chromium from `packages/core`.

## Comments

- 2026-09-28: cycle 1 green. `src/base/registrations.browser.test.ts` (claim 1, three cases) passes in Chromium; `test/browser.ts` provides `useCss`, `mount`, `style`; `vite.config.ts` has `unit` and `browser` projects; deps `@vitest/browser-playwright@4.1.10`, `playwright`, `vitest@4.1.10` (catalog pinned to the version vite-plus bundles).
