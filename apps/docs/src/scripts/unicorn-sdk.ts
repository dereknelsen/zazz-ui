/**
 * The Unicorn Studio SDK (v2.6.0), loaded once per document (`<hero-scene>`).
 *
 * Pages whose scene is in the first viewport load it in `<head>` with `async`
 * (pages/index.astro), as the SDK's docs advise; `loadSdk` then waits on that
 * tag instead of adding another. Its URL is content-hashed (lib/unicorn.ts).
 */

export interface Scene {
  /** Sets an authored variable; an unknown name logs a warning and changes nothing. */
  setVariable(name: string, value: number | boolean): Scene;
  destroy(): void;
}
export interface SceneOptions {
  element: HTMLElement;
  /** A scene exported as JSON, fetched from this URL instead of by project id. */
  filePath: string;
  /** Starting values for the scene's variables, over their authored defaults. */
  initialVariables?: Record<string, number | boolean>;
  /**
   * Fetch a project id's scene from Unicorn's edge CDN rather than the
   * uncached bucket. The SDK ignores it for a `filePath` scene.
   */
  production?: boolean;
}
export interface UnicornStudio {
  addScene(options: SceneOptions): Promise<Scene>;
}

const global = () => (window as unknown as { UnicornStudio?: UnicornStudio }).UnicornStudio;

let sdk: Promise<UnicornStudio> | undefined;

/**
 * Loads the SDK from `src` once per document, reusing a `<script>` already on
 * the page; a failed load is retried on the next call.
 */
export function loadSdk(src: string): Promise<UnicornStudio> {
  sdk ??= new Promise<UnicornStudio>((resolve, reject) => {
    const loaded = global();
    if (loaded) return resolve(loaded);
    let script = document.querySelector<HTMLScriptElement>(`script[src="${CSS.escape(src)}"]`);
    // A tag that already failed fires no more events: replace it.
    if (script?.dataset.failed !== undefined) {
      script.remove();
      script = null;
    }
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      document.head.append(script);
    }
    const tag = script;
    tag.addEventListener("load", () => {
      const ready = global();
      if (ready) resolve(ready);
      else reject(new Error("Unicorn Studio SDK loaded without its global"));
    });
    tag.addEventListener("error", (error) => {
      tag.dataset.failed = "";
      reject(error);
    });
  }).catch((error) => {
    sdk = undefined;
    throw error;
  });
  return sdk;
}

export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
