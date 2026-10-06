/**
 * @fileoverview The Zazz extension: starts the language server for HTML and
 * registers the editor-side features (commands, templates, decorations).
 */

import * as path from "node:path";
import type { ExtensionContext } from "vscode";
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { registerCommands } from "./commands.ts";
import { registerSwatches } from "./swatches.ts";

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  const module = context.asAbsolutePath(path.join("dist", "server.cjs"));
  const serverOptions: ServerOptions = {
    run: { module, transport: TransportKind.ipc },
    debug: {
      module,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "html" },
      { scheme: "untitled", language: "html" },
    ],
    synchronize: { configurationSection: "zazz" },
  };
  client = new LanguageClient("zazz", "Zazz", serverOptions, clientOptions);
  await client.start();
  context.subscriptions.push(...registerSwatches(client), ...registerCommands(context));
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}
