# Research npm-tarball-as-registry mechanics

Type: research
Status: resolved

## Question

How should a CLI fetch `@zazz-ui/core@<exact version>` from npm and copy files out of it without installing it as a dependency?

Cover:

- Options and trade-offs: `pacote` (what npm itself uses) vs shelling out to `npm pack` vs the raw registry HTTP API (`GET /@zazz-ui%2fui`, tarball URL from the version manifest).
- Integrity: how tarball `dist.integrity` (SSRI) verification works with each option.
- Version resolution: resolving ranges and dist-tags (`add button@0.3`, `@latest`) — semver resolution against the packument.
- Caching: what `pnpm dlx`/`npx` cache, what pacote caches (cacache), and behavior in CI and offline.
- Practicalities: registry rate limits, auth-free access for public packages, proxy/registry-mirror respect (honoring `.npmrc`).
- Recommendation: which mechanism the Zazz CLI should use, with a sketch of the fetch-extract-copy path.

Findings feed [Define the init contract](04-init-contract.md) and [Define the add/update contract](05-add-update-contract.md).

## Answer

### 1. Options and trade-offs

**pacote** (https://www.npmjs.com/package/pacote, https://github.com/npm/pacote) is the library npm itself uses to fetch packages. Its API maps exactly onto our need:

- `pacote.packument(spec, opts)` — fetch the package document (all versions + dist-tags).
- `pacote.manifest(spec, opts)` — resolve a spec (exact version, range, or dist-tag) to one version's manifest, including `dist.tarball` and `dist.integrity`.
- `pacote.tarball(spec, opts)` / `pacote.tarball.file(spec, dest, opts)` — tarball as a Buffer or written to disk; result carries `{from, resolved, integrity}`.
- `pacote.extract(spec, dest, opts)` — fetch **and** extract the package contents into `dest` (the `package/` root inside the tgz is stripped), returning `{from, resolved, integrity}`. This is the one call that covers our whole fetch→verify→extract path.

Accepts "any specifier npm can install" (`@zazz-ui/core@0.3.2`, `@zazz-ui/core@^0.3`, `@zazz-ui/core@latest`). Options pass straight through to `npm-registry-fetch` (network/auth/proxy) and `cacache` (cache). Trade-offs: it's a real dependency tree (registry fetch + cache + git-spec support), so it adds install weight to the CLI; in exchange we inherit npm's exact resolution, integrity, caching, retry, and proxy semantics for free.

**Shelling out to `npm pack`** (https://docs.npmjs.com/cli/v11/commands/npm-pack/): `npm pack @zazz-ui/core@0.3.2 --pack-destination <tmp> --json` fetches the tarball via npm's own machinery (so integrity and `.npmrc` are honored automatically) and the `--json` output includes `filename`, `integrity`, and `shasum`. Trade-offs: requires an `npm` binary on PATH (fine for npm users, but the CLI may be run via `pnpm dlx`/`bunx` in environments where npm's version is old or absent); spawn overhead per call; output format is CLI-owned and has changed across npm majors; we still have to untar ourselves (strip the leading `package/` path segment); no programmatic packument access for "list available versions" UX. Reasonable as a zero-dependency fallback, weak as the primary mechanism.

**Raw registry HTTP API** (https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md): `GET https://registry.npmjs.org/@zazz-ui%2Fui` (scoped names URL-encode the `/`) returns the packument; each `versions[v].dist` has `tarball`, `shasum`, `integrity`; `dist-tags` maps tags to versions. Sending `Accept: application/vnd.npm.install-v1+json` returns the abbreviated ("corgi") packument — only `name`, `modified`, `dist-tags`, `versions` with install-relevant fields including the full `dist` object (`tarball`, `shasum`, `integrity`, `fileCount`, `unpackedSize`) — much smaller than full metadata, which can exceed 10 MB for big packages (https://github.com/npm/registry/blob/main/docs/responses/package-metadata.md). Then `GET dist.tarball`, verify, untar. Trade-offs: fewest dependencies (`fetch` + `semver` + `ssri` + `tar` would do), but we'd re-implement semver/dist-tag pick order, SSRI verification, retries/429 handling, HTTP caching, offline mode, proxies, and `.npmrc` mirrors — everything pacote already does correctly.

### 2. Integrity (SSRI)

`dist.integrity` is a Standard Subresource Integrity string, `sha512-<base64 digest>` for anything published in the last many years (`shasum` is the legacy sha1). The `ssri` library (https://www.npmjs.com/package/ssri) parses and checks these: `ssri.checkData(buffer, integrity)` / `ssri.checkStream(stream, integrity)` verify a download and reject on mismatch; verification picks the strongest algorithm present.

- **pacote**: verification is automatic. Tarball bytes flow through `make-fetch-happen` → `cacache`, which is content-addressed **by** SSRI digest and verifies on both insertion and extraction; passing an explicit `integrity` opt makes a mismatch throw `EINTEGRITY`. A corrupted cache entry signals pacote to refetch automatically.
- **`npm pack`**: npm verifies internally the same way (it is pacote underneath); `--json` echoes the integrity so we could log it, but we can't independently re-verify without hashing the file ourselves.
- **raw HTTP**: entirely on us — stream the tarball response through `ssri.integrityStream({ integrity })` (or `checkStream`) against the packument's `dist.integrity` before trusting any extracted byte.

### 3. Version resolution (ranges and dist-tags)

Resolution is always "fetch packument, then pick": dist-tags are a flat map (`dist-tags.latest → "0.3.2"`), and ranges are matched against the `versions` keys. npm's exact pick order lives in `npm-pick-manifest` (https://www.npmjs.com/package/npm-pick-manifest), which pacote uses internally: a dist-tag selector returns that tagged manifest directly; an exact version returns exactly it; a range prefers the `defaultTag` (`latest`) version if it satisfies the range, otherwise the highest satisfying version, preferring non-deprecated versions with matching `engines`; failure throws `ETARGET` (no match) or `ENOVERSIONS`. So `zazz-ui add button@0.3` (meaning `@zazz-ui/core@0.3.x`) and `@latest` both come free via `pacote.manifest('@zazz-ui/core@0.3', …)` — no hand-rolled semver logic. If we go raw-HTTP anywhere, use `npm-pick-manifest` on the corgi packument rather than bare `semver.maxSatisfying`, to match npm's behavior around `latest` and deprecations.

### 4. Caching, CI, offline

- **pacote/cacache**: pacote caches every HTTP response (packuments per RFC 7234 headers, tarballs content-addressed by integrity) in a `cacache` directory — npm's own is `~/.npm/_cacache`; pass `cache` to use it or a Zazz-specific dir (e.g. `~/.cache/zazz-ui`). cacache (https://www.npmjs.com/package/cacache) is lockless and concurrency-safe, dedupes identical content, and verifies integrity on read. `npm-registry-fetch` exposes the knobs: `offline` (cache only, never network), `preferOffline` (use stale cache without revalidating — safe for _exact_ versions since published tarballs are immutable), `preferOnline` (always revalidate — correct for dist-tags/ranges, whose meaning changes over time).
- **`npx` / `pnpm dlx`** (relevant to how users run the _CLI_, not to how the CLI fetches the kit): `npx` installs the executed package into `~/.npm/_npx/<hash>` backed by the shared `_cacache`; `pnpm dlx` has its own dlx cache. Both have a documented footgun: `dlx foo@latest` / `npx foo@latest` can execute a **stale** cached "latest" instead of re-resolving the tag (pnpm issues #8659, #13370; mitigations landed via pnpm PR #8722 / pnpm 11 options). Consequence for us: (a) docs should suggest `npx zazz-ui@latest` knowing some users will still get a cached CLI — so the CLI itself must resolve the _kit_ version freshly rather than assuming it matches; (b) in CI, advise pinning exact CLI versions.
- **CI**: with an exact kit version and a persisted cache dir, a pacote fetch is a pure cache hit (or one conditional packument request); with `offline: true` it works air-gapped once warmed. Recommend the CLI accept `--offline`/`--prefer-offline` flags that map 1:1 to these options.

### 5. Practicalities: rate limits, auth, mirrors

- **Rate limits**: registry reads for public packages need **no auth**. npm rate-limits all registry APIs and returns HTTP 429 when exceeded (https://blog.npmjs.org/post/164799520460/api-rate-limiting-rolling-out.html); acceptable use is up to ~5M requests/month per user/IP (https://blog.npmjs.org/post/187698412060/acceptible-use.html). A CLI making 1–2 requests per invocation (one corgi packument + one tarball, both cached) is orders of magnitude below any limit. `npm-registry-fetch` retries transient failures (`fetchRetries` default 2, exponential factor).
- **Mirrors/proxies/.npmrc**: `npm-registry-fetch` (https://www.npmjs.com/package/npm-registry-fetch) honors `registry`, per-scope `'@zazz-ui:registry'`, `proxy`/`noProxy` (defaulting from `HTTPS_PROXY`/`NOPROXY` env), and nerf-darted auth (`'//host/:_authToken'`) — but it does **not read `.npmrc` itself**; it expects flattened options. Neither does pacote. To honor user/project `.npmrc` (Verdaccio mirrors, corporate proxies, Artifactory), load config with `@npmcli/config` (https://www.npmjs.com/package/@npmcli/config — reads builtin → project → user `~/.npmrc` → global `$PREFIX/etc/npmrc` → env `npm_config_*` → CLI flags, in npm's precedence) and pass its flattened output into pacote. Lighter alternative if `@npmcli/config` feels heavy: parse project + user `.npmrc` with `ini` and extract just `registry`, `@zazz-ui:registry`, `proxy`, `noproxy`, and any matching `:_authToken` — but the full loader is the faithful option and is what tools like semantic-release settled on.

### 6. Recommendation for the Zazz CLI

**Use pacote as the single fetch mechanism.** It is the only option that gives npm-identical semver/dist-tag resolution, automatic SSRI verification, RFC-7234 + content-addressed caching with offline modes, retry/429 handling, and proxy/mirror support in one API — exactly the "no registry server, npm is the registry" posture of ADR-0006. Raw HTTP saves dependencies but re-implements npm; `npm pack` couples us to whatever npm binary the user has. Dependencies: `pacote` + `@npmcli/config` (and `semver` if we validate user input ourselves).

Sketch of the fetch→verify→extract→copy path:

```ts
import pacote from "pacote";
import Config from "@npmcli/config";
// definitions/flatten/shorthands come from @npmcli/config's docs; npm's own
// definitions live in @npmcli/config or can be minimal for our needs
const config = new Config({ definitions, npmPath, argv: process.argv });
await config.load();
const opts = {
  ...config.flat, // registry, @zazz-ui:registry, proxy, auth…
  cache: zazzCacheDir, // e.g. ~/.cache/zazz-ui (cacache layout)
  preferOffline: isExactVersion(spec), // immutable → stale cache is fine
};

// 1. Resolve: range/dist-tag/exact → one concrete version + dist info.
//    (abbreviated "corgi" packument by default; full only with fullMetadata)
const manifest = await pacote.manifest(`@zazz-ui/core@${spec}`, opts);
//    manifest.version, manifest.dist.tarball, manifest.dist.integrity

// 2+3. Fetch + verify + extract in one call. Tarball is streamed through
//    cacache/ssri; the tgz's `package/` prefix is stripped; EINTEGRITY on
//    mismatch. Result: { from, resolved, integrity } for the lockfile/log.
const tmp = await mkdtemp(join(tmpdir(), "zazz-"));
const { integrity, resolved } = await pacote.extract(
  `@zazz-ui/core@${manifest.version}`, // pin the resolved exact version
  tmp,
  { ...opts, integrity: manifest.dist.integrity },
);

// 4. Copy: read the kit's manifest (src/manifest.ts / its compiled output)
//    from tmp, resolve the requested primitives + their base-layer deps to
//    file lists, copy into the user's project (the "vendor" model), then
//    rm -rf tmp. Record { version: manifest.version, integrity } in the
//    project's zazz lock/config for `update` diffs later.
```

For "what versions exist?" UX (`zazz-ui add button@0.3` disambiguation, `update` listing), call `pacote.packument('@zazz-ui/core', opts)` and read `dist-tags` + `Object.keys(versions)`; it's the abbreviated packument unless `fullMetadata: true`. Expose `--registry`, `--offline`, and `--prefer-offline` flags that override the loaded config and map directly onto the pacote options above.

Sources: https://github.com/npm/pacote (README), https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md, https://github.com/npm/registry/blob/main/docs/responses/package-metadata.md, https://www.npmjs.com/package/ssri, https://www.npmjs.com/package/cacache, https://www.npmjs.com/package/npm-registry-fetch, https://www.npmjs.com/package/npm-pick-manifest, https://www.npmjs.com/package/@npmcli/config, https://docs.npmjs.com/cli/v11/commands/npm-pack/, https://docs.npmjs.com/cli/v11/commands/npm-cache/, https://blog.npmjs.org/post/164799520460/api-rate-limiting-rolling-out.html, https://blog.npmjs.org/post/187698412060/acceptible-use.html, https://github.com/pnpm/pnpm/issues/8659, https://github.com/pnpm/pnpm/pull/8722.
