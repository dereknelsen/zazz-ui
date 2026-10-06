import { describe, expect, it } from "vite-plus/test";
import { MAX_CODE_BYTES, decodeHash, encodeCode } from "./playground-hash.ts";

describe("playground hash", () => {
  it("round-trips HTML, including non-ASCII and quotes", async () => {
    const code = '<button data-ui="button" style="--px: 6">Café → “save”</button>\n<p>日本語</p>';
    const hash = await encodeCode(code);
    expect(hash).toMatch(/^code=[A-Za-z0-9_-]+$/);
    expect(await decodeHash(`#${hash}`)).toBe(code);
    expect(await decodeHash(hash)).toBe(code);
  });

  it("is shorter than the source for real markup", async () => {
    const code = '<div data-ui="card" style="--p: 6">'.repeat(40);
    expect((await encodeCode(code)).length).toBeLessThan(code.length / 4);
  });

  it("refuses a snippet that inflates past the size limit", async () => {
    // Compress a bomb by hand (the encoder refuses to make one).
    const bomb = new Uint8Array(MAX_CODE_BYTES + 1);
    const res = new Response(
      new Blob([bomb]).stream().pipeThrough(new CompressionStream("deflate-raw")),
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    const hash = `#code=${btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    expect(await decodeHash(hash)).toBeNull();
    await expect(encodeCode("x".repeat(MAX_CODE_BYTES + 1))).rejects.toThrow(/size limit/);
  });

  it("returns null for a missing or corrupt hash", async () => {
    expect(await decodeHash("")).toBeNull();
    expect(await decodeHash("#other=1")).toBeNull();
    expect(await decodeHash("#code=!!!not-base64!!!")).toBeNull();
  });
});
