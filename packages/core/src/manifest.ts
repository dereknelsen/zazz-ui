/**
 * Kit facts about the web-component scripts: the ids consumers can ask for and
 * the emitted files that implement them. Presentation metadata for the docs
 * previews (iframe heights, placement) is docs-site state and lives in the
 * docs app (`apps/docs/lib/preview-manifest.ts`), not in the published kit.
 */

export type ExampleScript =
  | "autocomplete"
  | "combobox"
  | "command"
  | "command-actions"
  | "embla"
  | "reveal"
  | "carousel"
  | "checkbox"
  | "lightbox"
  | "menu"
  | "multiselect"
  | "otp"
  | "password"
  | "tabs"
  | "toaster";

/**
 * Emitted script files (relative to the package `src/` root) that implement each
 * web-component script id. This is the single mapping from script ids to files
 * on disk: consumers (like the docs "JS" tab) resolve these against the
 * package's `src/` directory. Entries list dependencies first (`lightbox` needs
 * `carousel.js` loaded before `lightbox.js`).
 */
export const WEB_COMPONENT_SCRIPT_FILES: Partial<Record<ExampleScript, string[]>> = {
  autocomplete: [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/autocomplete/autocomplete.js",
  ],
  combobox: [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/combobox/combobox.js",
  ],
  command: [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/command/command.js",
  ],
  "command-actions": [
    "base/command-score.js",
    "base/hotkeys.js",
    "base/typeahead.js",
    "primitives/command/command.js",
    "primitives/command/command-actions.js",
  ],
  carousel: ["primitives/carousel/carousel.js"],
  checkbox: ["primitives/checkbox/checkbox.js"],
  lightbox: ["primitives/carousel/carousel.js", "primitives/lightbox/lightbox.js"],
  menu: ["primitives/menu/menu.js"],
  multiselect: ["primitives/select/multiselect.js"],
  otp: ["primitives/otp/otp.js"],
  password: ["primitives/password-group/password-group.js"],
  tabs: ["primitives/tabs/tabs.js"],
  toaster: ["primitives/toaster/toaster.js"],
};
