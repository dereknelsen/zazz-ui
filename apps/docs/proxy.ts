import { NextRequest, NextResponse } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { docsContentRoute, docsRoute } from "@/lib/shared";

// Kept whole rather than destructured — `rewrite` is a method, and pulling it
// off the matcher unbinds its `this`.
const docsMatcher = rewritePath(`${docsRoute}{/*path}`, `${docsContentRoute}{/*path}/content.md`);
const suffixMatcher = rewritePath(
  `${docsRoute}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);

export default function proxy(request: NextRequest) {
  const result = suffixMatcher.rewrite(request.nextUrl.pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const result = docsMatcher.rewrite(request.nextUrl.pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
}
