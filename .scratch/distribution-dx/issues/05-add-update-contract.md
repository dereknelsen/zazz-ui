# Define the add/update contract

Type: grilling
Status: open
Blocked by: 01, 04

## Question

How do `zazz-ui add <primitive>` and `zazz-ui update` behave?

Decide:

- Dependency resolution between primitives: `src/manifest.ts` covers only the 5 JS-carrying primitives (lightbox → carousel, etc.); css-only primitives have no machine-readable metadata. Does every primitive need a manifest entry (files + depends-on) in the published kit, and what shape does it take?
- What `add` copies (css, js when the primitive carries behavior, example html?) and how it appends the `@import` to the consumer's css entry.
- Update strategy: 3-way diff (base version from the recorded provenance, local file, new version) vs prompt-overwrite vs patch files — how local edits survive an update.
- How `update` uses the config file's recorded kit version + hashes; whether `update` is per-primitive, whole-kit, or both; how base-layer updates differ from primitive updates.
- Conflict UX: what the user sees when their edited file diverges.

Informed by [Research the shadcn CLI's anatomy](01-shadcn-cli-anatomy.md) and blocked on the config-file design from [Define the init contract](04-init-contract.md). On resolution, revisit the fog item **shadcn-registry-compat endpoint**: graduate it or move it to Out of scope.
