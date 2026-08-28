import { cn } from "@/lib/cn";

interface TemplateFrameProps {
  /** Path to the served template page, e.g. `/zazz/examples/layout.html`. */
  src: string;
  /** Accessible frame title, shown in the toolbar. */
  title: string;
  /** Frame height in pixels. Full pages want room; default 720. */
  height?: number;
  className?: string;
}

/**
 * Embeds one of the kit's full-page example templates (served raw at
 * `/zazz/examples/*`) in a framed, lazily loaded iframe with an escape hatch
 * to the real page. Complements `<Preview>`, which renders single component
 * fragments — this one is for whole documents.
 */
export function TemplateFrame({ src, title, height = 720, className }: TemplateFrameProps) {
  return (
    <figure
      className={cn("not-prose my-6 overflow-hidden rounded-lg border bg-fd-background", className)}
    >
      <figcaption className="flex items-center justify-between gap-4 border-b bg-fd-muted/50 px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full border bg-fd-muted" />
            <span className="size-2.5 rounded-full border bg-fd-muted" />
            <span className="size-2.5 rounded-full border bg-fd-muted" />
          </span>
          {title}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-fd-primary hover:underline"
        >
          Open full page ↗
        </a>
      </figcaption>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        className="w-full border-0"
        style={{ height }}
      />
    </figure>
  );
}
