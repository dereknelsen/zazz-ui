/**
 * @fileoverview Example: composing custom command actions for `<ui-command>`.
 * @description This file is a template, not part of the kit runtime — copy it
 * into your project and register your own actions. It is loaded only by the
 * `command-actions` docs example.
 *
 * Simple actions need no script at all: a navigation item is an `<a href>`,
 * and opening a dialog/popover is a `<button command commandfor>` invoker.
 * Reach for a script only when an action runs real logic. Two hooks exist:
 *
 * 1. **Custom invoker commands** — give the item `command="--your-action"`
 *    and `commandfor="<target id>"`, then listen for the `command` event on
 *    the target. The invokers polyfill re-dispatches commands in browsers
 *    with native support, so de-dupe per task (see below).
 * 2. **`zazz:command-select`** — every activation bubbles this CustomEvent
 *    from the `<ui-command>` root (`detail: { item, value }`); use it for
 *    palette-wide concerns like analytics.
 */
/**
 * @description Binds this page's custom `--command` handlers. Handlers attach
 * to the command *target* (the `commandfor` element), per the Invoker
 * Commands contract.
 */
declare function initCommandActions(): void;
/**
 * @description Logs every command activation — swap for analytics, recents
 * tracking, or any cross-cutting concern.
 */
declare function initCommandSelectLogging(): void;
export { initCommandActions, initCommandSelectLogging };
//# sourceMappingURL=command-actions.d.ts.map
