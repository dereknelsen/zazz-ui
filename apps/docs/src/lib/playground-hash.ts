/**
 * How a docs preview opens the playground with its example: the HTML, deflated
 * and base64url encoded into `#code=…`. Pure Web APIs (`CompressionStream`), so it runs in
 * the browser and at build time alike.
 */

const PARAM = "code";

/** Largest snippet the playground accepts, in bytes; deflate inflates ~1000:1, so a hash must not become a tab-hanging buffer. */
export const MAX_CODE_BYTES = 256 * 1024;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  limit = Infinity,
): Promise<Uint8Array> {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new RangeError("playground: snippet exceeds the size limit");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** Compresses `code` to the hash value (without `#`). */
export async function encodeCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code);
  if (bytes.byteLength > MAX_CODE_BYTES)
    throw new RangeError("playground: snippet exceeds the size limit");
  const deflated = await pipe(bytes, new CompressionStream("deflate-raw"));
  return `${PARAM}=${toBase64Url(deflated)}`;
}

/** Reads the code out of a hash (`#code=…` or `code=…`); null when absent or corrupt. */
export async function decodeHash(hash: string): Promise<string | null> {
  const match = hash.replace(/^#/, "").match(new RegExp(`(?:^|&)${PARAM}=([^&]+)`));
  if (!match) return null;
  try {
    const inflated = await pipe(
      fromBase64Url(match[1]),
      new DecompressionStream("deflate-raw"),
      MAX_CODE_BYTES,
    );
    return new TextDecoder().decode(inflated);
  } catch {
    return null;
  }
}
