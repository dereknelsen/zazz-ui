# Reserve the npm names

Type: task
Status: open

## Question

Reserve the unscoped npm name `zazz-ui` (verified free 2026-08-24 — registry returns 404; `zazz` is taken; `@zazz-ui/ui` is unpublished as expected) and confirm control of the `@zazz-ui` scope. Only Derek can perform the publish.

Checklist (HITL):

1. Create/verify the `zazz-ui` npm org so the `@zazz-ui` scope is controlled (scopes belong to the org/user of the same name).
2. Publish a placeholder `zazz-ui@0.0.0` — a stub `package.json` + README saying "CLI for the Zazz Design Framework; under development, see github.com/dereknelsen/zazz-ui" — so the name can't be squatted. Keep it unscoped and public.
3. Do **not** publish `@zazz-ui/ui` — kit publishing stays deliberately disabled until the release-policy decision ([Decide versioning and release policy](07-versioning-release-policy.md)).
4. Record in the Answer: which npm account/org owns what, and where 2FA/tokens live.

Resolution unblocks the final spec ([Assemble the distribution spec](09-assemble-spec.md)) from assuming the `pnpm dlx zazz-ui@latest` command line.
