# Reserve the npm names

Type: task
Status: resolved

## Question

Reserve the unscoped npm name `zazz-ui` (verified free 2026-08-24 — registry returns 404; `zazz` is taken; `@zazz-ui/core` is unpublished as expected) and confirm control of the `@zazz-ui` scope. Only Derek can perform the publish.

Checklist (HITL):

1. Create/verify the `zazz-ui` npm org so the `@zazz-ui` scope is controlled (scopes belong to the org/user of the same name).
2. Publish a placeholder `zazz-ui@0.0.0` — a stub `package.json` + README saying "CLI for the Zazz Design Framework; under development, see github.com/dereknelsen/zazz-ui" — so the name can't be squatted. Keep it unscoped and public.
3. Do **not** publish `@zazz-ui/core` — kit publishing stays deliberately disabled until the release-policy decision ([Decide versioning and release policy](07-versioning-release-policy.md)).
4. Record in the Answer: which npm account/org owns what, and where 2FA/tokens live.

Resolution unblocks the final spec ([Assemble the distribution spec](09-assemble-spec.md)) from assuming the `pnpm dlx zazz-ui@latest` command line.

## Answer

Resolved 2026-08-28.

- **Org/scope**: the `zazz-ui` npm org is created, so the `@zazz-ui` scope is controlled. Owner: Derek's personal npm account **`thederek`**.
- **Placeholder published**: `zazz-ui@0.0.0` went live 2026-08-28T12:45:31Z (unscoped, public, `latest`). Contents: stub `package.json` + README stating "CLI for the Zazz Design Framework — under development, see github.com/dereknelsen/zazz-ui". No `bin`, no dependencies.
- **`@zazz-ui/core` deliberately not published** — kit publishing stays gated on [Decide versioning and release policy](07-versioning-release-policy.md).
- **2FA/tokens**: 2FA is enabled on `thederek`; publishes are confirmed via npm's browser web-auth flow (or `--otp` from the authenticator). No automation/granular tokens exist yet — CI publish tokens are a decision for [Decide versioning and release policy](07-versioning-release-policy.md). Note: `npm`/`pnpm` auth configs are separate on Derek's machine; the working login as of today is via `npm login` (token in `~/.npmrc`). Also note `npm` commands fail inside the repo root because `devEngines` pins pnpm — run registry commands from outside the repo.
- The `pnpm dlx zazz-ui@latest` command line is now safe to assume in the spec.
