/**
 * @fileoverview The Zazz extension: starts the language server for HTML (and
 * the templating languages `zazz.languages` lists) and registers the
 * editor-side features (commands, templates, decorations).
 */

import * as path from "node:path";
import { commands, workspace, type ExtensionContext } from "vscode";
import {
  LanguageClient,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions,
} from "vscode-languageclient/node";
import { registerCommands } from "./commands.ts";
import { registerSwatches } from "./swatches.ts";

let client: LanguageClient | undefined;

/** The language ids the features run in (`zazz.languages`, default `["html"]`). */
export function configuredLanguages(): string[] {
  const configured = workspace.getConfiguration("zazz").get<string[]>("languages") ?? ["html"];
  const languages = configured.filter((id) => typeof id === "string" && id.trim() !== "");
  return languages.length ? [...new Set(languages)] : ["html"];
}

/**
 * Publishes the language list as the `zazz.languages` context key, so a
 * `when` or `enablement` clause can test `editorLangId in zazz.languages`.
 */
function publishLanguages(): void {
  void commands.executeCommand("setContext", "zazz.languages", configuredLanguages());
}

function createClient(context: ExtensionContext): LanguageClient {
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
    documentSelector: configuredLanguages().flatMap((language) => [
      { scheme: "file", language },
      { scheme: "untitled", language },
    ]),
    synchronize: { configurationSection: "zazz" },
  };
  return new LanguageClient("zazz", "Zazz", serverOptions, clientOptions);
}

export async function activate(context: ExtensionContext): Promise<void> {
  publishLanguages();
  client = createClient(context);
  await client.start();
  context.subscriptions.push(
    ...registerSwatches(() => client, configuredLanguages),
    ...registerCommands(context),
    // The document selector is fixed at start: a new language list needs a new client.
    workspace.onDidChangeConfiguration(async (event) => {
      if (!event.affectsConfiguration("zazz.languages")) return;
      publishLanguages();
      await client?.stop();
      client = createClient(context);
      await client.start();
    }),
  );
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}
