"use strict";

/**
 * @fileoverview Checkbox select-all groups.
 * @description Derives a select-all checkbox's tri-state from its members.
 * A controller declares `data-checkbox-controls="<name>"` and manages every
 * checkbox sharing that `name` within the same form (or the document when
 * unassociated). Checking the controller checks or unchecks all members;
 * member changes roll back up as checked (all), unchecked (none), or
 * indeterminate (a subset) — the mixed state is the JS-only `indeterminate`
 * property (the platform has no content attribute for it), painted by
 * `:indeterminate` in checkbox.css. Members inside a `<tr>` reflect their
 * state as `data-state="selected"` on the row, lighting up the table
 * primitive's selected-row styling.
 *
 * State follows the kit's signals division of labor (`base/signals.ts`): the
 * delegated change listener is the input adapter writing member states into
 * `state`; `deriveTriState` is the pure derived logic under `computed`; one
 * `effect` per group writes the controller property and row attributes back
 * to the DOM, batched to a microtask.
 *
 * @example
 * <table class="ui-table">
 *   <thead><tr><th><input type="checkbox" data-checkbox-controls="tasks" /></th>...</tr></thead>
 *   <tbody><tr><td><input type="checkbox" name="tasks" /></td>...</tr></tbody>
 * </table>
 */

import { computed, effect, state } from "../../base/signals.ts";
import { registerRefresh } from "../../base/zazz-element.ts";

const CONTROLS_ATTR = "data-checkbox-controls";

// --- Pure derived logic ---

/** The tri-state a select-all controller derives from its members. */
type TriState = "all" | "some" | "none";

/**
 * @description Derives a controller's tri-state from its members' checked
 * states: `"all"` when every member is checked (and there is at least one),
 * `"none"` when none are, `"some"` for a subset.
 *
 * @param checked - Each member's checked state.
 * @returns The derived tri-state.
 */
function deriveTriState(checked: readonly boolean[]): TriState {
  const count = checked.filter(Boolean).length;
  if (count === 0) return "none";
  return count === checked.length ? "all" : "some";
}

// --- Group discovery ---

/**
 * @description Collects the member checkboxes a controller manages: every
 * checkbox sharing the controlled `name` in the controller's form, or in the
 * document when the controller has no form.
 *
 * @param controller - The select-all checkbox.
 * @returns The managed member checkboxes (never the controller itself).
 * @private
 */
function membersOf(controller: HTMLInputElement): HTMLInputElement[] {
  const name = controller.getAttribute(CONTROLS_ATTR);
  if (!name) return [];
  const scope: ParentNode = controller.form ?? controller.ownerDocument;
  const inputs = scope.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  return Array.from(inputs).filter((input) => input.name === name && input !== controller);
}

/**
 * @description Finds the controller managing a member checkbox, if any.
 *
 * @param member - A checkbox that may belong to a select-all group.
 * @returns The controller, or null when the checkbox is unmanaged.
 * @private
 */
function controllerOf(member: HTMLInputElement): HTMLInputElement | null {
  if (!member.name) return null;
  const scope: ParentNode = member.form ?? member.ownerDocument;
  const controllers = scope.querySelectorAll<HTMLInputElement>(
    `input[type="checkbox"][${CONTROLS_ATTR}]`,
  );
  for (const controller of controllers) {
    if (controller.getAttribute(CONTROLS_ATTR) === member.name && controller !== member) {
      return controller;
    }
  }
  return null;
}

// --- Reactive groups ---

/** A live select-all group: the member-state signal and its effect disposer. */
interface Group {
  /** Each member's checked state, recounted from the DOM (input adapter writes here). */
  members: ReturnType<typeof state<boolean[]>>;
  /** Disposes the group's DOM-writing effect. */
  dispose: () => void;
}

/** Live groups keyed by controller; pruned in `initCheckboxes`. */
const groups = new Map<HTMLInputElement, Group>();

/**
 * @description Reads members' checked states from the DOM into a group's
 * signal. The DOM stays the source of truth for the element list.
 *
 * @param controller - The group's select-all checkbox.
 * @private
 */
function recount(controller: HTMLInputElement): void {
  groups.get(controller)?.members.set(membersOf(controller).map((member) => member.checked));
}

/**
 * @description Creates the reactive group for a controller: a member-state
 * signal, the pure tri-state derivation, and one effect writing the
 * controller's `checked`/`indeterminate` and each member row's
 * `data-state="selected"` back to the DOM. The effect's first run is
 * immediate; re-runs batch to a microtask.
 *
 * @param controller - The select-all checkbox.
 * @private
 */
function createGroup(controller: HTMLInputElement): void {
  const members = state(membersOf(controller).map((member) => member.checked));
  const tri = computed(() => deriveTriState(members.get()));

  const dispose = effect(() => {
    const derived = tri.get();
    const checked = members.get();
    controller.checked = derived === "all";
    controller.indeterminate = derived === "some";
    membersOf(controller).forEach((member, index) => {
      const row = member.closest("tr");
      if (!row) return;
      if (checked[index]) {
        row.setAttribute("data-state", "selected");
      } else if (row.getAttribute("data-state") === "selected") {
        row.removeAttribute("data-state");
      }
    });
  });

  groups.set(controller, { members, dispose });
}

/**
 * @description Delegated change handler (input adapter): a controller change
 * fans out to its members imperatively then writes the group signal once; a
 * member change recounts its group.
 *
 * @param event - The change event.
 * @private
 */
function onChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

  if (target.hasAttribute(CONTROLS_ATTR)) {
    if (!groups.has(target)) createGroup(target);
    for (const member of membersOf(target)) member.checked = target.checked;
    recount(target);
    return;
  }

  const controller = controllerOf(target);
  if (!controller) return;
  if (!groups.has(controller)) createGroup(controller);
  recount(controller);
}

// --- Init ---

/**
 * @description Initializes select-all groups in a scope: prunes groups whose
 * controllers left the DOM (disposing their effects), creates groups for new
 * controllers, and recounts existing ones. Idempotent: re-running is a no-op.
 *
 * @param scope - Root to scan; defaults to the whole document.
 */
function initCheckboxes(scope: ParentNode = document): void {
  for (const [controller, group] of groups) {
    if (!controller.isConnected) {
      group.dispose();
      groups.delete(controller);
    }
  }

  const controllers = scope.querySelectorAll<HTMLInputElement>(
    `input[type="checkbox"][${CONTROLS_ATTR}]`,
  );
  for (const controller of controllers) {
    if (groups.has(controller)) {
      recount(controller);
    } else {
      createGroup(controller);
    }
  }
}

// Auto-initialize when DOM is ready (only in browser environment)
if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initCheckboxes());
  } else {
    initCheckboxes();
  }

  // Delegate at document level so groups work wherever checkboxes appear.
  document.addEventListener("change", onChange);

  // After a SPA <main> swap, re-scan the new content.
  registerRefresh(initCheckboxes);
}

export { deriveTriState, initCheckboxes };
