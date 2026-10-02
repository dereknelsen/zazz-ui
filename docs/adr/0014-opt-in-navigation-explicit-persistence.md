# In-page navigation is opt-in, and persistence is explicit

Status: accepted (2026-10-01). Amends the navigation behavior of `base/navigation.ts` (no earlier ADR).

`navigation.js` intercepts same-origin navigations only on a page whose `<html>` carries `data-ui-navigation="swap"`, and only toward a page that carries it too. A swap replaces the whole `<body>`, except elements marked `data-ui-persist="<id>"` whose id appears in both pages: those keep their live DOM and state. Without the opt-in, navigation is native (full loads, animated by the CSS cross-document view transitions the kit already enables).

## Context

- The kit's script entry loaded `navigation.js` on every page, so loading Zazz for styling also took over navigation.
- The swap replaced only `<main>`. Everything outside it persisted implicitly: the header's current-page link, a cart count, a signed-in menu all stayed stale after a navigation. A `data-layout` comparison on `<main>` was the only escape.
- `location.reload()` is a navigation too, so a dev server's live reload swapped `<main>` and left the header stale (fixed separately: reloads are never intercepted).
- Cross-document view transitions (`@view-transition { navigation: auto }`, already in `_view-transitions.css`) animate ordinary page loads in Chromium and Safari without script. The script's remaining value is keeping state alive across pages: a toast stack, a playing video, an open mini-cart.

## Decision

- **Opt-in at the document**: `<html data-ui-navigation="swap">`, a global (`data-ui-*`, no owning primitive). Both the current and the destination page must carry it; otherwise the browser loads the destination normally.
- **Swap the body, not `<main>`**: the new page's `<body>` children and attributes replace the current ones, and the title updates.
- **Persistence is declared**: an element with `data-ui-persist="<id>"` is carried over when the new page has an element with the same `data-ui-persist` value; the live element takes the new one's place (moved with `moveBefore()` where supported, so iframes, media and custom elements keep their state). A persisted element missing from the new page is dropped.
- **Reloads, hash changes, downloads and form posts are never intercepted.**
- **`data-layout` on `<main>` is no longer read.** `data-transition-layer` keeps its CSS-only role (view-transition group names).
- **`<ui-debug>` reports persistence**: on a swap page it lists the persisted elements; it warns on a `data-ui-persist` with no id, a duplicate id, a persisted element nested in another, and `data-ui-persist` on a page without the opt-in.

## Considered options

- **Keep swapping `<main>` and mark persistent regions explicitly**: still persists everything outside `<main>` by default, which is the confusion this removes.
- **Mark what swaps instead of what persists** (`data-ui-swap` regions): every page must annotate its content regions, and forgetting one silently keeps stale markup; marking the few persistent elements fails safe.
- **Remove the script entirely** in favor of cross-document view transitions: loses state persistence, which customers use for the toaster.

## Consequences

- Breaking: pages that relied on the implicit swap get full loads until they add `data-ui-navigation="swap"`, and the toaster (or anything else meant to survive) needs `data-ui-persist`.
- Stale chrome is impossible by default; persistence is visible in markup and in the debug console.
- The examples drop `data-layout="main"`.
