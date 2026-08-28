"use strict";

/**
 * @fileoverview `zazz-ui init` — vendor the base platform (milestone M1).
 */

import { ZazzError } from "../errors.ts";

export async function runInit(
  _versionArg: string | undefined,
  _options: Record<string, unknown>,
  _global: Record<string, unknown>,
): Promise<void> {
  throw new ZazzError("init is not implemented yet", {
    hint: "the kit engine landed first (M0); init is milestone M1",
  });
}
