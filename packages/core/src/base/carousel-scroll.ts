"use strict";

/**
 * @fileoverview The carousel engine: native scroll snap, plus what it lacks.
 * @description Started per carousel root by base/carousel.ts (which documents
 * the markup and the attributes). The viewport is a real scroll container (`scroll-snap-type: x mandatory`,
 * set in carousel.css), so touch, trackpad, wheel, and keyboard scrolling are
 * the browser's own: compositor-driven, no script per frame, and the content
 * stays scrollable without JS. This module adds what the platform lacks:
 *
 * - **Mouse drag** (`behaviors/gesture.ts`): a mouse press drags the track 1:1 with
 *   snapping off, rubber-bands past the ends, and on release projects the
 *   flick's velocity to a snap and scrolls there. Touch and pen are left to
 *   native scrolling (`canStart` rejects them).
 * - **Selection**: the nearest snap, tracked from a rAF-throttled `scroll`
 *   listener and settled on `scrollend` (debounced `scroll` where missing);
 *   a click's pending target wins while its scroll is in flight.
 * - **Loop** without clones: slides are rotated with `order` so the current
 *   one sits mid-track with neighbours on both sides, then an instant scroll
 *   compensates the shift, all while snapping and overflow are locked.
 *   Wrapped slides that are out of view are `inert`, so Tab order and the
 *   accessibility tree only skip content the user cannot see.
 * - **Axis and direction**: every position is logical (px from the track's
 *   start edge), so a vertical track (`data-carousel-axis="y"`) and a
 *   right-to-left one (`dir="rtl"` anywhere above it) run the same code.
 * - **Thumbs** (`linkThumbs`): a second engine on the thumb strip, free-scrolling
 *   by default, that keeps the selected thumb in view.
 * - **Autoplay / auto-scroll** (`data-carousel-plugins="autoplay"` or
 *   `"auto-scroll"`), with the kit's interaction rules (see `readAutoOptions`).
 *   Both pause while the carousel is off screen or the tab is hidden.
 * - Prev/next, dot pagination, the `in-view` / `snapped` / `active` /
 *   `playing` state tokens, and a `zazz:carousel-select` event on the root.
 *
 * Supported options (on the root): `data-carousel-loop`, `-align`
 * (`start` | `center` | `end`), `-axis` (`x` | `y`), `-draggable="false"`,
 * `-snap` (`slide` | `free`), `-skip-snaps` (a flick may pass several snaps; default one),
 * `-start-snap`. Thumb strips read the same names under
 * `data-carousel-thumbs-*` on the thumbs slot.
 */

import { rubberBand, trackDrag } from "../behaviors/gesture.ts";
import { Utils } from "./utils.ts";

// --- Types ---

/** The engine's public API, stored on the root as `_carousel`. */
interface CarouselApi {
  /** Scrolls to a snap (or, with loop, a slide) by index. */
  goTo(index: number, instant?: boolean): void;
  goToNext(): void;
  goToPrev(): void;
  /** The current snap (or, with loop, slide) index. */
  selectedSnap(): number;
  /** Snap scroll positions in px from the track's start edge, in track order. */
  snapList(): number[];
  /** Scrolls the least distance that brings a slide fully into view. */
  revealSlide(index: number, instant?: boolean): void;
  /** Starts autoplay / auto-scroll, when the root lists one in `data-carousel-plugins`. */
  play(): void;
  stop(): void;
  isPlaying(): boolean;
  /**
   * Reports a manual step (Prev/Next, a dot, a thumb, an arrow key) to
   * autoplay / auto-scroll: stops it, or with `…-stop-on-interaction="false"`
   * restarts its delay. Call before the step.
   */
  interact(): void;
  /** True for a vertical track (`data-carousel-axis="y"`). */
  readonly vertical: boolean;
  /** True when the track runs right to left. */
  readonly rtl: boolean;
}

/** Options read off the root's `data-carousel-*` attributes. */
interface NativeOptions {
  loop: boolean;
  draggable: boolean;
  dragFree: boolean;
  skipSnaps: boolean;
  startSnap: number;
  vertical: boolean;
}

/** How one engine instance reads its options and which controls it owns. */
interface EngineConfig {
  /** Attribute prefix the options are read from (default `data-carousel-`). */
  prefix?: string;
  /** Defaults for options the attributes leave out. */
  defaults?: Partial<Pick<NativeOptions, "loop" | "dragFree">>;
  /** Wire the root's prev / next / dots slots and its autoplay (false for a thumb strip). */
  controls?: boolean;
}

/** Autoplay / auto-scroll settings (see `readAutoOptions`). */
interface AutoOptions {
  mode: "autoplay" | "auto-scroll";
  delay: number;
  speed: number;
  startDelay: number;
  backward: boolean;
  playOnInit: boolean;
  stopOnInteraction: boolean;
  stopOnMouseEnter: boolean;
  stopOnLastSnap: boolean;
}

/** One snap point: a scroll position and the slides that rest at it. */
interface Snap {
  pos: number;
  slides: number[];
}

// --- Constants ---

/** Deceleration for projecting a release, in px/ms² (≈ a native fling's end distance). */
const DECELERATION = 0.0025;

/** Release speed (px/ms) that steps a snap even when the projection lands back on the start one. */
const STEP_VELOCITY = 0.3;

/** Where `scrollend` is missing, the quiet time that counts as settled, in ms. */
const SETTLE_FALLBACK_MS = 120;

/** Fastest a drag-free coast may decay (per ms), when an end cuts its distance short. */
const MAX_COAST_RATE = 0.02;

/** Auto-scroll `speed` is px per 60 Hz frame, scaled by real frame time. */
const FRAME_MS = 1000 / 60;

// --- State tokens ---

/**
 * @description Adds or removes one token of an element's `data-carousel-state`
 * list, leaving the other tokens in place.
 */
function setCarouselState(node: Element, token: string, on: boolean): void {
  const current = node.getAttribute("data-carousel-state") ?? "";
  const tokens = current.split(/\s+/).filter(Boolean);
  if (tokens.includes(token) === on) return;
  const next = on ? [...tokens, token] : tokens.filter((t) => t !== token);
  if (next.length) node.setAttribute("data-carousel-state", next.join(" "));
  else node.removeAttribute("data-carousel-state");
}

// --- Pure helpers ---

/**
 * @description The distance a release coasts at constant deceleration
 * (v² / 2a), signed like the velocity.
 */
function projectRelease(velocity: number, deceleration = DECELERATION): number {
  return (Math.sign(velocity) * velocity * velocity) / (2 * deceleration);
}

/** Index of the snap nearest to `pos`. */
function nearestSnap(snaps: readonly Snap[], pos: number): number {
  let best = 0;
  let bestDistance = Infinity;
  snaps.forEach((snap, index) => {
    const distance = Math.abs(snap.pos - pos);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/**
 * @description Visual order for a looped track: rotates the slides so `center`
 * has `before` slides ahead of it (by default half the track).
 *
 * @returns The `order` value per slide, in DOM order.
 */
function loopOrders(count: number, center: number, before = Math.floor(count / 2)): number[] {
  return Array.from({ length: count }, (_, i) => (((i - center + before) % count) + count) % count);
}

/**
 * @description How many slides a looped track keeps ahead of the current one:
 * the spare slides (those not in view) split evenly around the view, so a
 * drag or flick in either direction has the same room before an end.
 *
 * @param count - Slides in the track.
 * @param perView - Slides the viewport shows at once (current included).
 */
function loopLead(count: number, perView: number): number {
  return Math.max(1, Math.floor((count - Math.max(1, perView)) / 2));
}

/**
 * @description How far to rotate a looped track so a step fits: the slides in
 * view and the slides the target shows must all sit inside the track, in
 * order. Ranges are positions along the track (`order` values); the target's
 * may run past either end.
 *
 * @param count - Slides in the track.
 * @param view - First and last position in view now.
 * @param target - First and last position in view once the step lands.
 * @returns Positions to rotate by (0 when the step already fits, with the
 * span centred otherwise), or null when the span needs more slides than exist.
 */
function loopShift(
  count: number,
  view: { first: number; last: number },
  target: { first: number; last: number },
): number | null {
  const lo = Math.min(view.first, target.first);
  const hi = Math.max(view.last, target.last);
  if (lo >= 0 && hi <= count - 1) return 0;
  const span = hi - lo + 1;
  if (span > count) return null;
  return Math.floor((count - span) / 2) - lo;
}

/**
 * @description Which snap a release lands on: the one nearest to the
 * projected position, stepping at least one snap in the flick's direction
 * when the release was fast but the projection fell back to the start.
 *
 * @param velocity - Logical px/ms: positive moves the content toward the end
 * edge, which scrolls toward the start.
 */
function releaseTarget(
  snaps: readonly Snap[],
  from: number,
  projected: number,
  velocity: number,
  skipSnaps = false,
): number {
  let target = nearestSnap(snaps, projected);
  if (target === from && Math.abs(velocity) > STEP_VELOCITY) {
    target = from + (velocity > 0 ? -1 : 1);
  }
  // a flick moves one snap at most unless `skip-snaps` is on
  if (!skipSnaps) target = Math.min(from + 1, Math.max(from - 1, target));
  return Math.min(snaps.length - 1, Math.max(0, target));
}

/**
 * @description Reads autoplay / auto-scroll from the root: the slug in
 * `data-carousel-plugins` picks the mode (auto-scroll wins when both are
 * listed), and its options come from that plugin's attributes:
 * - autoplay (`data-carousel-autoplay-*`): `delay` (ms, 4000),
 *   `stop-on-last-snap` (false; otherwise wraps to the first snap).
 * - auto-scroll (`data-carousel-auto-scroll-*`): `speed` (px per 60 Hz frame,
 *   2), `start-delay` (ms before it moves, and before it resumes, 1000),
 *   `direction` (`forward` | `backward`). It doesn't start on its own under
 *   `prefers-reduced-motion: reduce`.
 * - both: `play-on-init` (true), `stop-on-interaction` (true: a drag, a
 *   scroll, slide focus, or a manual step stops it for good; `false` holds it
 *   until the interaction ends), `stop-on-mouse-enter` (false).
 *
 * @returns The settings, or null when neither slug is listed.
 */
function readAutoOptions(root: Element): AutoOptions | null {
  const slugs = (root.getAttribute("data-carousel-plugins") ?? "").split(/[\s,]+/);
  const mode = slugs.includes("auto-scroll")
    ? "auto-scroll"
    : slugs.includes("autoplay")
      ? "autoplay"
      : null;
  if (!mode) return null;
  const raw = Utils.parseDataAttributes(
    root,
    mode === "autoplay" ? "data-carousel-autoplay-" : "data-carousel-auto-scroll-",
  );
  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && value >= 0 ? value : fallback;
  return {
    mode,
    delay: num(raw.delay, 4000),
    speed: num(raw.speed, 2),
    startDelay: num(raw.startDelay, 1000),
    backward: raw.direction === "backward",
    playOnInit: raw.playOnInit !== false,
    stopOnInteraction: raw.stopOnInteraction !== false,
    stopOnMouseEnter: raw.stopOnMouseEnter === true,
    stopOnLastSnap: raw.stopOnLastSnap === true,
  };
}

// --- Engine ---

/**
 * @description Starts the engine on a carousel root.
 *
 * @param root - The carousel root (`<ui-carousel>` or `[data-ui~="carousel"]`),
 * or a thumbs slot.
 * @param viewport - Its viewport slot.
 * @param signal - Aborting it tears everything down.
 * @param config - Where options come from and which controls to wire.
 * @returns The API, or null when the markup has no container.
 */
function createCarousel(
  root: Element,
  viewport: HTMLElement,
  signal: AbortSignal,
  config: EngineConfig = {},
): CarouselApi | null {
  const container = viewport.querySelector<HTMLElement>('[data-carousel-slot~="container"]');
  if (!container) return null;
  const slides = [
    ...container.querySelectorAll<HTMLElement>(':scope > [data-carousel-slot~="slide"]'),
  ];
  const { prefix = "data-carousel-", defaults = {}, controls = true } = config;

  const raw = Utils.parseDataAttributes(root, prefix);
  const flag = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;
  const options: NativeOptions = {
    // loop needs a neighbour on each side of the current slide
    loop: flag(raw.loop, defaults.loop ?? false) && slides.length >= 3,
    draggable: flag(raw.draggable, true),
    dragFree: raw.snap === "free" || (raw.snap !== "slide" && (defaults.dragFree ?? false)),
    skipSnaps: flag(raw.skipSnaps, false),
    startSnap: typeof raw.startSnap === "number" ? raw.startSnap : 0,
    vertical: raw.axis === "y",
  };

  let snapsCache: Snap[] | null = null;
  let perViewCache = 1;
  /** Slides a resting snap shows before and after its own slide (from alignment). */
  let reach = { back: 0, ahead: 0 };
  let selected = -1;
  /** A click's destination while its scroll is in flight (snap index). */
  let pending: number | null = null;
  /** With loop, the slide `pending` stands for (end snaps merge several slides). */
  let pendingSlide: number | null = null;
  let inView = new Set<number>();
  let orders: number[] = slides.map(() => 0);
  /** Mirrors the `gliding` token: snapping is off while the script moves the track. */
  let gliding = false;
  /** Mirrors the `settling` token: a loop rotation's lock. */
  let settling = false;
  /** A scroll asked for while settling; run once the lock lifts. */
  let queued: (() => void) | null = null;
  let dragging = false;
  /** True while the auto-scroll loop is writing the scroll position. */
  let autoScrolling = false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const behavior = (instant?: boolean): ScrollBehavior =>
    instant || reducedMotion.matches ? "auto" : "smooth";

  // --- Axis ---
  // Positions are logical: px from the track's start edge, growing toward the
  // end. In RTL the start edge is the right one and `scrollLeft` runs from 0
  // down to negative values (the spec's model, shipped in every engine).

  const vertical = options.vertical;
  const rtl = !vertical && getComputedStyle(viewport).direction === "rtl";
  const sign = rtl ? -1 : 1;
  const getPos = () => (vertical ? viewport.scrollTop : viewport.scrollLeft * sign);
  const writePos = (pos: number) => {
    if (vertical) viewport.scrollTop = pos;
    else viewport.scrollLeft = pos * sign;
  };
  const scrollToPos = (pos: number, how: ScrollBehavior) =>
    viewport.scrollTo(vertical ? { top: pos, behavior: how } : { left: pos * sign, behavior: how });
  const clientSize = () => (vertical ? viewport.clientHeight : viewport.clientWidth);
  const maxScroll = () =>
    Math.max(0, (vertical ? viewport.scrollHeight : viewport.scrollWidth) - clientSize());
  const clampPos = (pos: number) => Math.min(maxScroll(), Math.max(0, pos));
  /** A box's start edge, in px from the viewport's start edge. */
  const startOf = (rect: DOMRect, box: DOMRect) =>
    vertical ? rect.top - box.top : rtl ? box.right - rect.right : rect.left - box.left;
  const sizeOf = (rect: DOMRect) => (vertical ? rect.height : rect.width);
  /** Pointer travel (px, on the drag axis) as logical travel. */
  const logical = (physical: number) => (vertical ? physical : physical * sign);

  /**
   * An instant scroll. The `jumping` token sets `scroll-behavior: auto` in CSS,
   * so the jump never inherits the viewport's smooth scrolling, whatever an
   * engine makes of `behavior: "instant"`. Gliding and settling already set
   * it, so their per-frame writes skip the two attribute changes.
   */
  const jump = (pos: number) => {
    if (gliding || settling) {
      writePos(pos);
      return;
    }
    setCarouselState(viewport, "jumping", true);
    writePos(pos);
    setCarouselState(viewport, "jumping", false);
  };

  const setGliding = (on: boolean) => {
    gliding = on;
    setCarouselState(viewport, "gliding", on);
  };

  // --- Geometry ---

  /** Snap points from layout, clamped to the scroll range and merged where they coincide. */
  const measure = (): Snap[] => {
    const box = viewport.getBoundingClientRect();
    const styles = getComputedStyle(viewport);
    const padStart =
      Number.parseFloat(
        vertical ? styles.scrollPaddingBlockStart : styles.scrollPaddingInlineStart,
      ) || 0;
    const padEnd =
      Number.parseFloat(vertical ? styles.scrollPaddingBlockEnd : styles.scrollPaddingInlineEnd) ||
      0;
    const max = maxScroll();
    const client = clientSize();
    const at = getPos();
    let firstSize = 0;
    let firstAlign = "start";
    const points = slides.map((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const size = sizeOf(rect);
      if (index === 0) firstSize = size;
      const start = startOf(rect, box) + at;
      // one value applies to both axes; two are `block inline`
      const parts = getComputedStyle(slide).scrollSnapAlign.split(" ");
      const align = vertical ? parts[0] : parts.at(-1);
      if (index === 0) firstAlign = align ?? "start";
      const raw =
        align === "center"
          ? start + size / 2 - client / 2
          : align === "end"
            ? start + size - client + padEnd
            : start - padStart;
      return { index, pos: Math.round(Math.min(max, Math.max(0, raw))) };
    });
    perViewCache = firstSize > 0 ? Math.max(1, Math.round(client / firstSize)) : 1;
    const side = perViewCache - 1;
    // centred slides that don't fill the view show a neighbour's edge on each side
    const peek = firstSize * perViewCache < client - 1 ? 1 : 0;
    reach =
      firstAlign === "center"
        ? { back: Math.floor(perViewCache / 2) + peek, ahead: Math.floor(perViewCache / 2) + peek }
        : firstAlign === "end"
          ? { back: side, ahead: 0 }
          : { back: 0, ahead: side };
    points.sort((a, b) => a.pos - b.pos);
    const snaps: Snap[] = [];
    for (const { index, pos } of points) {
      const last = snaps.at(-1);
      if (last && Math.abs(last.pos - pos) < 1) last.slides.push(index);
      else snaps.push({ pos, slides: [index] });
    }
    return snaps;
  };
  const snaps = () => (snapsCache ??= measure());
  const invalidate = () => {
    snapsCache = null;
  };
  /** Slides in view at once, from the first slide's size. */
  const perView = () => {
    snaps();
    return perViewCache;
  };

  /** The index the API speaks in: the snap, or with loop the slide (rotation-independent). */
  const publicIndex = (snapIndex: number): number =>
    options.loop ? (snaps()[snapIndex]?.slides[0] ?? 0) : snapIndex;
  const snapOfSlide = (slide: number): number =>
    Math.max(
      0,
      snaps().findIndex((snap) => snap.slides.includes(slide)),
    );

  // --- Output ---

  let dots: HTMLElement[] = [];
  const dotsNode = controls ? root.querySelector('[data-carousel-slot~="dots"]') : null;
  const templateDot = dotsNode?.querySelector('[data-carousel-slot~="dot"]')?.cloneNode(true);

  const buildDots = () => {
    if (!dotsNode || !(templateDot instanceof HTMLElement)) return;
    const count = options.loop ? slides.length : snaps().length;
    if (count === dots.length) return;
    dotsNode.replaceChildren();
    dots = [];
    if (count <= 1) return;
    for (let i = 0; i < count; i++) {
      const dot = templateDot.cloneNode(true) as HTMLElement;
      dot.addEventListener(
        "click",
        () => {
          api.interact();
          api.goTo(i);
        },
        { signal },
      );
      dots.push(dot);
    }
    dotsNode.append(...dots);
  };

  const render = (snapIndex: number) => {
    const index = publicIndex(snapIndex);
    const snapped = new Set(snaps()[snapIndex]?.slides ?? []);
    slides.forEach((slide, i) => setCarouselState(slide, "snapped", snapped.has(i)));
    dots.forEach((dot, i) => setCarouselState(dot, "active", i === index));
  };

  const select = (snapIndex: number) => {
    if (snapIndex === selected) return;
    selected = snapIndex;
    render(snapIndex);
    root.dispatchEvent(
      new CustomEvent("zazz:carousel-select", { detail: { index: publicIndex(snapIndex) } }),
    );
  };

  // --- Loop rotation ---

  /** Wrapped slides (moved against DOM order) that are out of view leave Tab order. */
  const syncInert = () => {
    if (!options.loop) return;
    const current = snaps()[selected]?.slides[0] ?? 0;
    const lead = orders[current] ?? 0;
    slides.forEach((slide, i) => {
      const wrapped = orders[i]! < lead ? i > current : i < current;
      slide.inert = wrapped && !inView.has(i);
    });
  };

  /** Invalidates an older rotation's pending unlock when a newer one starts. */
  let lockToken = 0;

  /**
   * Reorders the track and scrolls by the anchor slide's shift so nothing
   * visibly moves. `lock` also freezes snapping and the axis for two frames;
   * the auto-scroll loop reorders without it.
   */
  const applyOrders = (next: number[], anchorIndex: number, lock = true) => {
    if (next.every((order, i) => order === orders[i])) return;
    const anchor = slides[anchorIndex]!;
    const box = viewport.getBoundingClientRect();
    const before = startOf(anchor.getBoundingClientRect(), box);
    // snapping off (some engines re-snap elsewhere mid-compensation) and the
    // axis locked (iOS Safari paints the reordered frame before the scroll lands)
    // an unlocked reorder (auto-scroll) leaves an earlier lock's unlock in place
    const token = lock ? ++lockToken : lockToken;
    if (lock) {
      settling = true;
      setCarouselState(viewport, "settling", true);
    }
    slides.forEach((slide, i) => {
      if (orders[i] !== next[i]) slide.style.order = String(next[i]);
    });
    orders = next;
    const shift = startOf(anchor.getBoundingClientRect(), box) - before;
    jump(getPos() + shift);
    invalidate();
    if (!lock) return;
    // Two frames: restoring overflow at once breaks the compensation in iOS
    // Safari. A smooth scroll started under the lock is dropped by WebKit when
    // overflow changes, so scrolls asked for meanwhile wait for the lift.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (token !== lockToken) return;
        settling = false;
        setCarouselState(viewport, "settling", false);
        const run = queued;
        queued = null;
        run?.();
      }),
    );
  };

  /** Rotates the track so `center` sits mid-track with neighbours on both sides. */
  const rotate = (center: number, lock = true) =>
    applyOrders(
      loopOrders(slides.length, center, loopLead(slides.length, perView())),
      center,
      lock,
    );

  /** Track positions (`order`) of the first and last slide in view right now. */
  const viewRange = () => {
    const box = viewport.getBoundingClientRect();
    const client = clientSize();
    let first = Infinity;
    let last = -Infinity;
    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const start = startOf(rect, box);
      if (start + sizeOf(rect) <= 1 || start >= client - 1) return;
      first = Math.min(first, orders[i]!);
      last = Math.max(last, orders[i]!);
    });
    return { first, last };
  };

  // --- Scroll tracking ---

  let frame = 0;
  const onScroll = () => {
    if (holds.has("pointer")) pointerScrolled = true;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pending == null && !dragging) select(nearestSnap(snaps(), getPos()));
    });
  };

  const settle = () => {
    if (dragging || autoScrolling || coastFrame) return;
    // a scrollend from an earlier scroll can land after the next one started
    // (WebKit); acting on it would rotate the track under the new scroll
    const target = pending == null ? null : snaps()[pending];
    if (target && Math.abs(getPos() - target.pos) > 1) return;
    pending = null;
    const nearest = nearestSnap(snaps(), getPos());
    // a glide that stopped between snaps (auto-scroll paused) lands on the
    // nearest one before snapping resumes, or the browser would jump there
    if (gliding && !options.dragFree && Math.abs(getPos() - snaps()[nearest]!.pos) > 1) {
      scrollToSnap(nearest);
      return;
    }
    setGliding(false);
    select(nearest);
    if (options.loop) {
      rotate(snaps()[selected]?.slides[0] ?? 0);
      selected = nearestSnap(snaps(), getPos());
      syncInert();
    }
    afterSettle();
  };

  viewport.addEventListener("scroll", onScroll, { passive: true, signal });
  if ("onscrollend" in window) {
    viewport.addEventListener("scrollend", settle, { signal });
  } else {
    let timer = 0;
    viewport.addEventListener(
      "scroll",
      () => {
        clearTimeout(timer);
        timer = window.setTimeout(settle, SETTLE_FALLBACK_MS);
      },
      { passive: true, signal },
    );
    signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  }

  /** Scrolls to a snap; settles at once when there is nowhere to go (no scrollend follows). */
  const scrollToSnap = (snapIndex: number, instant?: boolean, slide: number | null = null) => {
    stopCoast();
    const list = snaps();
    const target = Math.min(list.length - 1, Math.max(0, snapIndex));
    if (settling) {
      // the target is already the destination, so a step asked for under the
      // lock continues from it and the compensating scroll's scrollend is ignored
      pending = target;
      pendingSlide = slide;
      select(target);
      queued = () => scrollToSnap(snapIndex, instant, slide);
      return;
    }
    const pos = list[target]?.pos ?? 0;
    if (Math.abs(getPos() - pos) < 1) {
      settle();
      return;
    }
    pending = target;
    pendingSlide = slide;
    select(target);
    if (instant) {
      jump(pos);
      settle();
      return;
    }
    scrollToPos(pos, behavior());
  };

  /** One step toward the end (+1) or the start (-1), from a click's pending target if any. */
  const step = (direction: 1 | -1) => {
    const from = pending ?? selected;
    if (!options.loop) {
      scrollToSnap(from + direction);
      return;
    }
    const count = slides.length;
    const fromSlide = (pending != null ? pendingSlide : null) ?? publicIndex(from);
    const slide = (fromSlide + direction + count) % count;
    // The track is only re-centred when a scroll settles, so steps taken while
    // one is in flight run out of slides. Rotate first when this one wouldn't
    // fit: the rotation and its compensating scroll cancel the scroll in
    // flight, and the new one starts from where the track visibly is.
    const at = orders[fromSlide]! + direction;
    const view = viewRange();
    const shift = loopShift(count, view, { first: at - reach.back, last: at + reach.ahead });
    // every slide is already in play between the view and the target
    if (shift == null) return;
    if (shift) {
      const current = publicIndex(Math.max(0, selected));
      pending = null;
      applyOrders(
        orders.map((order) => (((order + shift) % count) + count) % count),
        Math.max(0, orders.indexOf(view.first)),
      );
      selected = snapOfSlide(current);
      syncInert();
    }
    scrollToSnap(snapOfSlide(slide), false, slide);
  };

  // --- Autoplay / auto-scroll ---

  const auto = controls ? readAutoOptions(root) : null;
  /** Should play: play-on-init or play(), until stop() or a stopping interaction. */
  let wanted = false;
  /** What holds it with stop-on-interaction false; it resumes once this empties. */
  const holds = new Set<"pointer" | "focus" | "hover">();
  /** A scroll happened under the pointer hold, so its scrollend (not the pointer up) ends it. */
  let pointerScrolled = false;
  let onScreen = true;
  let running = false;
  let autoTimer = 0;
  let autoFrame = 0;
  let lastTick = 0;
  let carry = 0;

  const advance = () => {
    autoTimer = 0;
    const from = pending ?? selected;
    if (!options.loop && from >= snaps().length - 1) {
      if (auto?.stopOnLastSnap) {
        wanted = false;
        reconcile();
      } else scrollToSnap(0);
    } else step(1);
  };

  /** One auto-scroll frame: moves by speed × elapsed time and keeps a looped track rotated. */
  const tick = (now: number) => {
    if (!auto) return;
    autoFrame = requestAnimationFrame(tick);
    const elapsed = lastTick ? Math.min(50, now - lastTick) : 0;
    lastTick = now;
    carry += ((auto.backward ? -auto.speed : auto.speed) * elapsed) / FRAME_MS;
    // whole px only: fractional scroll offsets round differently per engine
    const whole = Math.trunc(carry);
    if (!whole) return;
    carry -= whole;
    const next = getPos() + whole;
    if (!options.loop && (next <= 0 || next >= maxScroll())) {
      writePos(clampPos(next));
      wanted = false;
      reconcile();
      return;
    }
    writePos(next);
    const nearest = nearestSnap(snaps(), getPos());
    select(nearest);
    if (options.loop) {
      rotate(snaps()[nearest]?.slides[0] ?? 0, false);
      selected = nearestSnap(snaps(), getPos());
    }
  };

  const stopMotion = () => {
    clearTimeout(autoTimer);
    cancelAnimationFrame(autoFrame);
    autoTimer = 0;
    autoFrame = 0;
    if (!autoScrolling) return;
    autoScrolling = false;
    settle();
  };

  const startMotion = () => {
    if (!auto) return;
    if (auto.mode === "autoplay") {
      autoTimer = window.setTimeout(advance, auto.delay);
      return;
    }
    autoTimer = window.setTimeout(() => {
      autoTimer = 0;
      pending = null;
      setGliding(true);
      autoScrolling = true;
      lastTick = 0;
      carry = 0;
      autoFrame = requestAnimationFrame(tick);
    }, auto.startDelay);
  };

  /** Starts or stops the motion to match what should be happening; `restart` re-arms its delay. */
  function reconcile(restart = false) {
    const run =
      !!auto &&
      wanted &&
      holds.size === 0 &&
      onScreen &&
      !document.hidden &&
      maxScroll() > 0 &&
      snaps().length > 1;
    if (auto) setCarouselState(root, "playing", wanted);
    if (run === running && !restart) return;
    running = run;
    stopMotion();
    if (run) startMotion();
  }

  /** Each settled scroll restarts autoplay's delay; it also ends a pointer hold. */
  function afterSettle() {
    if (!auto) return;
    if (holds.delete("pointer")) {
      reconcile();
      return;
    }
    if (running && auto.mode === "autoplay") {
      clearTimeout(autoTimer);
      autoTimer = window.setTimeout(advance, auto.delay);
    }
  }

  /** An interaction: stops for good, or with stop-on-interaction false holds until it ends. */
  const holdFor = (reason: "pointer" | "focus" | "hover") => {
    if (!auto || !wanted) return;
    if (auto.stopOnInteraction) wanted = false;
    else holds.add(reason);
    if (reason === "pointer") {
      pointerScrolled = false;
      // the user takes over mid auto-scroll: snapping back on at once, so
      // their own scroll lands on a snap the native way
      if (autoScrolling) {
        cancelAnimationFrame(autoFrame);
        autoFrame = 0;
        autoScrolling = false;
        setGliding(false);
      }
    }
    reconcile();
  };
  const release = (reason: "pointer" | "focus" | "hover") => {
    if (holds.delete(reason)) reconcile();
  };

  // the user taking over ends a scripted scroll short of its target; its
  // scrollend must then count, so the pending target goes
  const keyboardOff = viewport.closest('[data-carousel-keyboard="false"]') !== null;
  const onUserInput = (event: Event) => {
    // the kit steps on arrow keys itself (carousel.ts), from the pending target
    if (event instanceof KeyboardEvent && event.key.startsWith("Arrow") && !keyboardOff) return;
    if (event instanceof MouseEvent && event.button !== 0) return;
    holdFor("pointer");
    pending = null;
    // catching the track mid-coast stops it where it is
    if (stopCoast()) settle();
  };
  for (const type of ["pointerdown", "wheel", "touchstart", "keydown"]) {
    viewport.addEventListener(type, onUserInput, { passive: true, signal });
  }

  if (auto) {
    // a tap (no scroll) ends the hold at once; a scroll ends it on settle.
    // pointercancel means the browser took the touch for a pan: wait for that
    viewport.addEventListener(
      "pointerup",
      () => {
        if (!pointerScrolled) release("pointer");
      },
      { signal },
    );
    viewport.addEventListener(
      "focusin",
      (event) => {
        if (event.target !== viewport) holdFor("focus");
      },
      { signal },
    );
    viewport.addEventListener(
      "focusout",
      (event) => {
        if (!(event.relatedTarget instanceof Node && viewport.contains(event.relatedTarget))) {
          release("focus");
        }
      },
      { signal },
    );
    if (auto.stopOnMouseEnter) {
      root.addEventListener("mouseenter", () => holdFor("hover"), { signal });
      root.addEventListener("mouseleave", () => release("hover"), { signal });
    }
    document.addEventListener("visibilitychange", () => reconcile(), { signal });
  }

  // --- Mouse drag ---

  let dragFrom = 0;
  let dragSnap = 0;

  // No page-wide drag flag: trackDrag captures the pointer on the viewport, so
  // its own `dragging` cursor holds wherever the pointer goes. Flagging :root
  // would restyle every element on the page at each drag start and end.
  const setDragging = (on: boolean) => {
    dragging = on;
    setCarouselState(viewport, "dragging", on);
  };

  /** The drag-free coast's frame, 0 when none is running. */
  let coastFrame = 0;
  const stopCoast = (): boolean => {
    if (!coastFrame) return false;
    cancelAnimationFrame(coastFrame);
    coastFrame = 0;
    return true;
  };

  /**
   * Drag-free release: the track keeps the pointer's speed and decays
   * exponentially over the projected distance (x = target − d·e^(−kt), with
   * k = v/d so the first frame moves at the release speed). The browser's
   * smooth scroll would start from rest instead, a visible hitch. An end cuts
   * the distance short, which raises k: the track brakes into the end.
   */
  const coast = (velocity: number) => {
    const from = getPos();
    const target = clampPos(from - projectRelease(velocity));
    const distance = target - from;
    if (reducedMotion.matches || Math.abs(distance) < 1) {
      settle();
      return;
    }
    const rate = Math.min(MAX_COAST_RATE, Math.abs(velocity) / Math.abs(distance));
    const start = performance.now();
    const frame = (now: number) => {
      const left = distance * Math.exp(-rate * Math.max(0, now - start));
      if (Math.abs(left) < 0.5) {
        coastFrame = 0;
        writePos(target);
        settle();
        return;
      }
      writePos(target - left);
      coastFrame = requestAnimationFrame(frame);
    };
    coastFrame = requestAnimationFrame(frame);
  };

  const endDrag = (velocity: number) => {
    setDragging(false);
    // The rubber band's translate shrinks the scrollable width while it
    // springs back, so a release past the end rests short of it: once the
    // spring is done, finish the last few px.
    if (container.style.translate && getPos() >= maxScroll() - 1) {
      container.addEventListener(
        "transitionend",
        () => {
          if (!dragging && !coastFrame && pending == null) jump(maxScroll());
        },
        { once: true, signal },
      );
    }
    container.style.translate = "";
    const projected = getPos() - projectRelease(velocity);
    if (options.dragFree) {
      coast(velocity);
      return;
    }
    // snapping stays off ("gliding") until the scroll ends on the snap,
    // or re-enabling it mid-scroll would re-snap from where the glide is
    scrollToSnap(releaseTarget(snaps(), dragSnap, projected, velocity, options.skipSnaps));
  };

  if (options.draggable) {
    trackDrag(viewport, {
      axis: vertical ? "y" : "x",
      signal,
      canStart: ({ pointerType }) => pointerType === "mouse" && maxScroll() > 0,
      onStart: () => {
        pending = null;
        stopCoast();
        dragFrom = getPos();
        dragSnap = nearestSnap(snaps(), dragFrom);
        setGliding(true);
        setDragging(true);
      },
      onMove: ({ offset }) => {
        const wanted = dragFrom - logical(offset);
        const clamped = clampPos(wanted);
        jump(clamped);
        // logical overshoot: positive pushes the content away from the start edge
        const overshoot = rubberBand(clamped - wanted, clientSize() / 4);
        container.style.translate = !overshoot
          ? ""
          : vertical
            ? `0 ${overshoot}px`
            : `${overshoot * sign}px 0`;
      },
      onEnd: ({ velocity }) => endDrag(logical(velocity)),
      onCancel: () => endDrag(0),
    });
    // a dragged image or link would start a native drag-and-drop instead
    viewport.addEventListener("dragstart", (event) => event.preventDefault(), { signal });
  }

  // --- Observers ---

  const inViewObserver = new IntersectionObserver(
    (entries) => {
      inView = new Set(inView);
      for (const entry of entries) {
        const index = slides.indexOf(entry.target as HTMLElement);
        if (entry.isIntersecting) inView.add(index);
        else inView.delete(index);
        setCarouselState(entry.target, "in-view", entry.isIntersecting);
      }
      syncInert();
    },
    // 1px in on the scroll axis: a neighbour that only touches the viewport's
    // edge counts as intersecting otherwise (edge-adjacent boxes do)
    { root: viewport, rootMargin: vertical ? "-1px 0px" : "0px -1px" },
  );
  slides.forEach((slide) => inViewObserver.observe(slide));

  // autoplay and auto-scroll pause while the carousel is off screen
  const screenObserver = auto
    ? new IntersectionObserver(([entry]) => {
        onScreen = entry?.isIntersecting ?? true;
        reconcile();
      })
    : null;
  screenObserver?.observe(root);

  // Fires once on observe too; only a real change of snap emits a select.
  const resizeObserver = new ResizeObserver(() => {
    invalidate();
    buildDots();
    if (pending == null && !dragging && !autoScrolling) select(nearestSnap(snaps(), getPos()));
    // rebuilt dots and regrouped snaps need the current state redrawn
    render(selected);
    reconcile();
  });
  resizeObserver.observe(viewport);
  slides.forEach((slide) => resizeObserver.observe(slide));

  // --- Controls ---

  const api: CarouselApi = {
    goTo(index, instant) {
      scrollToSnap(options.loop ? snapOfSlide(index) : index, instant, options.loop ? index : null);
    },
    goToNext: () => step(1),
    goToPrev: () => step(-1),
    selectedSnap: () => publicIndex(Math.max(0, selected)),
    snapList: () => snaps().map((snap) => snap.pos),
    revealSlide(index, instant) {
      const slide = slides[index];
      if (!slide) return;
      const at = getPos();
      const start = startOf(slide.getBoundingClientRect(), viewport.getBoundingClientRect()) + at;
      const end = start + sizeOf(slide.getBoundingClientRect());
      const target = clampPos(
        start < at ? start : end > at + clientSize() ? end - clientSize() : at,
      );
      if (Math.abs(target - at) < 1) return;
      if (instant) jump(target);
      else scrollToPos(target, behavior());
    },
    play() {
      wanted = true;
      reconcile();
    },
    stop() {
      wanted = false;
      reconcile();
    },
    isPlaying: () => running,
    interact() {
      if (!auto || !wanted) return;
      if (auto.stopOnInteraction) {
        wanted = false;
        reconcile();
      } else reconcile(true);
    },
    vertical,
    rtl,
  };

  if (controls) {
    for (const [slot, direction] of [
      ["prev", -1],
      ["next", 1],
    ] as const) {
      root.querySelector(`[data-carousel-slot~="${slot}"]`)?.addEventListener(
        "click",
        () => {
          api.interact();
          step(direction);
        },
        { signal },
      );
    }
  }

  // --- Start ---

  setCarouselState(viewport, "free", options.dragFree);
  buildDots();
  // nothing has painted yet, so the start rotation needs no lock
  if (options.loop) rotate(options.startSnap % slides.length, false);
  const start = options.loop ? snapOfSlide(options.startSnap) : options.startSnap;
  jump(snaps()[start]?.pos ?? 0);
  select(nearestSnap(snaps(), getPos()));
  syncInert();
  if (auto) {
    // continuous motion never starts on its own for reduced-motion users
    wanted = auto.playOnInit && !(auto.mode === "auto-scroll" && reducedMotion.matches);
    reconcile();
  }

  signal.addEventListener(
    "abort",
    () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(coastFrame);
      clearTimeout(autoTimer);
      cancelAnimationFrame(autoFrame);
      inViewObserver.disconnect();
      screenObserver?.disconnect();
      resizeObserver.disconnect();
      if (dragging) setDragging(false);
      for (const token of ["gliding", "settling", "free"]) {
        setCarouselState(viewport, token, false);
      }
      setCarouselState(root, "playing", false);
      container.style.translate = "";
      for (const slide of slides) {
        slide.style.order = "";
        slide.inert = false;
        setCarouselState(slide, "in-view", false);
        setCarouselState(slide, "snapped", false);
      }
      // put the template dot back so a re-insert can build from it again
      if (templateDot) dotsNode?.replaceChildren(templateDot);
      delete root._carousel;
    },
    { once: true },
  );

  root._carousel = api;
  return api;
}

// --- Thumbs ---

/**
 * @description Runs a thumb strip on its own engine (options from
 * `data-carousel-thumbs-*` on the thumbs slot; `snap="free"` by default) and links
 * it to the main carousel: a thumb click steps the main carousel there, and
 * each main selection marks its thumb (`active` token and `aria-current`) and
 * scrolls the strip just enough to show it.
 *
 * @param main - The main carousel's API.
 * @param root - The main carousel root (its `zazz:carousel-select` drives the strip).
 * @param thumbsNode - The thumbs slot.
 * @param signal - Aborting it tears the strip down.
 * @returns The strip's API, or null when it has no viewport or container.
 */
function linkThumbs(
  main: CarouselApi,
  root: Element,
  thumbsNode: Element,
  signal: AbortSignal,
): CarouselApi | null {
  const viewport = thumbsNode.querySelector<HTMLElement>('[data-carousel-slot~="viewport"]');
  if (!viewport) return null;
  const strip = createCarousel(thumbsNode, viewport, signal, {
    prefix: "data-carousel-thumbs-",
    defaults: { dragFree: true },
    controls: false,
  });
  if (!strip) return null;
  const thumbs = [
    ...viewport.querySelectorAll<HTMLElement>(
      '[data-carousel-slot~="container"] > [data-carousel-slot~="slide"]',
    ),
  ];
  thumbs.forEach((thumb, index) =>
    thumb.addEventListener(
      "click",
      () => {
        main.interact();
        main.goTo(index);
      },
      { signal },
    ),
  );
  const mark = (index: number, instant?: boolean) => {
    thumbs.forEach((thumb, i) => {
      setCarouselState(thumb, "active", i === index);
      if (i === index) thumb.setAttribute("aria-current", "true");
      else thumb.removeAttribute("aria-current");
    });
    strip.revealSlide(index, instant);
  };
  root.addEventListener(
    "zazz:carousel-select",
    (event) => mark((event as CustomEvent<{ index: number }>).detail.index),
    { signal },
  );
  mark(main.selectedSnap(), true);
  signal.addEventListener(
    "abort",
    () => {
      for (const thumb of thumbs) {
        setCarouselState(thumb, "active", false);
        thumb.removeAttribute("aria-current");
      }
    },
    { once: true },
  );
  return strip;
}

export {
  createCarousel,
  linkThumbs,
  loopLead,
  loopShift,
  loopOrders,
  projectRelease,
  readAutoOptions,
  releaseTarget,
  setCarouselState,
};
export type { CarouselApi };
