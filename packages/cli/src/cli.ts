#!/usr/bin/env node
"use strict";

/**
 * @fileoverview `zazz-ui` — vendor Zazz primitives into your project.
 * @description Thin commander program: parses flags, hands off to command
 * modules, and renders `ZazzError`s at the boundary. All behavior lives in
 * the command modules and the deep seams they call (kit, config, plan,
 * vendor, wiring, transaction).
 */

import { createRequire } from "node:module";
import chalk from "chalk";
import { Command, Option } from "commander";
import { ZazzError } from "./errors.ts";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command("zazz-ui")
  .description("Vendor Zazz Design Framework primitives into your project")
  .version(version)
  .option("-c, --cwd <path>", "run as if started in <path>", process.cwd())
  .option("-y, --yes", "answer prompts with their defaults; never block")
  .option("--silent", "no output except errors")
  .option("--registry <url>", "npm registry override")
  .option("--offline", "cache only; never touch the network")
  .option("--prefer-offline", "use cached data without revalidating");

program
  .command("init")
  .description("vendor the Zazz base (tokens, reset, runtime) into this project")
  .argument("[version]", "kit version, @-prefixed (e.g. @0.1.0); default latest")
  .option("--dir <path>", "target directory for vendored files", "zazz")
  .option("--ts", "vendor TypeScript sources instead of compiled .js")
  .option("--legacy <path>", "wire an existing stylesheet into the legacy cascade layer")
  .option("--no-fonts", "omit the Geist fonts block from head.html")
  .option("--no-theme-script", "omit the theme-persistence script from head.html")
  .option("--force", "overwrite existing files without asking")
  .option("--dry-run", "print the plan without writing")
  .action(async (versionArg: string | undefined, options: unknown) => {
    const { runInit } = await import("./commands/init.ts");
    type InitParams = Parameters<typeof runInit>;
    await runInit(versionArg, options as InitParams[1], program.opts() as InitParams[2]);
  });

program
  .command("update")
  .description("move vendored files to a new kit version with 3-way merges")
  .argument(
    "[args...]",
    "target version @-prefixed (default @latest) and/or primitive names to narrow to",
  )
  .addOption(
    new Option("--keep", "resolve every conflict by keeping your version").conflicts([
      "theirs",
      "markers",
    ]),
  )
  .addOption(
    new Option("--theirs", "resolve every conflict by taking the new version").conflicts([
      "keep",
      "markers",
    ]),
  )
  .addOption(
    new Option("--markers", "write diff3 conflict markers for every conflict").conflicts([
      "keep",
      "theirs",
    ]),
  )
  .option("--force", "overwrite stray files without asking")
  .option("--dry-run", "print the plan without writing")
  .action(async (args: string[], options: unknown) => {
    const { runUpdate } = await import("./commands/update.ts");
    type UpdateParams = Parameters<typeof runUpdate>;
    await runUpdate(args, options as UpdateParams[1], program.opts() as UpdateParams[2]);
  });

program
  .command("diff")
  .description("preview what an update would change (read-only)")
  .argument(
    "[args...]",
    "target version @-prefixed (default @latest) and/or names to narrow to (base, button, …)",
  )
  .option("--upstream", "compare pristine recorded vs target instead of your files vs target")
  .action(async (args: string[], options: unknown) => {
    const { runDiff } = await import("./commands/diff.ts");
    type DiffParams = Parameters<typeof runDiff>;
    await runDiff(args, options as DiffParams[1], program.opts() as DiffParams[2]);
  });

program
  .command("add")
  .description("vendor primitives (and their dependencies) at the project's kit version")
  .argument("<primitive...>", "primitive names (e.g. button combobox)")
  .option("--examples", "also copy the primitives' example html")
  .option("--force", "overwrite existing files without asking")
  .option("--dry-run", "print the closure and file plan without writing")
  .action(async (names: string[], options: unknown) => {
    const { runAdd } = await import("./commands/add.ts");
    type AddParams = Parameters<typeof runAdd>;
    await runAdd(names, options as AddParams[1], program.opts() as AddParams[2]);
  });

try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof ZazzError) {
    console.error(chalk.red(`✖ ${error.message}`));
    if (error.hint) console.error(chalk.dim(`  ${error.hint}`));
    process.exitCode = error.exitCode;
  } else {
    throw error;
  }
}
