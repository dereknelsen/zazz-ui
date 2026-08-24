/**
 * Kit facts about the web-component scripts: the ids consumers can ask for and
 * the emitted files that implement them. Presentation metadata for the docs
 * previews (iframe heights, placement) is docs-site state and lives in the
 * docs app (`apps/docs/lib/preview-manifest.ts`), not in the published kit.
 */

export type ExampleScript =
  | "embla"
  | "reveal"
  | "carousel"
  | "lightbox"
  | "password"
  | "tabs"
  | "toaster";

/**
 * Emitted script files (relative to the package `src/` root) that implement each
 * web-component script id. This is the single mapping from script ids to files
 * on disk — consumers (like the docs "JS" tab) resolve these against the
 * package's `src/` directory. Entries list dependencies first (`lightbox` needs
 * `carousel.js` loaded before `lightbox.js`).
 */
export const WEB_COMPONENT_SCRIPT_FILES: Partial<Record<ExampleScript, string[]>> = {
  carousel: ["primitives/carousel/carousel.js"],
  lightbox: ["primitives/carousel/carousel.js", "primitives/lightbox/lightbox.js"],
  password: ["primitives/password-group/password-group.js"],
  tabs: ["primitives/tabs/tabs.js"],
  toaster: ["primitives/toaster/toaster.js"],
};
