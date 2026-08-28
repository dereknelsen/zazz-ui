"use strict";

/**
 * @fileoverview Tests for the TC39 Signals wrapper (`base/signals.ts`).
 */

import { describe, expect, it } from "vite-plus/test";
import { computed, effect, state } from "./signals.ts";

/**
 * @description Yields a macrotask so the watcher's microtask-batched re-runs
 * have flushed before assertions.
 */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("state", () => {
  it("round-trips values through get/set", () => {
    const count = state(1);
    expect(count.get()).toBe(1);
    count.set(2);
    expect(count.get()).toBe(2);
  });
});

describe("computed", () => {
  it("derives from state and recomputes on change", () => {
    const count = state(2);
    const doubled = computed(() => count.get() * 2);
    expect(doubled.get()).toBe(4);
    count.set(5);
    expect(doubled.get()).toBe(10);
  });

  it("caches until a dependency changes", () => {
    let runs = 0;
    const count = state(1);
    const derived = computed(() => {
      runs++;
      return count.get() + 1;
    });
    derived.get();
    derived.get();
    expect(runs).toBe(1);
    count.set(2);
    derived.get();
    expect(runs).toBe(2);
  });
});

describe("effect", () => {
  it("runs immediately and re-runs after a tracked write", async () => {
    const count = state(0);
    const seen: number[] = [];
    using _dispose = effect(() => {
      seen.push(count.get());
    });
    expect(seen).toEqual([0]);

    count.set(1);
    await flush();
    expect(seen).toEqual([0, 1]);
  });

  it("batches multiple writes in one task into one re-run", async () => {
    const count = state(0);
    let runs = 0;
    using _dispose = effect(() => {
      count.get();
      runs++;
    });
    expect(runs).toBe(1);

    count.set(1);
    count.set(2);
    count.set(3);
    await flush();
    expect(runs).toBe(2);
    expect(count.get()).toBe(3);
  });

  it("runs cleanup before each re-run and on dispose", async () => {
    const count = state(0);
    const log: string[] = [];
    const dispose = effect(() => {
      const value = count.get();
      log.push(`run:${value}`);
      return () => log.push(`cleanup:${value}`);
    });

    count.set(1);
    await flush();
    expect(log).toEqual(["run:0", "cleanup:0", "run:1"]);

    dispose();
    expect(log).toEqual(["run:0", "cleanup:0", "run:1", "cleanup:1"]);
  });

  it("stops re-running after dispose, and dispose is idempotent", async () => {
    const count = state(0);
    let runs = 0;
    const dispose = effect(() => {
      count.get();
      runs++;
    });

    dispose();
    dispose();
    count.set(1);
    await flush();
    expect(runs).toBe(1);
  });

  it("disposes when the provided AbortSignal aborts", async () => {
    const count = state(0);
    const controller = new AbortController();
    let runs = 0;
    effect(
      () => {
        count.get();
        runs++;
      },
      { signal: controller.signal },
    );

    count.set(1);
    await flush();
    expect(runs).toBe(2);

    controller.abort();
    count.set(2);
    await flush();
    expect(runs).toBe(2);
  });

  it("tracks computed dependencies through the graph", async () => {
    const expanded = state(false);
    const hidden = state(false);
    const paused = computed(() => expanded.get() || hidden.get());
    const seen: boolean[] = [];
    using _dispose = effect(() => {
      seen.push(paused.get());
    });

    expanded.set(true);
    await flush();
    hidden.set(true); // paused stays true — equals() suppresses the re-run
    await flush();
    expanded.set(false);
    hidden.set(false);
    await flush();

    expect(seen).toEqual([false, true, false]);
  });

  it("disposes at scope exit when bound with `using`", async () => {
    const count = state(0);
    let runs = 0;

    {
      using _dispose = effect(() => {
        count.get();
        runs++;
      });
      expect(runs).toBe(1);
    }

    count.set(1);
    await flush();
    expect(runs).toBe(1);
  });
});
