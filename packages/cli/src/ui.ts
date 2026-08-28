"use strict";

/**
 * @fileoverview The CLI's voice: clack prompts and spinners behind one
 * injectable interface.
 * @description Commands talk to `Ui`, never to @clack/prompts directly, so
 * `--silent`, `-y`, and non-TTY environments degrade in one place and tests
 * inject a scripted prompter. Happy paths never prompt (ticket 01); every
 * prompt is a conflict with a safe non-interactive default.
 */

import * as clack from "@clack/prompts";
import chalk from "chalk";

export interface Ui {
  /** True when prompts can actually be asked. */
  readonly interactive: boolean;
  intro(title: string): void;
  outro(message: string): void;
  step(message: string): void;
  warn(message: string): void;
  spinner<T>(label: string, work: () => Promise<T>, done?: (result: T) => string): Promise<T>;
  /** Asks, or returns `fallback` when not interactive. */
  confirm(message: string, fallback: boolean): Promise<boolean>;
}

export interface UiOptions {
  silent: boolean;
  /** -y/--yes: never block; prompts resolve to their fallback. */
  yes: boolean;
  /** Overridable for tests; defaults to stdout being a TTY. */
  interactive?: boolean;
}

export function createUi(options: UiOptions): Ui {
  const interactive =
    !options.silent && !options.yes && (options.interactive ?? process.stdout.isTTY === true);
  const quiet = options.silent;

  return {
    interactive,
    intro(title) {
      if (quiet) return;
      if (interactive) clack.intro(chalk.inverse(` ${title} `));
      else console.log(title);
    },
    outro(message) {
      if (quiet) return;
      if (interactive) clack.outro(message);
      else console.log(message);
    },
    step(message) {
      if (quiet) return;
      if (interactive) clack.log.step(message);
      else console.log(message);
    },
    warn(message) {
      if (quiet) return;
      if (interactive) clack.log.warn(message);
      else console.warn(message);
    },
    async spinner(label, work, done) {
      if (!interactive) {
        const result = await work();
        if (!quiet && done) console.log(done(result));
        return result;
      }
      const spin = clack.spinner();
      spin.start(label);
      try {
        const result = await work();
        spin.stop(done ? done(result) : label);
        return result;
      } catch (error) {
        spin.stop(chalk.red(label));
        throw error;
      }
    },
    async confirm(message, fallback) {
      if (!interactive) return fallback;
      const answer = await clack.confirm({ message, initialValue: fallback });
      if (clack.isCancel(answer)) {
        clack.cancel("Cancelled — nothing was written.");
        process.exit(1);
      }
      return answer;
    },
  };
}
