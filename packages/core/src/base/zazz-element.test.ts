// @vitest-environment happy-dom
"use strict";

/**
 * @fileoverview Tests for the component runtime: the ZazzElement lifecycle
 * envelope, the guarded registration helper, and the refresh registry.
 */

import { describe, expect, it } from "vite-plus/test";
import { ZazzElement, defineZazzElement, registerRefresh, refreshAll } from "./zazz-element.ts";

class ProbeElement extends ZazzElement {
  setupCalls = 0;
  teardownCalls = 0;
  lastSignal: AbortSignal | null = null;

  protected setup(signal: AbortSignal): void {
    this.setupCalls++;
    this.lastSignal = signal;
  }

  protected teardown(): void {
    this.teardownCalls++;
  }
}

defineZazzElement("probe-element", ProbeElement);

describe("ZazzElement", () => {
  it("runs setup once per connection with a live signal", () => {
    const el = document.createElement("probe-element") as ProbeElement;
    document.body.append(el);

    expect(el.setupCalls).toBe(1);
    expect(el.lastSignal?.aborted).toBe(false);

    // A second connectedCallback (e.g. a move) must not re-run setup.
    el.connectedCallback();
    expect(el.setupCalls).toBe(1);

    el.remove();
  });

  it("aborts the signal and runs teardown on disconnect, then re-arms on reconnect", () => {
    const el = document.createElement("probe-element") as ProbeElement;
    document.body.append(el);
    const firstSignal = el.lastSignal;

    el.remove();
    expect(firstSignal?.aborted).toBe(true);
    expect(el.teardownCalls).toBe(1);

    document.body.append(el);
    expect(el.setupCalls).toBe(2);
    expect(el.lastSignal?.aborted).toBe(false);
    expect(el.lastSignal).not.toBe(firstSignal);

    el.remove();
  });
});

describe("defineZazzElement", () => {
  it("is safe to call twice for the same tag", () => {
    expect(() => defineZazzElement("probe-element", ProbeElement)).not.toThrow();
    expect(customElements.get("probe-element")).toBe(ProbeElement);
  });
});

describe("refresh registry", () => {
  it("runs every registered hook against the given scope", () => {
    const seen: Element[] = [];
    registerRefresh((scope) => seen.push(scope));
    registerRefresh((scope) => seen.push(scope));

    const scope = document.createElement("main");
    refreshAll(scope);

    expect(seen).toEqual([scope, scope]);
  });
});
