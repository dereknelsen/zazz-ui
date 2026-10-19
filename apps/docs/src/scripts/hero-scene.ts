/**
 * `<hero-scene>`: the home hero's Unicorn Studio backdrop, one scene per color
 * scheme. The scheme is dark when `<html>` pins `theme-dark`, or pins nothing
 * and the OS prefers dark. A theme change loads the other scene in a layer on
 * top, fades it in once it has drawn, then drops the old one, so the backdrop
 * is never blank.
 *
 * A custom element because the site navigates by swapping `<body>`
 * (`data-ui-navigation="swap"`), and a swapped-in page's scripts never run:
 * the element sets up on every connect and destroys its scenes on disconnect.
 * BaseLayout loads this module in `<head>` on every page, so the element is
 * defined however the home page is reached; the SDK loads on first connect.
 */
import { ZazzElement, defineZazzElement } from "@zazz-ui/core/base/zazz-element.ts";
import { loadSdk, nextFrame, type Scene } from "./unicorn-sdk.ts";

/** Scenes exported from Unicorn Studio, served from `public/unicorn/`. */
const SCENES = {
  light: "/unicorn/unicorn-hero-light.json",
  dark: "/unicorn/unicorn-hero-dark.json",
};
const LAYER = `
  --position: absolute;
  --inset: 0;
  --opacity: 0;
  --transition: opacity var(--default-transition-duration);
`;

type Scheme = "light" | "dark";
interface Shown {
  scene: Scene;
  layer: HTMLElement;
}

const root = document.documentElement;
const prefersDark = matchMedia("(prefers-color-scheme: dark)");

function scheme(): Scheme {
  const tokens = (root.dataset.ui ?? "").split(/\s+/);
  if (tokens.includes("theme-dark")) return "dark";
  if (tokens.includes("theme-light")) return "light";
  return prefersDark.matches ? "dark" : "light";
}

/** Unicorn Studio finds layers by id; ids stay unique while two pages' elements overlap in a swap. */
let layers = 0;

class HeroScene extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    let wanted: Scheme | undefined;
    let current: Promise<Shown | undefined> = Promise.resolve(undefined);

    const render = () => {
      const next = scheme();
      if (next === wanted) return;
      wanted = next;
      current = current.then((previous) =>
        wanted === next && !signal.aborted
          ? this.#show(next, previous).catch(() => previous)
          : previous,
      );
    };

    render();
    prefersDark.addEventListener("change", render, { signal });
    const observer = new MutationObserver(render);
    observer.observe(root, { attributeFilter: ["data-ui"] });
    signal.addEventListener(
      "abort",
      () => {
        observer.disconnect();
        // Once any in-flight load settles, release the WebGL scene it left showing.
        void current.then((shown) => {
          shown?.scene.destroy();
          shown?.layer.remove();
        });
      },
      { once: true },
    );
  }

  /** Loads `scheme`'s scene into a new hidden layer and fades it in over `previous`. */
  async #show(scheme: Scheme, previous: Shown | undefined): Promise<Shown> {
    const layer = document.createElement("div");
    layer.id = `hero-scene-${++layers}`;
    layer.setAttribute("style", LAYER);
    this.append(layer);
    let scene: Scene;
    try {
      scene = await (
        await loadSdk()
      ).addScene({
        elementId: layer.id,
        filePath: SCENES[scheme],
        production: import.meta.env.PROD,
      });
    } catch (error) {
      layer.remove();
      throw error;
    }
    // Let the scene draw before it shows.
    await nextFrame();
    await nextFrame();
    layer.style.setProperty("--opacity", "1");
    // Settled, not fulfilled: a disconnect cancels the fade, and the scene must
    // still come back to be destroyed.
    await Promise.allSettled(layer.getAnimations().map((a) => a.finished));
    previous?.scene.destroy();
    previous?.layer.remove();
    return { scene, layer };
  }
}

defineZazzElement("hero-scene", HeroScene);
