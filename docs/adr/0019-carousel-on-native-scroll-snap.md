# The carousel runs on native scroll snap, not Embla

Status: accepted (2026-11-16).

## Context

- The kit aims to ship with no runtime dependencies beyond polyfills. The carousel was the largest exception: Embla v9 (a release candidate) and three plugins, pinned in the import map with SRI, plus about 1,000 lines of kit glue in `base/embla.ts`.
- Embla moves the track with a transform written from script on every frame, for touch as well as mouse. The kit also flagged `:root` during a drag for a page-wide cursor, which restyled every element at each drag start and end.
- The CSS carousel features (`::scroll-button()`, `::scroll-marker`, `:target-current`) are Chromium-only, outside the browser support policy. Their only polyfill (flackr/carousel) is an explainer prototype: unpublished, reads inline `<style>` only, skips `@layer`, and patches `Element.prototype`.
- Scroll snap is Baseline since 2020 and `scrollend` since December 2025. `base/gesture.ts` (ADR-0018) already tracks drags.

## Decision

- **The viewport is a real scroll container** with `scroll-snap-type: mandatory`. Touch, trackpad, wheel, and momentum are the browser's own, on the compositor, and the carousel still scrolls with no script.
- **Script adds only what the platform lacks,** in `base/carousel-scroll.ts`: mouse drag (`trackDrag`, pointer captured, so the cursor needs no page-wide flag), selection from `scroll` and `scrollend`, controls, thumbs, autoplay and auto-scroll, and state tokens. `base/carousel.ts` wires the page: init, arrow keys, dialog start index.
- **Loop reorders slides with `order` and compensates with an instant scroll.** No clones, no DOM moves. The track is re-centered when a scroll settles, and before a step that would not otherwise fit (a step taken mid-animation). Snapping is off and the axis locked for two frames around a reorder (iOS Safari paints the reordered frame otherwise). `order` is set from script: `sibling-index()` is below the support floor.
- **Positions are logical** (px from the start edge), so RTL follows the inherited `dir` with no option, and a vertical track is one attribute.
- **Mouse releases are animated by script, touch releases never.** A snap release uses the browser's smooth scroll to the projected snap; a free release (`data-carousel-snap="free"`) coasts with an exponential decay that starts at the release speed.
- **The public surface is the kit's own:** `window.Carousel`, `root._carousel` / `<ui-carousel>.api` (`goTo`, `goToNext`, `goToPrev`, `selectedSnap`, `play`, `stop`, `isPlaying`), and a `zazz:carousel-select` event.

## Considered options

- **CSS carousel pseudo-elements with the flackr polyfill:** not viable under the support policy, and the polyfill cannot read the kit's layered stylesheets.
- **Keep Embla behind an engine switch:** two engines to test and document, and the dependency stays.
- **Clone slides for the loop:** duplicates content for assistive technology and conflicts with frameworks that own the DOM.
- **`moveBefore()` for the loop:** the same layout change and the same compensating scroll as `order`, with no Safari support.

## Consequences

- No carousel dependency: four packages, their import-map entries, and SRI hashes are gone; `signal-polyfill` is the only bare specifier left. About 13 KB of gzipped script becomes about 5 KB.
- Measured on the experiments playground (Chromium, 4× CPU throttling, six gestures): main-thread time during touch swipes fell from about 2,000 ms to 70–190 ms, with no long tasks.
- **Breaking.** `window.EmblaInit`, `_emblaApi`, and the Embla-typed `<ui-carousel>.api` are replaced. Embla options without a counterpart are dropped: `slidesToScroll`, `containScroll`, `duration`, `dragThreshold`, `inViewThreshold`, `breakpoints`, `active`, `direction` (use `dir`), `watch*`, and the Class Names plugin (the state tokens cover it). `--ui-carousel-touch-action` and `data-ui-dragging` are gone.
- A looped carousel needs spare slides: with every slide in view there is nothing to rotate, and rapid steps beyond what the track can hold are dropped.
- With loop on, visual order differs from DOM order; wrapped slides out of view are `inert` so Tab order skips only what cannot be seen.
- Auto-scroll and the free coast write the scroll position from script each frame. Everything else scrolls off the main thread.
