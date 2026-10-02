import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants } from "node:zlib";
import { defineConfig, type Plugin } from "vite-plus";

/** The kit's sources, imported live from the workspace. */
const CORE_SRC = fileURLToPath(new URL("../../packages/core/src/", import.meta.url));
const APP_ROOT = fileURLToPath(new URL("./", import.meta.url));

/**
 * Full page reload on every change to the playground's pages or the kit's
 * sources. Vite's in-place CSS swap of the ~90 files behind the kit stylesheet
 * can lag or miss an edit, and the kit's `[style*=]` gates fail silently when
 * it does; a full reload always shows the current state. Edits arriving within
 * the debounce window (an editor's double write, a multi-file save) fold into
 * one reload.
 */
function reloadOnChange(debounceMs = 60): Plugin {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const relevant = (file: string) =>
    (file.startsWith(CORE_SRC) && /\.(css|ts|html)$/.test(file) && !file.endsWith(".test.ts")) ||
    (file.startsWith(APP_ROOT) &&
      !file.includes("/node_modules/") &&
      /\.(css|ts|html)$/.test(file));
  return {
    name: "playground:reload-on-change",
    apply: "serve",
    configureServer(server) {
      // Files outside the app root are otherwise only watched once served.
      server.watcher.add(CORE_SRC);
    },
    hotUpdate({ file, server }) {
      if (!relevant(file)) return;
      clearTimeout(timer);
      timer = setTimeout(() => server.ws.send({ type: "full-reload", path: "*" }), debounceMs);
      return []; // skip the in-place update; the reload replaces it
    },
  };
}

/**
 * Serves stylesheets Brotli-compressed, as a CDN would, so DevTools' Network
 * panel shows the real transfer size next to the raw size. Only `text/css`
 * responses, and only when the request's `Accept-Encoding` lists `br`; quality
 * 11 matches static pre-compression. Runs in dev and in `vp preview` (the
 * production build). Each compressed response is logged with both sizes.
 */
function brotliCss(): Plugin {
  const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!/\bbr\b/.test(String(req.headers["accept-encoding"] ?? ""))) return next();
    // this middleware encodes; keep preview's own gzip from encoding the same bytes
    req.headers["accept-encoding"] = "identity";
    const chunks: Buffer[] = [];
    const write = res.write.bind(res);
    const end = res.end.bind(res);
    const writeHead = res.writeHead.bind(res);
    const isCss = () => String(res.getHeader("content-type") ?? "").includes("text/css");
    // sirv (preview) sends its headers with writeHead before streaming; keep them
    // unsent so the encoding and length can still change at the end
    res.writeHead = ((status: number, ...rest: unknown[]) => {
      res.statusCode = status;
      const headers = rest.find((arg) => typeof arg === "object" && arg !== null);
      for (const [name, value] of Object.entries((headers ?? {}) as Record<string, string>))
        res.setHeader(name, value);
      // Node's end() also calls writeHead to send the status line: let everything
      // but a stylesheet through now; a stylesheet's goes out with its body below
      return isCss() ? res : writeHead(status);
    }) as typeof res.writeHead;
    res.write = ((chunk: unknown, ...rest: unknown[]) => {
      if (!isCss()) return (write as (...args: unknown[]) => boolean)(chunk, ...rest);
      if (chunk) chunks.push(Buffer.from(chunk as Buffer));
      return true;
    }) as typeof res.write;
    res.end = ((chunk?: unknown, ...rest: unknown[]) => {
      if (!isCss()) return (end as (...args: unknown[]) => ServerResponse)(chunk, ...rest);
      if (chunk && typeof chunk !== "function") chunks.push(Buffer.from(chunk as Buffer));
      res.writeHead = writeHead;
      const raw = Buffer.concat(chunks);
      if (raw.length === 0 || res.statusCode === 304) return end();
      const body = brotliCompressSync(raw, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      });
      res.setHeader("Content-Encoding", "br");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Length", body.length);
      console.log(`[brotli] ${req.url}: ${kb(raw.length)} raw, ${kb(body.length)} br`);
      return end(body);
    }) as typeof res.end;
    next();
  };
  return {
    name: "playground:brotli-css",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  // Plain pages, not a single-page app: a missing file is a 404 instead of
  // index.html (Lighthouse read the SPA fallback as an 87-line robots.txt).
  appType: "mpa",
  plugins: [reloadOnChange(), brotliCss()],
});
