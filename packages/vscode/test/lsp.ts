/**
 * @fileoverview A minimal LSP client over stdio for testing the bundled
 * server (`dist/server.cjs`) the way an editor drives it.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  StreamMessageReader,
  StreamMessageWriter,
  createMessageConnection,
  type MessageConnection,
} from "vscode-jsonrpc/node";

export const SERVER = fileURLToPath(new URL("../dist/server.cjs", import.meta.url));

export interface Session {
  connection: MessageConnection;
  /** Resolves with the next diagnostics published for `uri`. */
  diagnostics(
    uri: string,
  ): Promise<{ range: unknown; message: string; code: string; data?: unknown }[]>;
  open(uri: string, text: string, languageId?: string): void;
  change(uri: string, version: number, text: string): void;
  close(): Promise<void>;
}

export async function startSession(settings: Record<string, unknown> = {}): Promise<Session> {
  const child: ChildProcess = spawn(process.execPath, [SERVER, "--stdio"], { stdio: "pipe" });
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout!),
    new StreamMessageWriter(child.stdin!),
  );
  const waiting = new Map<string, ((diagnostics: never[]) => void)[]>();
  connection.onNotification("textDocument/publishDiagnostics", ({ uri, diagnostics }) => {
    const queue = waiting.get(uri);
    queue?.shift()?.(diagnostics);
  });
  connection.onRequest("workspace/configuration", ({ items }: { items: { section: string }[] }) =>
    items.map(() => settings),
  );
  connection.listen();
  await connection.sendRequest("initialize", {
    processId: process.pid,
    rootUri: null,
    capabilities: { workspace: { configuration: true } },
  });
  await connection.sendNotification("initialized", {});
  return {
    connection,
    diagnostics: (uri) =>
      new Promise((resolve) => {
        const queue = waiting.get(uri) ?? [];
        queue.push(resolve as never);
        waiting.set(uri, queue);
      }),
    open: (uri, text, languageId = "html") =>
      void connection.sendNotification("textDocument/didOpen", {
        textDocument: { uri, languageId, version: 1, text },
      }),
    change: (uri, version, text) =>
      void connection.sendNotification("textDocument/didChange", {
        textDocument: { uri, version },
        contentChanges: [{ text }],
      }),
    close: async () => {
      await connection.sendRequest("shutdown");
      await connection.sendNotification("exit");
      connection.dispose();
      child.kill();
    },
  };
}
