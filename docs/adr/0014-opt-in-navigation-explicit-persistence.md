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

## Amendment (2026-10-07): scroll and current-page state

Persisting a sidebar to keep its scroll position left its links stale, and the docs header (persisted because its search and theme scripts bind once) never marked the new page. Both are forms of one problem: chrome that must survive a swap but shows the current URL.

- **A persisted element keeps its scroll offsets in every engine.** `swapBody` records them before the move and restores them after; a plain move (no `moveBefore()`, as in WebKit) used to reset them.
- **A persisted element's links take `aria-current` from the destination's copy**, paired by `href` in document order. The server's markup stays the source of truth: it decides which link is current, whether by exact or prefix match.
- **A `current` state tier** (`[aria-current]:not([aria-current="false"])`) lets styling follow `aria-current`, so no variant attribute needs updating.
- **`data-ui-persist-scroll="<id>"`** renders an element from the destination and carries only its scroll offset, for regions whose content depends on the page. Persistence updates nothing in a kept element but `aria-current`.
- **Window scrolls are instant**: `scroll-behavior` on `<html>` is `auto` until the view transition finishes (overlapping navigations share one override), so the reset's `smooth` never animates the jump in view of the new snapshot.
- **A navigation aborted by a newer one never swaps in**: the fetch takes the event's `signal`, and an aborted navigation neither swaps nor falls back to a full load.

Considered: morphing persisted elements into the destination's markup (keeps scroll and state, updates content). It is a DOM diff with its own edge cases (listeners on replaced nodes, custom-element state, form values), and the two narrow mechanisms cover the cases seen so far.
