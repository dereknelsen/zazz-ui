/**
 * The install block on a primitive page: the `zazz-ui add` command per package
 * manager, and the primitives that command pulls in. The dependency list comes
 * from the kit's own `resolveClosure`, the function the CLI calls, so the page
 * can never say something different from what `add` does.
 */
import { PRIMITIVES, resolveClosure } from "@zazz-ui/core/manifest.ts";

export const PACKAGE_MANAGERS = [
  { id: "pnpm", run: "pnpm dlx" },
  { id: "npm", run: "npx" },
  { id: "yarn", run: "yarn dlx" },
  { id: "bun", run: "bunx" },
] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number]["id"];

export interface InstallApi {
  /** One `zazz-ui add <name>` command per package manager. */
  commands: { id: PackageManager; command: string }[];
  /** The primitives `add` also vendors, in cascade order, the primitive itself left out. */
  dependencies: string[];
}

export function installApi(name: string): InstallApi {
  if (!(name in PRIMITIVES)) throw new Error(`installApi: "${name}" is not a primitive`);
  return {
    commands: PACKAGE_MANAGERS.map(({ id, run }) => ({
      id,
      command: `${run} zazz-ui add ${name}`,
    })),
    dependencies: resolveClosure([name]).filter((dep) => dep !== name),
  };
}
