# Updates are three-way merges against recorded provenance

`zazz.json` records, for every vendored file, the kit version it came from and the sha256 of its pristine tarball bytes at vendor time. `zazz-ui update` merges base (recorded version's bytes) / ours (local file) / theirs (target version's bytes) per file, so user edits survive updates instead of being overwritten or abandoned.

## Context

Ticket research (`.scratch/distribution-dx/issues/01-shadcn-cli-anatomy.md`, 2026-08-24) identified the update story as shadcn's loudest failure category: its registry serves only "latest", nothing records which version a file was vendored from, so its diff cannot separate "my edits" from "upstream changes" and the community's best practice is manual three-way merging. The add/update grilling (`issues/05-add-update-contract.md`, 2026-08-28) chose Zazz's answer, enabled by ADR-0006's npm-tarball registry: npm retains every published tarball, giving every vendored byte a durable base version for free.

## Decision

- `init`/`add` record `{ kit version, per-file sha256 of pristine tarball bytes }` in `zazz.json` — always the published bytes, never the user's on-disk state.
- `update` per file: pristine (local hash == recorded) → take theirs silently; upstream unchanged (base == theirs) → keep ours; both changed → `git merge-file`-semantics three-way merge, clean hunks auto-merge, real conflicts prompt `[k]eep / [t]ake theirs / [m]arkers / [s]kip` (flags `--keep`/`--theirs`/`--markers` for CI; non-interactive with no strategy → skip + non-zero exit).
- Bare `update` moves the whole vendored tree in one staged transaction; `update <name>` narrows (skew tolerated, discouraged). `diff` renders local-vs-target and upstream-vs-upstream from exact tarball bytes.

## Why

- **The base version is the whole ballgame.** With it, "what did the user edit" and "what changed upstream" are separable, mechanically. Without it (shadcn), every update is a destructive overwrite or a manual archaeology session.
- **Exact published bytes eliminate false positives.** The kit publishes the same readable files it authors (compile-in-place); no reformatting between publish and vendor means no style-noise diffs.
- **Offline and reproducible by construction.** Both merge inputs come from npm-cached tarballs; `update`/`diff` work air-gapped once versions are cached.

## Consequences

- `zazz.json` is load-bearing state: deleting it demotes the project to manual maintenance. The CLI must treat it transactionally (rewrite once per successful operation).
- Hashes must be recorded from tarball bytes at vendor time even when the user immediately edits the file; a `[k]eep` during update still re-records the new pristine hash.
- The kit must never mutate published files post-publish (npm immutability guarantees this) and should avoid gratuitous reformatting between versions, which would turn every update into a conflict.
- The manifest (per-primitive files + dependencies) must stay complete and drift-guarded, since it is the update inventory.
