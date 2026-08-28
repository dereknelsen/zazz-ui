# Reserve the npm names

Type: task
Status: resolved

## Question

Reserve the unscoped npm name `zazz-ui` (verified free 2026-08-24 — registry returns 404; `zazz` is taken; `@zazz-ui/core` is unpublished as expected) and confirm control of the `@zazz-ui` scope. Only Derek can perform the publish.

Checklist (HITL):

1. Create/verify the `zazz-ui` npm org so the `@zazz-ui` scope is controlled (scopes belong to the org/user of the same name).
2. Publish a placeholder `zazz-ui@0.0.0` — a stub `package.json` + README saying "CLI for the Zazz Design Framework; under development, see github.com/dereknelsen/zazz-ui" — so the name can't be squatted. Keep it unscoped and public.
3. Do **not** publish `@zazz-ui/core` — kit publishing stays deliberately disabled until the release-policy decision ([Decide versioning and release policy](07-versioning-release-policy.md)).
4. Record in the Answer: which npm account/org owns what (this repo is public — sensitive specifics like token locations stay out of the tracker).

Resolution unblocks the final spec ([Assemble the distribution spec](09-assemble-spec.md)) from assuming the `pnpm dlx zazz-ui@latest` command line.

## Answer

Resolved 2026-08-28.

- **Org/scope**: the `zazz-ui` npm org is created, so the `@zazz-ui` scope is controlled. Owner: Derek's personal npm account (verify anytime with `npm owner ls zazz-ui`; account specifics kept out of this public repo).
- **Placeholder published**: `zazz-ui@0.0.0` went live 2026-08-28T12:45:31Z (unscoped, public, `latest`). Contents: stub `package.json` + README stating "CLI for the Zazz Design Framework — under development, see github.com/dereknelsen/zazz-ui". No `bin`, no dependencies.
- **`@zazz-ui/core` deliberately not published** — kit publishing stays gated on [Decide versioning and release policy](07-versioning-release-policy.md).
- **Auth posture**: publishes are manual and interactively confirmed by the account owner; no automation/granular tokens exist — CI publish tokens are a decision for [Decide versioning and release policy](07-versioning-release-policy.md). Machine/auth specifics are deliberately not recorded here (public repo). One non-sensitive gotcha worth keeping: `npm` commands fail inside the repo root because `devEngines` pins pnpm — run registry commands from outside the repo.
- The `pnpm dlx zazz-ui@latest` command line is now safe to assume in the spec.
