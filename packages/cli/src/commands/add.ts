"use strict";

/**
 * @fileoverview `zazz-ui add` — vendor primitives + dependencies (milestone M2).
 */

import { ZazzError } from "../errors.ts";

export async function runAdd(
  _names: string[],
  _options: Record<string, unknown>,
  _global: Record<string, unknown>,
): Promise<void> {
  throw new ZazzError("add is not implemented yet", {
    hint: "init lands first (M1); add is milestone M2",
  });
}
