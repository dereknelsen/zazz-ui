import { cn } from "@/lib/cn";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PreviewFrame } from "@/components/preview-frame";
import { getExampleMeta } from "@/lib/preview-manifest";
import { readExample } from "@/lib/zazz-assets";

interface HomeDemoProps {
  /** Example id like `button/button` — reads src/primitives/button/button.html in @zazz-ui/core. */
  src: string;
  /** One-line markup excerpt shown under the demo, quoted from the example source. */
  caption: string;
  /** Overrides the manifest's minHeight for this card. */
  minHeight?: number;
  className?: string;
}

/**
 * A home page demo card: the component's name linking to its docs page, the live
 * example in an isolated iframe, and the markup it takes. Reads the same example
 * source and manifest metadata as the docs' `<Preview>`.
 */
export function HomeDemo({ src, caption, minHeight, className }: HomeDemoProps) {
  const html = readExample(src);
  if (html == null) return null;

  const meta = getExampleMeta(src);
  const component = src.split("/")[0];

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-fd-card", className)}>
      <div className="flex items-center justify-between border-b px-3.5 py-2">
        <Link
          href={`/docs/components/${component}`}
          className="group inline-flex items-center gap-1 font-mono text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground"
        >
          <span>{component}</span>
          <ArrowUpRight
            className="size-3 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </Link>
      </div>
      <PreviewFrame
        html={html}
        scripts={meta?.requiresScripts}
        block={meta?.block ?? "center"}
        inline={meta?.inline ?? "center"}
        minHeight={minHeight ?? meta?.minHeight}
        title={src}
        expandable={false}
      />
      <div className="overflow-x-auto border-t px-3.5 py-2 font-mono text-xs whitespace-nowrap text-fd-muted-foreground">
        {caption}
      </div>
    </div>
  );
}
