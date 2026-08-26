# One dialog-lifecycle owner emitting `zazz:dialog-open` / `zazz:dialog-close`

Three modules (embla.ts, carousel.ts, lightbox.ts) each ran their own `MutationObserver`
on the same `<dialog open>` attribute, two close listeners duplicated the same gallery
sync (idempotent by luck, and one was in fact dead after the ui- rename), and the shared
runtime hard-coded lightbox selectors, pointing the dependency `base/ -> ui/`, the wrong
way across the seam. Now `base/dialog-lifecycle.ts` is the single owner of dialog
visibility: one observer plus one capture-phase `close` listener re-emit **bubbling**
plain Events (`zazz:dialog-open` and `zazz:dialog-close`, dispatched on the dialog)
and every consumer subscribes instead of observing.

Why events, and why re-emit `close`: the native `close` event does not bubble, which is
what forced document-level capture listeners into component code. A bubbling event lets
an ancestor (`<ui-lightbox>` contains its dialog) and a descendant holder (a carousel
listens on the dialog it found via `closest("dialog")`) both subscribe locally, and
listener order is specified by DOM event dispatch (dialog -> ancestors -> document) rather
than by observer-registration accident.

## Consequences

- The event names are public API for the kit (documented in CONVENTIONS.scripts.md);
  renaming them later is a breaking change.
- No `detail` payload: the dialog is the event target; add payload only with a clear use case.
- embla.ts keeps only carousel-domain reactions (init class-form roots, apply
  `data-carousel-start-index`, focus the viewport) as a document-level subscription; its
  lightbox drag-suppression gates generalized to `[data-slot~="carousel-slide"]` +
  `[commandfor]`, so no `lightbox-*` selector remains in `base/`.
