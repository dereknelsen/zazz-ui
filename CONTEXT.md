# Zazz Design Framework

Shared language for the Zazz monorepo: the `@zazzdesign/ui` package (`packages/ui`) and its documentation site (`apps/docs`).

## Language

**Primitive**:
One folder under `packages/ui/src/ui/` — a reusable, atomic UI element (styles + optional behavior + example fragments) used to compose layouts and UIs. A primitive is not a layout, template, or full-page pattern.
_Avoid_: component, widget

**Tag form**:
The custom-tag spelling of a primitive (`<ui-tooltip>`). Exists only where the root element would otherwise be a meaningless `<div>`/`<span>`; styleable without registration, registered only when it carries behavior.
_Avoid_: element version, web component form

**Class form**:
The class spelling of a primitive (`<div class="ui-tooltip">`, `<button class="ui-button">`). Every primitive has a class form; primitives rooted on semantic native elements have only this form.
_Avoid_: expanded version, raw form

**Slot**:
An interior part of a primitive, identified by `data-slot="{primitive}-{part}"` (e.g. `data-slot="dialog-header"`). Slots replace BEM element classes; classes only ever name primitive roots.
_Avoid_: part, fragment, segment, sub-component, BEM element

**HTML web component**:
A light-DOM custom element that augments existing, already-styled markup with behavior. The JS-carrying subset of primitives (today: carousel, lightbox, password-group, tabs, toaster). It never uses shadow DOM and never renders its own content; without JS its markup must still render sensibly.
_Avoid_: shadow-DOM component, "web component" as a catch-all for every primitive
