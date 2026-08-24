# Decide versioning and release policy

Type: grilling
Status: open
Blocked by: 04, 05

## Question

How do the kit and CLI version and release?

Decide:

- When and how publishing flips on: removing `"private": true` and the guarded `prepublishOnly` from `packages/ui` is explicitly gated on being asked — what conditions (spec complete? 0.1.0 scope?) trigger it.
- Kit ↔ CLI version coupling: lockstep versions vs independent, and whether the CLI pins a compatible kit range (`zazz-ui@1.x` vendors `@zazz-ui/ui@^1`).
- Release cadence and semver meaning for a vendored kit (what is a "breaking change" when consumers own their copies? css variable renames? slot renames?).
- Changelog discipline the `update` diff UX can lean on (per-primitive changelog entries?), and where release notes live.
- Whether `bumpp` (already a devDependency) / `vp` drives releases, and tagging conventions.

Blocked on the init/add/update contracts ([Define the init contract](04-init-contract.md), [Define the add/update contract](05-add-update-contract.md)) since the update story defines what versioning must guarantee.
