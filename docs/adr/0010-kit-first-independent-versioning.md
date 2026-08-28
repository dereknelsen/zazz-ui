# Kit publishes first; kit and CLI version independently under a 0.x breaking contract

`@zazz-ui/core` publishes as soon as its publishable surface exists (spec assembled, complete manifest + `dist/sri.json` building, changelog shipping), making the CDN story live immediately. The `zazz-ui` CLI follows on its own schedule and version line, declaring the kit range it understands.

## Context

The versioning grilling (`.scratch/distribution-dx/issues/07-versioning-release-policy.md`, 2026-08-28) had to decide when the deliberate `"private": true` gate flips, how two packages relate, and what semver promises a vendored kit can make when consumers own their copies.

## Decision

- **Kit first.** Publish gate: distribution spec assembled + manifest & `dist/sri.json` build artifacts in place + `CHANGELOG.md` in the tarball; then the mechanical flip (drop `private`, restore `prepublishOnly` to `vp run build`, version 0.1.0, manual publish by Derek). The CLI build and docs restructure do not gate the kit.
- **Independent versions.** The CLI declares a supported kit range, checked via a `manifestVersion` integer exported by the kit's manifest; a too-new kit fails with "upgrade the CLI", never a parse error. The CLI always resolves kit versions freshly from the registry.
- **0.x semver.** 0.MINOR = breaking: css custom-property renames/removals, data-attribute or slot contract changes, head/import-map contract changes, primitive or manifest-entry removals, `zazz.json` schema changes, `manifestVersion` bumps, browser-floor raises. Everything additive is a patch. 1.0.0 when the contract has proven stable.
- **Versions are immutable**: deprecate-plus-patch, never unpublish. Changelog entries are scoped per primitive/base so `update`/`diff` can print the relevant slice.

## Why

- **The CDN needs no CLI.** The package fields (`jsdelivr`/`unpkg`/`style`) and `exports` already shape the tarball for CDN serving; holding the kit hostage to CLI readiness delays the zero-cost half of distribution. And the CLI can only be honestly end-to-end tested against a published tarball.
- **Lockstep pollutes provenance.** Every CLI UX patch would mint a no-op kit version, and no-op versions show up in every consumer's `update` prompt.
- **A vendored kit's "breaking" is different**: consumers' sites never break on release day (their files are copies); breaking means "updating to this version needs your attention". The written breaking definition plus scoped changelog is that conversation's contract.

## Consequences

- 0.1.0's tarball is forever; the manifest shape and `sri.json` must be right (or at least present and versioned) before the flip.
- Publishing stays a deliberate manual act by Derek (2FA web-auth); CI publish automation is explicitly deferred until cadence demands it.
- Tags are per-package (`core-v*`, `cli-v*`), driven by `bumpp`.
