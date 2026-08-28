import { readExample, readComponentCss, readComponentJs } from "@/lib/zazz-assets";
import { getExampleMeta } from "@/lib/preview-manifest";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { cn } from "@/lib/cn";
import { Tab, Tabs } from "./tabs";
import { PreviewFrame } from "./preview-frame";

interface PreviewProps {
  /** Example id like `button/variants` — reads src/primitives/button/variants.html in @zazz-ui/core. */
  src: string;
  className?: string;
}

/**
 * The single MDX entry point for a live primitive demo. Reads one vanilla-HTML
 * example from the centralized `@zazz-ui/core` source and renders it two ways
 * from that one string: a live, isolated iframe preview and the exact code
 * block. No second copy can drift.
 */
export function Preview({ src, className }: PreviewProps) {
  const html = readExample(src);

  if (html == null) {
    return (
      <div className="not-prose rounded-md border border-fd-destructive/40 bg-fd-destructive/5 p-4 text-sm text-fd-destructive">
        Example <code>{src}</code> not found in <code>@zazz-ui/core</code>.
      </div>
    );
  }

  const meta = getExampleMeta(src);
  const css = readComponentCss(src);
  const js = readComponentJs(meta?.requiresScripts);
  const tabItems = ["Preview", "HTML", js && "JS", css && "CSS"].filter(Boolean) as string[];

  return (
    <Tabs items={tabItems} className={cn("not-prose my-6", className)}>
      <Tab value="Preview">
        <div className="overflow-hidden rounded-md border bg-fd-background">
          <PreviewFrame
            html={html}
            scripts={meta?.requiresScripts}
            block={meta?.block ?? "center"}
            inline={meta?.inline ?? "center"}
            minHeight={meta?.minHeight}
            title={meta?.title ?? src}
          />
        </div>
      </Tab>
      <Tab value="HTML">
        <DynamicCodeBlock lang="html" code={html} />
      </Tab>
      {js && (
        <Tab value="JS">
          <DynamicCodeBlock lang="js" code={js} />
        </Tab>
      )}
      {css && (
        <Tab value="CSS">
          <DynamicCodeBlock lang="css" code={css} />
        </Tab>
      )}
    </Tabs>
  );
}
