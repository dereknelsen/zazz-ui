/**
 * The Unicorn Studio SDK, loaded once per document (`<hero-scene>`).
 */

// Self-hosted copy of the SDK, so the site makes no CDN request for it. It
// lives in `public/` because Vite's dev server rewrites `src/` scripts into
// modules, which a classic `<script>` can't parse.
const SDK = "/unicorn/unicornStudio.umd.js";

export interface Scene {
  destroy(): void;
}
export interface SceneOptions {
  elementId: string;
  /** A scene exported as JSON, fetched from this URL instead of by project id. */
  filePath: string;
  /** Serve the scene from Unicorn Studio's production CDN. */
  production?: boolean;
}
export interface UnicornStudio {
  addScene(options: SceneOptions): Promise<Scene>;
}

let sdk: Promise<UnicornStudio> | undefined;

/** Loads the SDK once per document; a failed load is retried on the next call. */
export function loadSdk(): Promise<UnicornStudio> {
  sdk ??= new Promise<UnicornStudio>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK;
    script.onload = () =>
      resolve((window as unknown as { UnicornStudio: UnicornStudio }).UnicornStudio);
    script.onerror = reject;
    document.head.append(script);
  }).catch((error) => {
    sdk = undefined;
    throw error;
  });
  return sdk;
}

export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
