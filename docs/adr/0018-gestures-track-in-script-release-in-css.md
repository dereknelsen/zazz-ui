# Gestures track in script and release into CSS transitions

Status: accepted (2026-11-15).

## Context

- Toast swipe-to-dismiss and the drawer both need a drag that follows the pointer, a release decided by distance or velocity, and motion that can be caught again mid-flight. Nothing in the kit tracked a drag (the carousel's dragging is Embla's).
- The kit's motion lives in CSS: durations and curves are tokens and hooks, and `prefers-reduced-motion` zeroes `--default-transition-duration` once for everything.
- A custom property written on an ancestor on every pointer move restyles every descendant; Vaul shipped that and measured the lag past about twenty list items.

## Decision

- **One shared module, `base/gesture.ts`,** owns pointer tracking (`trackDrag`: axis lock, slop, pointer capture, velocity over the last 100ms, click suppression, the first-`touchmove` claim) and the release math (`shouldDismiss`, `rubberBand`, `flickDuration`). It ships with its consumers through the manifest's `base` lists, not in the core runtime.
- **While the pointer is down, the consumer writes the dragged element's inline `translate`,** with transitions off through a script-written state token (`swiping`, `dragging`). `translate` composes with the element's existing `transform`, so the toast stack math and the dialog's open/close transform stay as they are.
- **On release the script only changes state;** the element's own CSS transitions finish the motion. `translate` is in those transition lists. A flick may shorten the transition (`flickDuration`, used by the toast), never past the element's own duration, so reduced motion needs no branch in script. The drawer does not shorten: its curve is already steep at the start.
- **A dismissal that ends in the element being removed slides out first.** The drawer transitions its `translate` off the edge while the dialog is still open, and closes at `transitionend`. WebKit drops a closed dialog at once, with no exit transition, so a close-then-animate order showed nothing on iOS.
- **No keyframes on anything a gesture touches.** Transitions retarget from the current position.
- **A value linked to the drag that must reach a pseudo-element** (the drawer's backdrop opacity) is a paused Web Animation on the pseudo-element, scrubbed by drag progress and played to its end on release. WebKit does not re-resolve `::backdrop` when a non-inherited property changes on its dialog, so a registered, non-inheriting custom property taken with an explicit `inherit` is only the fallback for an engine that cannot animate `::backdrop` from script.
- **One progress value fans out.** The drawer computes how far it is toward closed (0 at its lowest snap point, 1 gone) once per move, and everything linked to it reads that number: its backdrop, the drawers stacked behind it, and the indented page. Each linked element gets one write per move, of a registered, non-inheriting custom property on that element, with transitions off through a state token (`following`, `dragging`); its own CSS turns the number into `scale` and `translate`. Non-inheriting keeps the write from restyling the element's content. On release the property is removed or set to its resting value and the element's transitions finish.
- **Where a drawer rests is a property, not an inline `translate`.** A snap point is `--_drawer-snap`, written when the stop changes and read by the drawer's `translate` in CSS, so the open transition lands on it and a release eases to it once the inline `translate` is removed.
- **A radius that must animate with a gesture is a scaled corner piece.** The indented page's top corners are two pseudo-elements, each a rounded box whose spread shadow is cut off at its own square, scaled from the corner. Animating `border-radius` on a clipped page repaints it every frame; scaling does not. The page is clipped to the viewport by a fixed `clip-path` rectangle that is set once and never animated.
- **`data-draggable="false"`** is the global opt-out for a region inside a draggable surface. (It shipped as `data-ui-no-drag` and was renamed on 2026-11-24: [ADR-0013](./0013-data-ui-markup-namespace.md), Amendment 5.)

## Considered options

- **A velocity-seeded spring in script:** closer to physical, but it moves timing out of the hooks, adds an animation loop, and needs its own reduced-motion branch. Sonner and Vaul both ship CSS transitions.
- **Inline `transform` instead of `translate`:** each consumer would have to recompose its existing transform on every move.
- **A third-party gesture library:** a runtime dependency with an import-map pin and SRI for about 200 lines (ADR-0007).

## Consequences

- A drawer sliding out after a swipe can be caught again, as can one returning to rest. One closed by Esc, the backdrop, or a button cannot: the dialog has left the open state.
- A `cancel` listener that keeps a swiped drawer open sees the event after the slide, so the drawer goes out and comes back.
- The release cannot carry the pointer's exact speed into the curve; it only shortens the duration.
- The indent's backing color is the `<body>` background, set with `!important` while the wrapper is engaged, because a page's own `<body style="--bg: …">` utility would otherwise win. It is the one place the kit overrides a utility.
- While indented, the page wrapper is transformed: `position: fixed` descendants are positioned against it. Vaul has the same limit.
- The toast and the drawer set `user-select: none` where a mouse drag would otherwise start selecting text (the whole toast, the drawer's handle).
