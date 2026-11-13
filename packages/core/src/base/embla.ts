"use strict";

/**
 * @fileoverview Embla Carousel initialization and controls.
 * @description Discovers carousel roots (`<ui-carousel>` or `[data-ui~="carousel"]`),
 * initializes Embla instances with optional plugins, and wires navigation,
 * keyboard, and dialog-open behaviors (subscribing to `zazz:dialog-open`
 * from base/dialog-lifecycle.ts; lightbox choreography lives in lightbox.ts).
 *
 * Structure: root is the element itself; parts are slots (`data-carousel-slot="<part>"`):
 * - root (`<ui-carousel>` | `[data-ui~="carousel"]`): Carousel container; holds all config attributes
 * - `carousel-viewport`: Visible window (required)
 * - `carousel-container`: Slides flex track
 * - `carousel-slide`: Individual slide
 * - `carousel-prev` / `carousel-next`: Navigation buttons (optional)
 * - `carousel-dots` / `carousel-dot`: Dot pagination container and template dot (optional)
 * - `carousel-thumbs`: Linked thumb carousel container (optional)
 *
 * thumb navigation (on `data-carousel-slot="thumbs"`):
 * - `data-carousel-thumbs-*`: thumb carousel options (defaults: containScroll keepSnaps, dragFree true)
 * - Syncs with the main carousel in the same root
 *
 * Lifecycle and dialog start index:
 * - `data-carousel-init`: Set by script when a carousel is initialized
 * - `data-carousel-start`: On a trigger; slide index to open to (pairs with commandfor)
 * - `data-carousel-start-index`: Set on root by script; consumed when dialog opens
 * - `data-carousel-keyboard`: Set to `"false"` to disable ArrowLeft/ArrowRight navigation
 *
 * Configuration (on the carousel root: `<ui-carousel>` or `[data-ui~="carousel"]`):
 * - `data-carousel-*`: Core Embla options
 * - `data-carousel-plugins`: Space-separated plugin slugs (`autoplay`, `auto-scroll`, `class-names`)
 * - `data-carousel-autoplay-*`: Autoplay plugin options (requires `autoplay` in plugins)
 * - `data-carousel-auto-scroll-*`: Auto scroll plugin options (requires `auto-scroll` in plugins)
 * - `data-carousel-class-names-*`: Class names plugin options (requires `class-names` in plugins)
 *
 * Built on Embla v9 (`9.0.0-rc04`). Core options pass straight through, so they
 * use Embla's v9 names (`data-carousel-start-snap`, `data-carousel-draggable`,
 * `data-carousel-drag-free="snap"`, …).
 *
 * Autoplay and Auto Scroll: the kit owns their interaction handling (it sets
 * Embla's `defaultInteraction: false`) and adds two kit-level options, read
 * from the plugin's own prefix (`data-carousel-autoplay-*`, `data-carousel-auto-scroll-*`):
 * - `…-play-on-init`: `"false"` leaves the plugin stopped until `play()` (default plays)
 * - `…-stop-on-interaction`: `"false"` holds the plugin during a drag or slide focus and
 *   resumes it after; Prev/Next, the dots, the thumbs, and the arrow keys restart its
 *   delay. By default (`true`) any of those stops it for good.
 * The kit also restarts a playing plugin after Embla's `reinit` (a resize or a
 * breakpoint change re-creates plugins, which Embla v9 leaves stopped).
 *
 * @see https://www.embla-carousel.com/api/options/
 * @see https://www.embla-carousel.com/plugins/autoplay/
 * @see https://www.embla-carousel.com/plugins/auto-scroll/
 * @see https://www.embla-carousel.com/plugins/class-names/
 *
 * @example
 * data-carousel-loop="true"
 *
 * @example
 * data-carousel-align="start"
 *
 * @example
 * data-carousel-plugins="autoplay" data-carousel-autoplay-delay="3000"
 *
 * @example
 * data-carousel-plugins="auto-scroll" data-carousel-auto-scroll-speed="2"
 *
 * @example
 * data-carousel-plugins="class-names" data-carousel-class-names-snapped="is-snapped"
 *
 * @example Barebones carousel (4 text slides; auto-inits on DOMContentLoaded):
 * <div data-ui="carousel">
 *   <div data-carousel-slot="viewport">
 *     <div data-carousel-slot="container">
 *       <div data-carousel-slot="slide">Slide 1</div>
 *       <div data-carousel-slot="slide">Slide 2</div>
 *       <div data-carousel-slot="slide">Slide 3</div>
 *       <div data-carousel-slot="slide">Slide 4</div>
 *     </div>
 *   </div>
 *   <button type="button" data-carousel-slot="prev">Prev</button>
 *   <button type="button" data-carousel-slot="next">Next</button>
 * </div>
 */

import { Utils } from "./utils.ts";
import { registerRefresh } from "./zazz-element.ts";

// Bare specifiers resolve through the page's import map in browsers (pinned
// jsDelivr URLs; see `head.ts`) and through node_modules in tests/bundlers.
import EmblaCarousel from "embla-carousel";
import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from "embla-carousel";
import EmblaCarouselAutoplay from "embla-carousel-autoplay";
import type { AutoplayOptionsType, AutoplayType } from "embla-carousel-autoplay";
import EmblaCarouselAutoScroll from "embla-carousel-auto-scroll";
import type { AutoScrollOptionsType, AutoScrollType } from "embla-carousel-auto-scroll";
import EmblaCarouselClassNames from "embla-carousel-class-names";
import type { ClassNamesOptionsType } from "embla-carousel-class-names";

// --- Configuration reading ---

/** Known Embla plugin slugs accepted by `data-carousel-plugins`. */
type CarouselPluginSlug = "autoplay" | "auto-scroll" | "class-names";

/**
 * @description Parses a space-separated `data-carousel-plugins` value into
 * plugin slug tokens. Empty / null / whitespace-only values yield `[]`.
 *
 * @param value - Raw attribute value (or `null` when absent).
 * @returns Plugin slug tokens in authoring order.
 */
function parseCarouselPlugins(value: string | null): string[] {
  if (!value) return [];
  return value.trim().split(/\s+/).filter(Boolean);
}

/**
 * Map of plugin slug → Embla factory. Slugs match Embla package names
 * (`embla-carousel-auto-scroll`, etc.).
 */
const PLUGIN_BY_SLUG: Record<CarouselPluginSlug, (node: Element) => EmblaPluginType> = {
  autoplay: (node) =>
    EmblaCarouselAutoplay(
      readAutoPluginOptions<AutoplayOptionsType>(node, "data-carousel-autoplay-"),
    ),
  "auto-scroll": (node) =>
    EmblaCarouselAutoScroll(
      readAutoPluginOptions<AutoScrollOptionsType>(node, "data-carousel-auto-scroll-"),
    ),
  "class-names": (node) =>
    EmblaCarouselClassNames(
      readCarouselOptions<ClassNamesOptionsType>(node, "data-carousel-class-names-"),
    ),
};

/**
 * @description Reads a node's prefixed `data-carousel-*` attributes as an
 * options object of the shape Embla (or one of its plugins) expects.
 *
 * Attributes are strings, so the single type assertion into Embla's option
 * types lives here (Embla validates its own options at runtime).
 *
 * @param node - Element carrying the configuration attributes.
 * @param prefix - Attribute prefix, e.g. `"data-carousel-autoplay-"`.
 * @returns The parsed attributes, typed as `T`.
 * @private
 */
function readCarouselOptions<T>(node: Element, prefix: string): T {
  return Utils.parseDataAttributes(node, prefix) as T;
}

// --- Autoplay and Auto Scroll ---

/** Kit-level options of the Autoplay and Auto Scroll plugins (not Embla's). */
type AutoPluginKitOptions = { playOnInit?: boolean; stopOnInteraction?: boolean };

/** The two plugins the kit drives: their `plugins()` key, attribute prefix, and interaction event. */
const AUTO_PLUGINS = [
  {
    key: "autoplay",
    prefix: "data-carousel-autoplay-",
    interaction: "autoplay:interaction",
  },
  {
    key: "autoScroll",
    prefix: "data-carousel-auto-scroll-",
    interaction: "autoscroll:interaction",
  },
] as const;

/**
 * @description Reads an Autoplay / Auto Scroll plugin's attributes as Embla
 * options: drops the kit-level `playOnInit` / `stopOnInteraction` and sets
 * `defaultInteraction: false`, so the plugin reports interactions
 * (`autoplay:interaction`) and `bindAutoPlugins` decides what they do.
 * @private
 */
function readAutoPluginOptions<T>(node: Element, prefix: string): T {
  const options = Utils.parseDataAttributes(node, prefix);
  delete options.playOnInit;
  delete options.stopOnInteraction;
  return { ...options, defaultInteraction: false } as T;
}

/** Per-carousel manual-step handlers, one per driven plugin (see onManualNavigation). */
const manualStepHandlers = new WeakMap<EmblaCarouselType, Array<() => void>>();

/** Form fields Embla never starts a drag on (its DragHandler `focusNodes`). */
const NON_DRAG_TARGETS = ["INPUT", "SELECT", "TEXTAREA"];

/**
 * @description Whether a pointer down starts an Embla drag. Embla v9 emits
 * `pointerdown` before its own checks, then ignores a non-primary mouse button
 * or a press in a form field, and no `pointerup` follows; state set on such a
 * pointer down would never clear.
 * @private
 */
function startsDrag(evt: Event): boolean {
  if (evt instanceof MouseEvent && evt.button !== 0) return false;
  return !(evt.target instanceof Element && NON_DRAG_TARGETS.includes(evt.target.nodeName));
}

/**
 * @description Drives the Autoplay and Auto Scroll plugins the way the kit
 * documents them, on top of Embla v9's bare plugins (which neither start on
 * their own nor survive a `reinit`):
 * - plays on init unless `…-play-on-init="false"`;
 * - a pointer down or slide focus stops the plugin; with
 *   `…-stop-on-interaction="false"` it only holds it, and the pointer up or
 *   focus leaving the slides resumes it;
 * - after a `reinit` (resize, breakpoint change, `reInit()`), which re-creates
 *   the plugin stopped, resumes it if it was playing, or is still waiting to
 *   play (no second snap yet, or the carousel was inactive at a breakpoint);
 * - registers the manual-step handler `onManualNavigation` runs.
 *
 * Takes the plugin instances themselves: `plugins()` is empty while the
 * carousel is inactive (`active: false` at the current breakpoint).
 * @private
 */
function bindAutoPlugins(
  emblaApi: EmblaCarouselType,
  node: Element,
  plugins: readonly EmblaPluginType[],
): void {
  const handlers: Array<() => void> = [];

  for (const { key, prefix, interaction } of AUTO_PLUGINS) {
    const plugin = plugins.find((p) => p.name === key) as AutoplayType | AutoScrollType | undefined;
    if (!plugin) continue;

    const { playOnInit, stopOnInteraction } = readCarouselOptions<AutoPluginKitOptions>(
      node,
      prefix,
    );
    const holds = stopOnInteraction === false;
    // `pending`: should play as soon as it can. `held`: what paused it with
    // stop-on-interaction false (its end resumes it), or "" when nothing does.
    let pending = playOnInit !== false;
    let held: "" | "pointer" | "focus" = "";
    let wasPlaying = false;

    const playIfPending = () => {
      if (!pending || emblaApi.snapList().length <= 1) return;
      // An inactive carousel never inits its plugins, and play() before init throws.
      if (!emblaApi.internalEngine().options.active) return;
      plugin.play();
      // play() does nothing while the plugin itself is inactive; keep waiting then.
      pending = !plugin.isPlaying();
    };

    // Embla re-creates plugins on reinit by calling destroy() then init() on the
    // same object, and destroy() stops it; note whether it was playing first.
    const destroy = plugin.destroy;
    plugin.destroy = () => {
      wasPlaying = plugin.isPlaying();
      destroy();
    };

    emblaApi.on("reinit", () => {
      pending ||= wasPlaying;
      wasPlaying = false;
      // A reinit mid-drag drops the drag, so its pointer up never comes.
      if (held === "pointer") {
        held = "";
        pending = true;
      }
      if (!held) playIfPending();
    });

    emblaApi.on(interaction, (_api, { detail }) => {
      const { interaction: type, originalEvent } = detail;
      if (type === "pointerdown" || type === "slidefocus") {
        // A pointerdown's originalEvent is Embla's event model; its detail is the DOM event.
        const pointer = originalEvent instanceof Event ? null : originalEvent.detail;
        if (type === "pointerdown" && pointer && !startsDrag(pointer)) return;
        if (!plugin.isPlaying() && !held) return;
        held = holds ? (type === "pointerdown" ? "pointer" : "focus") : "";
        pending = false;
        plugin.stop();
      } else if (
        (type === "pointerup" && held === "pointer") ||
        (type === "slidefocusout" && held === "focus")
      ) {
        held = "";
        plugin.play();
      }
    });

    handlers.push(() => {
      pending = false;
      if (holds) plugin.reset();
      else plugin.stop();
    });

    playIfPending();
  }

  if (handlers.length) manualStepHandlers.set(emblaApi, handlers);
}

/**
 * @description The kit's own Embla plugin, placed first in the plugin list so
 * its `pointerdown` listener runs before any other plugin's, on init and
 * after every reinit (Embla re-registers plugins in list order):
 * - vetoes a drag when every slide already fits (one snap): Embla would still
 *   rubber-band. Returning false cancels Embla's drag and the later listeners
 *   (Class Names' pointer-down class, the plugins' interactions). Skipped when
 *   the author set `data-carousel-draggable`.
 * - marks a drag as a `dragging` token on the viewport, and `data-ui-dragging`
 *   on the document root for the page-wide grabbing cursor (a `body:has(…) *`
 *   rule would restyle the whole page on every DOM insertion). Cleared on
 *   pointer up and on destroy (a reinit mid-drag drops the pointer up).
 * @private
 */
function KitDragPlugin(viewport: Element, vetoesDrag: boolean): EmblaPluginType {
  const root = viewport.ownerDocument.documentElement;
  let api: EmblaCarouselType | undefined;

  const setDragging = (on: boolean) => {
    setCarouselState(viewport, "dragging", on);
    root.toggleAttribute("data-ui-dragging", on);
  };
  const onPointerDown = (
    emblaApi: EmblaCarouselType,
    { detail }: { detail: Event },
  ): false | void => {
    if (vetoesDrag && !emblaApi.canGoToPrev() && !emblaApi.canGoToNext()) return false;
    if (startsDrag(detail)) setDragging(true);
  };
  const onPointerUp = () => setDragging(false);

  return {
    name: "zazzDrag",
    options: {},
    init(emblaApi) {
      api = emblaApi;
      emblaApi.on("pointerdown", onPointerDown).on("pointerup", onPointerUp);
    },
    destroy() {
      api?.off("pointerdown", onPointerDown).off("pointerup", onPointerUp);
      setDragging(false);
    },
  };
}

// --- Manual navigation ---

/**
 * @description Treats a manual step (Prev/Next, a dot, a thumb, an arrow key) as
 * user interaction for the Autoplay and Auto Scroll plugins, which on their own
 * only count a pointer-down on the viewport. Without it the plugin's timer keeps
 * running, and a tick that lands just after a click moves a second slide.
 * `stop-on-interaction` (default true) stops the plugin; `false` restarts its delay.
 * This is the pattern Embla's own examples use for navigation buttons.
 * @private
 */
function onManualNavigation(emblaApi: EmblaCarouselType): void {
  for (const handler of manualStepHandlers.get(emblaApi) ?? []) handler();
}

// --- Active-index sync ---

/**
 * @description Adds or removes one token of an element's `data-carousel-state`
 * list, leaving the other tokens in place.
 * @private
 */
function setCarouselState(node: Element, token: string, on: boolean): void {
  const tokens = (node.getAttribute("data-carousel-state") ?? "").split(/\s+/).filter(Boolean);
  const next = on ? [...new Set([...tokens, token])] : tokens.filter((t) => t !== token);
  if (next.length) node.setAttribute("data-carousel-state", next.join(" "));
  else node.removeAttribute("data-carousel-state");
}

/**
 * @description Mirrors Embla's view state onto the slides as `data-carousel-state`
 * tokens: `in-view` for slides inside the viewport and `snapped` for the slides
 * of the selected snap (what the ClassNames plugin exposes as classes).
 * @private
 */
function bindSlideStates(emblaApi: EmblaCarouselType): void {
  const update = () => {
    const slides = emblaApi.slideNodes();
    const inView = new Set(emblaApi.slidesInView());
    const snapped = new Set(
      emblaApi.internalEngine().scrollSnapList.slidesBySnap[emblaApi.selectedSnap()] ?? [],
    );
    slides.forEach((slide, index) => {
      setCarouselState(slide, "in-view", inView.has(index));
      setCarouselState(slide, "snapped", snapped.has(index));
    });
  };
  emblaApi.on("reinit", update).on("select", update).on("slidesinview", update);
  update();
}

/**
 * @description Sets `data-carousel-state="active"` on the node at `selected` and clears it
 * from every other node: the shared "which one is current" marker used by
 * both dot pagination and thumb navigation.
 *
 * @param nodes - Candidate nodes, in slide order.
 * @param selected - The active index.
 * @param options - Set `ariaCurrent` to also toggle `aria-current` (thumbs only;
 * dot pagination is purely visual).
 * @private
 */
function setActiveIndex(
  nodes: readonly HTMLElement[],
  selected: number,
  options: { ariaCurrent?: boolean } = {},
): void {
  nodes.forEach((node, idx) => {
    const active = idx === selected;
    setCarouselState(node, "active", active);
    if (!options.ariaCurrent) return;
    if (active) {
      node.setAttribute("aria-current", "true");
    } else {
      node.removeAttribute("aria-current");
    }
  });
}

// --- Dot navigation ---

/**
 * @description Adds dot navigation buttons and click handlers for an Embla carousel.
 *
 * @param emblaApi - The Embla carousel API instance.
 * @param dotsNode - Container element for dot navigation.
 * @param signal - Aborts the dot click listeners on teardown.
 * @returns Cleanup function to remove dots.
 */
const addDotBtnsAndClickHandlers = (
  emblaApi: EmblaCarouselType,
  dotsNode: Element,
  signal?: AbortSignal,
): (() => void) | undefined => {
  if (!dotsNode) return;

  const templateDot = dotsNode.querySelector('[data-carousel-slot~="dot"]');
  if (!templateDot) return;

  let dotNodes: HTMLElement[] = [];

  /**
   * @description Creates dot buttons for each slide and binds click handlers.
   *
   * @private
   */
  const addDotBtnsWithClickHandlers = () => {
    const snapCount = emblaApi.snapList().length;

    dotsNode.innerHTML = "";

    if (snapCount <= 1) {
      dotNodes = [];
      return;
    }

    dotNodes = [];
    for (let i = 0; i < snapCount; i++) {
      const dot = templateDot.cloneNode(true) as HTMLElement;
      dotNodes.push(dot);
      dotsNode.appendChild(dot);

      dot.addEventListener(
        "click",
        () => {
          onManualNavigation(emblaApi);
          emblaApi.goTo(i);
        },
        { signal },
      );
    }
  };

  /**
   * @description Updates the active state of dot buttons based on the current slide.
   *
   * @private
   */
  const toggleDotBtnsActive = () => {
    if (!dotNodes.length) return;
    setActiveIndex(dotNodes, emblaApi.selectedSnap());
  };

  emblaApi
    .on("reinit", addDotBtnsWithClickHandlers)
    .on("reinit", toggleDotBtnsActive)
    .on("select", toggleDotBtnsActive);
  addDotBtnsWithClickHandlers();
  toggleDotBtnsActive();

  return () => {
    dotsNode.innerHTML = "";
  };
};

// --- thumb navigation ---

/**
 * @description Adds click handlers on thumb slides to scroll the main carousel.
 *
 * @param emblaApiMain - Main carousel API instance.
 * @param emblaApiThumb - thumb carousel API instance.
 * @param signal - Aborts the thumb click listeners on teardown.
 */
const addThumbClickHandlers = (
  emblaApiMain: EmblaCarouselType,
  emblaApiThumb: EmblaCarouselType,
  signal?: AbortSignal,
) => {
  const slidesthumbs = emblaApiThumb.slideNodes();

  slidesthumbs.forEach((slideNode: HTMLElement, index: number) => {
    slideNode.addEventListener(
      "click",
      () => {
        onManualNavigation(emblaApiMain);
        emblaApiMain.goTo(index);
      },
      { signal },
    );
  });
};

/**
 * @description Keeps the thumb carousel and active state in sync with the main carousel.
 *
 * @param emblaApiMain - Main carousel API instance.
 * @param emblaApiThumb - thumb carousel API instance.
 */
const addTogglethumbsActive = (
  emblaApiMain: EmblaCarouselType,
  emblaApiThumb: EmblaCarouselType,
) => {
  const slidesthumbs = emblaApiThumb.slideNodes();

  /**
   * @description Scrolls thumbs to the selected snap and toggles active classes.
   *
   * @private
   */
  const toggleThumbBtnsActive = () => {
    const selected = emblaApiMain.selectedSnap();
    emblaApiThumb.goTo(selected);
    setActiveIndex(slidesthumbs, selected, { ariaCurrent: true });
  };

  emblaApiMain.on("select", toggleThumbBtnsActive);
  toggleThumbBtnsActive();
};

// --- Drag-aware click suppression ---

/**
 * Deadline (ms, `performance.now()`) until which invoker `command` events are
 * cancelled because a carousel drag just ended. Set by bindDragClickSuppression
 * for command-bearing slides (the lightbox stage) and enforced by
 * initCommandDragGuard. A bare `click` guard is not enough: the native /
 * polyfilled invoker opens the dialog from its own `command` dispatch.
 */
let suppressCommandsUntil = 0;

/**
 * @description Suppresses click activation immediately after a drag gesture.
 *
 * This prevents click-style actions (invoker commands, thumb navigation clicks)
 * from firing when the intent was dragging the carousel.
 *
 * @param root - Embla root/subtree to monitor.
 * @param emblaApi - Carousel instance tied to this root.
 * @param clickSelector - Click targets to suppress after dragging.
 * @param options - Per-carousel drag tolerance.
 * @param signal - Aborts the pointer/click listeners on teardown.
 */
function bindDragClickSuppression(
  root: Element,
  emblaApi: EmblaCarouselType,
  clickSelector: string,
  options: { dragThresholdPx?: number } = {},
  signal?: AbortSignal,
): void {
  const DRAG_THRESHOLD_PX = options.dragThresholdPx ?? 6;
  const SUPPRESS_WINDOW_MS = 250;
  // Slides that open a dialog (command="show-modal") also need command suppression.
  const guardsCommands = clickSelector.includes("commandfor");

  let pointerDown = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let snapAtDown = 0;
  let suppressUntil = 0;

  const pointerDistance = (): number => Math.hypot(lastX - startX, lastY - startY);

  root.addEventListener(
    "pointerdown",
    (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      pointerDown = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      snapAtDown = emblaApi.selectedSnap();
    },
    { passive: true, signal },
  );

  root.addEventListener(
    "pointermove",
    (e) => {
      if (!pointerDown || !(e instanceof PointerEvent)) return;
      lastX = e.clientX;
      lastY = e.clientY;
      if (moved) return;

      if (pointerDistance() >= DRAG_THRESHOLD_PX) moved = true;
    },
    { passive: true, signal },
  );

  const finalizePointer = () => {
    if (pointerDown && moved) {
      suppressUntil = performance.now() + SUPPRESS_WINDOW_MS;
      if (guardsCommands) suppressCommandsUntil = suppressUntil;
    }
    pointerDown = false;
    moved = false;
  };

  root.addEventListener("pointerup", finalizePointer, { passive: true, signal });
  root.addEventListener("pointercancel", finalizePointer, { passive: true, signal });
  emblaApi.on("pointerup", finalizePointer);

  // Touch/trackpad drags can move with tiny deltas. Treat Embla scroll as drag intent,
  // but lightbox openers need extra tolerance so minor carousel settle does not block clicks.
  emblaApi.on("scroll", () => {
    if (!pointerDown) return;

    if (guardsCommands) {
      if (pointerDistance() >= DRAG_THRESHOLD_PX || emblaApi.selectedSnap() !== snapAtDown) {
        moved = true;
      }
      return;
    }

    moved = true;
  });

  root.addEventListener(
    "click",
    (e) => {
      if (performance.now() > suppressUntil) return;

      const target = e.target instanceof Element ? e.target.closest(clickSelector) : null;
      if (!target || !root.contains(target)) return;

      e.preventDefault();
      e.stopImmediatePropagation();
    },
    { capture: true, signal },
  );
}

let commandDragGuardBound = false;

/**
 * @description Cancels invoker `command` events fired right after a carousel drag.
 *
 * Lightbox stage slides carry `command="show-modal"`, so a drag would both scroll
 * the carousel and open the dialog. The `command` event (native or polyfill) is
 * the single point that runs the built-in command, and it is cancelable, so we
 * preventDefault() it within the drag-suppress window. Bound once on `document` in
 * the capture phase; `command` does not bubble, but capture still reaches it.
 */
function initCommandDragGuard(): void {
  if (commandDragGuardBound) return;
  commandDragGuardBound = true;

  document.addEventListener(
    "command",
    (e) => {
      if (e.cancelable && performance.now() <= suppressCommandsUntil) e.preventDefault();
    },
    true,
  );
}

// --- Carousel initialization ---

/**
 * @description Initializes a single Embla carousel root.
 *
 * Configures the carousel from its `data-carousel-*` attributes, wires navigation
 * (prev/next, dots, thumbs), and stores the API on `root._emblaApi`. Idempotent:
 * skips roots that are already initialized or inside a closed dialog (no
 * measurable viewport until open).
 *
 * Called by `initEmblaCarousels()` for attribute-form (`[data-ui~="carousel"]`) markup and by
 * the `<ui-carousel>` web component on connect.
 *
 * @param emblaNode - The carousel root element.
 */
function initEmblaRoot(emblaNode: Element): void {
  if (emblaNode.hasAttribute("data-carousel-init")) return;

  // Defer init inside closed dialogs: viewport has no measurable size until open
  if (emblaNode.closest("dialog:not([open])")) return;

  emblaNode.setAttribute("data-carousel-init", "");

  const emblathumbsNode = emblaNode.querySelector('[data-carousel-slot~="thumbs"]');
  const emblaViewportNode = emblathumbsNode
    ? emblaNode.querySelector(
        '[data-carousel-slot~="viewport"]:not([data-carousel-slot~="thumbs"] *)',
      )
    : emblaNode.querySelector('[data-carousel-slot~="viewport"]');
  const emblaPrevButtonNode = emblaNode.querySelector('[data-carousel-slot~="prev"]');
  const emblaNextButtonNode = emblaNode.querySelector('[data-carousel-slot~="next"]');
  const emblaDotsNode = emblaNode.querySelector('[data-carousel-slot~="dots"]');

  if (!emblaViewportNode) return;

  if (!emblaViewportNode.hasAttribute("tabindex")) {
    emblaViewportNode.setAttribute("tabindex", "0");
  }

  const apiOptions = readCarouselOptions<Record<string, unknown>>(emblaNode, "data-carousel-");

  // Keep kit-only / plugin keys out of core Embla options
  Object.keys(apiOptions).forEach(function (key) {
    if (
      key === "name" ||
      key === "keyboard" ||
      key === "plugins" ||
      key.startsWith("autoplay") ||
      key.startsWith("autoScroll") ||
      key.startsWith("classNames")
    ) {
      delete apiOptions[key];
    }
  });

  // Plugins load only when listed in data-carousel-plugins; option attrs alone
  // do not enable them. Unknown slugs are ignored.
  // The kit's drag plugin goes first (see KitDragPlugin).
  const plugins: EmblaPluginType[] = [
    KitDragPlugin(emblaViewportNode, !("draggable" in apiOptions)),
  ];
  for (const slug of parseCarouselPlugins(emblaNode.getAttribute("data-carousel-plugins"))) {
    const create = PLUGIN_BY_SLUG[slug as CarouselPluginSlug];
    if (!create) continue;
    plugins.push(create(emblaNode));
  }

  // The options come from untyped data attributes; Embla validates at runtime.
  const emblaApi = EmblaCarousel(
    emblaViewportNode as HTMLElement,
    apiOptions as EmblaOptionsType,
    plugins,
  );
  bindSlideStates(emblaApi);
  bindAutoPlugins(emblaApi, emblaNode, plugins);

  emblaNode._emblaApi = emblaApi;

  // One controller per root scopes every carousel listener below; the owner
  // (`<ui-carousel>` disconnectedCallback) aborts it on teardown so the DOM
  // listeners are removed alongside the destroyed Embla instance.
  const controller = new AbortController();
  const { signal } = controller;
  emblaNode._emblaController = controller;

  if (emblaPrevButtonNode) {
    emblaPrevButtonNode.addEventListener(
      "click",
      () => {
        onManualNavigation(emblaApi);
        emblaApi.goToPrev();
      },
      { signal },
    );
  }

  if (emblaNextButtonNode) {
    emblaNextButtonNode.addEventListener(
      "click",
      () => {
        onManualNavigation(emblaApi);
        emblaApi.goToNext();
      },
      { signal },
    );
  }

  if (emblaDotsNode) {
    addDotBtnsAndClickHandlers(emblaApi, emblaDotsNode, signal);
  }

  // Any command-bearing slide (e.g. a lightbox stage slide that opens the
  // dialog) needs its click suppressed when it was really a drag.
  if (emblaNode.querySelector('[data-carousel-slot~="slide"][commandfor]')) {
    bindDragClickSuppression(
      emblaNode,
      emblaApi,
      '[data-carousel-slot~="slide"][commandfor]',
      { dragThresholdPx: 14 },
      signal,
    );
  }

  if (emblathumbsNode) {
    const emblathumbsViewportNode = emblathumbsNode.querySelector(
      '[data-carousel-slot~="viewport"]',
    );
    if (emblathumbsViewportNode) {
      const thumbDefaults: EmblaOptionsType = { containScroll: "keepSnaps", dragFree: true };
      const thumbOptions = readCarouselOptions<EmblaOptionsType>(
        emblathumbsNode,
        "data-carousel-thumbs-",
      );
      const emblaApiThumb = EmblaCarousel(emblathumbsViewportNode as HTMLElement, {
        ...thumbDefaults,
        ...thumbOptions,
      });

      emblaNode._emblaApiThumb = emblaApiThumb;
      addThumbClickHandlers(emblaApi, emblaApiThumb, signal);
      addTogglethumbsActive(emblaApi, emblaApiThumb);

      bindDragClickSuppression(
        emblathumbsNode,
        emblaApiThumb,
        '[data-carousel-slot~="slide"]',
        {},
        signal,
      );
    }
  }
}

/**
 * @description Initializes all Embla carousels within a scope.
 *
 * Discovers carousel elements via `:is(ui-carousel, [data-ui~="carousel"])` and configures them
 * based on their data attributes. Roots managed by the `<ui-carousel>` web
 * component are skipped: they initialize themselves via `connectedCallback()`.
 *
 * @param scope - Root element to search within. Defaults to `document`.
 */
function initEmblaCarousels(scope?: Document | Element): void {
  const root = scope || document;
  const emblaRoots = root.querySelectorAll(':is(ui-carousel, [data-ui~="carousel"])');

  emblaRoots.forEach(function (emblaNode) {
    // <ui-carousel> elements own their lifecycle (init on connect, destroy
    // on disconnect); double-initializing would leak a second Embla instance.
    if (emblaNode.closest("ui-carousel")) return;

    initEmblaRoot(emblaNode);
  });
}

// --- Dialog open subscription ---

/**
 * @description Reacts to dialogs opening (via `zazz:dialog-open` from
 * base/dialog-lifecycle.ts) with the carousel-domain work:
 * initializes class-form roots that deferred while the dialog was
 * `display: none`, applies a stored `data-carousel-start-index`, and focuses
 * the viewport for keyboard navigation.
 *
 * Listens on `document`, so it runs after any dialog- or ancestor-level
 * subscriber (`<ui-carousel>` self-init, `<ui-lightbox>` choreography).
 */
function initDialogOpenSubscription(): void {
  document.addEventListener("zazz:dialog-open", function (e) {
    if (!(e.target instanceof HTMLDialogElement)) return;
    const dialog = e.target;
    initEmblaCarousels(dialog);

    const roots = dialog.querySelectorAll(':is(ui-carousel, [data-ui~="carousel"])');
    roots.forEach(function (root) {
      const startIndex = root.getAttribute("data-carousel-start-index");
      if (startIndex != null && root._emblaApi) {
        root._emblaApi.goTo(Number(startIndex), true);
        root.removeAttribute("data-carousel-start-index");
      }

      const viewport = root.querySelector('[data-carousel-slot~="viewport"]');
      if (viewport instanceof HTMLElement) {
        viewport.focus({ preventScroll: true });
      }
    });
  });
}

// --- Keyboard navigation ---

/**
 * @description Returns the active Embla root for keyboard navigation.
 *
 * Prefers a carousel inside an open dialog, then the carousel containing focus.
 * Respects `data-carousel-keyboard="false"`.
 *
 * @returns The active carousel root, or null when none applies.
 * @private
 */
function getActiveEmblaRoot(): (Element & { _emblaApi: EmblaCarouselType }) | null {
  const openDialog = document.querySelector("dialog[open]");
  if (openDialog) {
    const dialogRoot = openDialog.querySelector(
      ':is(ui-carousel, [data-ui~="carousel"])[data-carousel-init]',
    );
    if (dialogRoot?._emblaApi && dialogRoot.getAttribute("data-carousel-keyboard") !== "false") {
      return dialogRoot as Element & { _emblaApi: EmblaCarouselType };
    }
  }

  const focusedRoot = document.activeElement?.closest(
    ':is(ui-carousel, [data-ui~="carousel"])[data-carousel-init]',
  );
  if (focusedRoot?._emblaApi && focusedRoot.getAttribute("data-carousel-keyboard") !== "false") {
    return focusedRoot as Element & { _emblaApi: EmblaCarouselType };
  }

  return null;
}

/**
 * @description Binds ArrowLeft/ArrowRight keyboard navigation for active carousels.
 *
 * Embla is headless: arrow keys are not built in. Opt out per carousel with
 * `data-carousel-keyboard="false"`.
 */
const initEmblaKeyboardNav: InitEmblaKeyboardNavFn = function () {
  if (initEmblaKeyboardNav._bound) return;
  initEmblaKeyboardNav._bound = true;

  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.defaultPrevented) return;

    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    ) {
      return;
    }

    const root = getActiveEmblaRoot();
    if (!root) return;

    e.preventDefault();
    onManualNavigation(root._emblaApi);
    if (e.key === "ArrowLeft") root._emblaApi.goToPrev();
    else root._emblaApi.goToNext();
  });
};

/**
 * @namespace EmblaInit
 * @description Public API for Embla carousel initialization and helpers.
 *
 * @property init - Initializes all carousels within a scope.
 * @property initRoot - Initializes a single carousel root (used by `<ui-carousel>`).
 * @property addDotBtnsAndClickHandlers - Wires dot pagination.
 * @property addThumbClickHandlers - Wires thumb click handlers.
 * @property addTogglethumbsActive - Syncs thumb active state.
 */
const EmblaInit = {
  init: initEmblaCarousels,
  initRoot: initEmblaRoot,
  addDotBtnsAndClickHandlers,
  addThumbClickHandlers,
  addTogglethumbsActive,
};

// --- Start index control ---

/**
 * @description Stores or applies a start slide index from `[data-carousel-start]` triggers.
 *
 * Clicking an element with `data-carousel-start="N"` stores that index on the target
 * carousel (found via `commandfor` → dialog → `:is(ui-carousel, [data-ui~="carousel"])`). The dialog
 * open observer scrolls to it on open.
 */
function initEmblaStartLinks(): void {
  document.addEventListener("click", function (e) {
    if (!(e.target instanceof HTMLElement)) return;

    const trigger = e.target.closest(
      "[data-carousel-start], [data-carousel-slot~='slide'][commandfor]",
    );
    if (!trigger) return;

    let index = trigger.getAttribute("data-carousel-start");
    if (index == null && trigger.hasAttribute("commandfor")) {
      const emblaRoot = trigger.closest(':is(ui-carousel, [data-ui~="carousel"])');
      if (emblaRoot?._emblaApi) {
        index = String(emblaRoot._emblaApi.selectedSnap());
      }
    }

    const dialogId = trigger.getAttribute("commandfor");
    if (!dialogId) return;

    const dialog = document.getElementById(dialogId);
    if (!dialog) return;

    const root = dialog.querySelector(':is(ui-carousel, [data-ui~="carousel"])');
    if (!root) return;

    if (root._emblaApi) {
      root._emblaApi.goTo(Number(index), true);
    } else if (index != null) {
      root.setAttribute("data-carousel-start-index", index);
    }
  });
}

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  // After an in-page navigation swap, initialize class-form carousels in the new content
  // (<ui-carousel> elements ride the swap via their own lifecycle; init() skips
  // already-initialized roots and closed dialogs).
  registerRefresh((scope) => initEmblaCarousels(scope));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initEmblaCarousels();
      initDialogOpenSubscription();
      initEmblaStartLinks();
      initEmblaKeyboardNav();
      initCommandDragGuard();
    });
  } else {
    initEmblaCarousels();
    initDialogOpenSubscription();
    initEmblaStartLinks();
    initEmblaKeyboardNav();
    initCommandDragGuard();
  }
}

// Attach to window for the documented public API (`window.EmblaInit`), and export
// for module consumers (carousel.js / navigation.js import it via the index.js entry).
if (typeof window !== "undefined") {
  window.EmblaInit = EmblaInit;
}

export { EmblaInit, setActiveIndex, parseCarouselPlugins };
