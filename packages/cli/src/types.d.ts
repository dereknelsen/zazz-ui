/**
 * Ambient declarations for untyped dependencies. `@npmcli/config` ships no
 * types; only the surface the CLI touches is declared.
 */
declare module "@npmcli/config" {
  interface ConfigOptions {
    definitions: Record<string, unknown>;
    shorthands?: Record<string, unknown>;
    flatten?: (obj: Record<string, unknown>, flat: Record<string, unknown>) => void;
    npmPath: string;
    argv?: string[];
    cwd?: string;
    env?: Record<string, string | undefined>;
  }

  export default class Config {
    constructor(options: ConfigOptions);
    load(): Promise<void>;
    readonly flat: Record<string, unknown>;
  }
}

declare module "@npmcli/config/lib/definitions/index.js" {
  export const definitions: Record<string, unknown>;
  export const shorthands: Record<string, unknown>;
  export function flatten(obj: Record<string, unknown>, flat: Record<string, unknown>): void;
}
