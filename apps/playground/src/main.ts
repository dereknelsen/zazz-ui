/**
 * @fileoverview Playground entry: loads the Zazz kit's behavior live from the workspace.
 * @description Behavior comes from `packages/core/src`, so edits there hot-reload
 * here without a build. Styles load from `src/zazz.css`, linked in the page head
 * so they block rendering. In dev, `<ui-debug>` audits every `style`
 * attribute and prints `[ui-debug]` warnings to the console; it is created from
 * script so the page body stays yours.
 */

import "@zazz-ui/core/index.ts";

if (import.meta.env.DEV) {
  await import("@zazz-ui/core/primitives/debug/debug.ts");
  const debug = document.createElement("ui-debug");
  debug.dataset.debugDomains = "localhost, 127.0.0.1";
  document.body.prepend(debug);
}
