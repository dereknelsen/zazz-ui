/**
 * `<hero-scene>`: the home hero's Unicorn Studio backdrop (components/HeroScene.astro).
 * One scene holds both color schemes and is driven by two variables:
 *
 * - `nightProgress`: 0 is day, about 0.45 sunset, 1 night. It starts at the
 *   page's scheme and eases to the other end when the scheme changes. The
 *   scheme is dark when `<html>` pins `data-theme="dark"`, or pins nothing and
 *   the OS prefers dark.
 * - `abductProgress`: 0 to 1 plays the UFO's tractor beam lifting a cow; the
 *   scene draws neither at 0 or at 1. It plays once each time the mouse comes
 *   to rest over the scene for a second or two, at night only (the UFO is not
 *   in the day sky).
 *
 * - `particleVisibility`: shows the birds and the UFO. Off on touch devices
 *   and narrow screens, where they crowd the hero's text and the UFO has no
 *   mouse to follow; the abduction never plays there either.
 *
 * With `prefers-reduced-motion: reduce` the sky changes in one step and the
 * abduction never plays.
 *
 * A custom element because the site navigates by swapping `<body>`
 * (`data-ui-navigation="swap"`), and a swapped-in page's scripts never run:
 * the element sets up on every connect and destroys its scene on disconnect.
 * HeroScene.astro loads this module on its own page and scripts/islands.ts
 * loads it after a swap; the SDK loads on first connect.
 */
import { ZazzElement, defineZazzElement } from "@zazz-ui/core/base/zazz-element.ts";
import { loadSdk, nextFrame, type Scene } from "./unicorn-sdk.ts";

/** The scene exported from Unicorn Studio, served from `public/unicorn/`. */
const SCENE = "/unicorn/unicorn-hero-day-night.json";
/** The scene's canvas: hidden until it has drawn, then faded in. */
const LAYER = `
  --position: absolute;
  --inset: 0;
  --opacity: 0;
  --transition: var(--default-transition-property-effects);
`;
/** A full day-to-night change; a change caught halfway takes half as long. */
const NIGHT_MS = 2400;
const ABDUCT_MS = 4500;
/** How long the mouse rests before the beam: a random time in this range. */
const REST_MS = [1000, 2000] as const;

const root = document.documentElement;
const prefersDark = matchMedia("(prefers-color-scheme: dark)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
/** Touch devices and narrow screens: no birds, no UFO. */
const noParticles = matchMedia("(hover: none), (pointer: coarse), (width < 48rem)");

/** The `nightProgress` of the page's color scheme. */
function night(): 0 | 1 {
  const { theme } = root.dataset;
  if (theme === "dark" || theme === "light") return theme === "dark" ? 1 : 0;
  return prefersDark.matches ? 1 : 0;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Calls `frame` with the progress (0 to 1) of a `ms` long animation on every
 * animation frame, ending on exactly 1, then `done`. Returns a cancel.
 */
function animate(ms: number, frame: (t: number) => void, done?: () => void): () => void {
  let id = 0;
  let start: number | undefined;
  const tick = (now: number) => {
    start ??= now;
    const t = ms > 0 ? Math.min((now - start) / ms, 1) : 1;
    frame(t);
    if (t < 1) id = requestAnimationFrame(tick);
    else done?.();
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}

class HeroScene extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    // A failed load leaves the hero without its backdrop.
    void this.#run(signal).catch(() => {});
  }

  async #run(signal: AbortSignal): Promise<void> {
    const layer = document.createElement("div");
    layer.setAttribute("style", LAYER);
    this.append(layer);
    signal.addEventListener("abort", () => layer.remove(), { once: true });

    let progress: number = night();
    const sdk = await loadSdk();
    if (signal.aborted) return;
    const scene = await sdk.addScene({
      element: layer,
      filePath: SCENE,
      initialVariables: {
        nightProgress: progress,
        abductProgress: 0,
        particleVisibility: !noParticles.matches,
      },
    });
    if (signal.aborted) {
      scene.destroy();
      return;
    }

    const stopSky = this.#followScheme(scene, progress, signal, (value) => (progress = value));
    const stopBeam = this.#abductAtRest(
      scene,
      signal,
      () => progress === 1 && !noParticles.matches,
    );
    // A resized window, or a mouse plugged into a tablet.
    noParticles.addEventListener(
      "change",
      () => scene.setVariable("particleVisibility", !noParticles.matches),
      { signal },
    );
    signal.addEventListener(
      "abort",
      () => {
        stopSky();
        stopBeam();
        scene.destroy();
      },
      { once: true },
    );

    // Let the scene draw before it shows.
    await nextFrame();
    await nextFrame();
    layer.style.setProperty("--opacity", "1");
  }

  /**
   * Eases `nightProgress` to the page's scheme whenever it changes, from
   * wherever the last change left it. `report` hears every value set.
   */
  #followScheme(
    scene: Scene,
    from: number,
    signal: AbortSignal,
    report: (value: number) => void,
  ): () => void {
    let value = from;
    let target = from;
    let cancel = () => {};
    const set = (next: number) => {
      value = next;
      scene.setVariable("nightProgress", next);
      report(next);
    };
    const render = () => {
      const next = night();
      if (next === target) return;
      target = next;
      cancel();
      if (reducedMotion.matches) return set(next);
      const start = value;
      cancel = animate(NIGHT_MS * Math.abs(next - start), (t) =>
        set(start + (next - start) * easeInOut(t)),
      );
    };

    // The scheme may have changed while the scene loaded.
    render();
    prefersDark.addEventListener("change", render, { signal });
    const observer = new MutationObserver(render);
    observer.observe(root, { attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      cancel();
    };
  }

  /**
   * Plays `abductProgress` once each time the mouse comes to rest over the
   * element while `ready()` holds. The element takes no pointer events (the
   * hero's text sits on top), so the document's are tested against its box.
   */
  #abductAtRest(scene: Scene, signal: AbortSignal, ready: () => boolean): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;

    const play = () => {
      if (cancel || !ready() || reducedMotion.matches) return;
      cancel = animate(
        ABDUCT_MS,
        (t) => scene.setVariable("abductProgress", t),
        () => {
          // 1 draws the same as 0: the beam has closed and the cow is gone.
          scene.setVariable("abductProgress", 0);
          cancel = undefined;
        },
      );
    };
    const rest = (event: PointerEvent) => {
      clearTimeout(timer);
      if (event.pointerType === "touch") return;
      const box = this.getBoundingClientRect();
      const inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
      if (!inside) return;
      const [min, max] = REST_MS;
      timer = setTimeout(play, min + Math.random() * (max - min));
    };

    document.addEventListener("pointermove", rest, { signal, passive: true });
    // The mouse left the window: it is not resting over the scene.
    root.addEventListener("pointerleave", () => clearTimeout(timer), { signal });
    return () => {
      clearTimeout(timer);
      cancel?.();
    };
  }
}

defineZazzElement("hero-scene", HeroScene);
