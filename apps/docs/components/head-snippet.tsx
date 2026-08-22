import { buildHead, type HeadOptions } from "@zazzdesign/ui/head";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

interface HeadSnippetProps extends HeadOptions {
  /** Wrap the block in a full `<head>…</head>` skeleton. Default false. */
  wrap?: boolean;
}

/**
 * Renders the kit's real head contract (`@zazzdesign/ui/head`) as a copyable
 * code block. The docs page that teaches head structure shows the exact output
 * of `buildHead()` — the same call the preview iframes and the kit's example
 * pages render from — so the teaching page can never drift from the contract.
 */
export function HeadSnippet({ wrap = false, ...options }: HeadSnippetProps) {
  const head = buildHead(options);
  const code = wrap
    ? `<head>\n${head
        .split("\n")
        .map((line) => (line ? `  ${line}` : line))
        .join("\n")}\n</head>`
    : head;
  return <DynamicCodeBlock lang="html" code={code} />;
}
