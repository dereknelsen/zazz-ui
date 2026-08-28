"use client";

import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildPreviewDocument } from "@/lib/zazz-iframe";
import type { ExampleScript } from "@zazz-ui/core/manifest";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { ExpandIcon, XIcon } from "lucide-react";

interface PreviewFrameProps {
  html: string;
  scripts?: ExampleScript[];
  /** Block-axis (vertical) placement of the demo — drives `align-content`. */
  block?: "start" | "center" | "end";
  /** Inline-axis (horizontal) placement of the demo — drives `justify-items`. */
  inline?: "start" | "center" | "end";
  minHeight?: number;
  title?: string;
  /** Show the fullscreen Expand button. Default true; the home page opts out. */
  expandable?: boolean;
}

/**
 * Renders a Zazz example inside an isolated, same-origin iframe. The iframe is the only
 * place Zazz CSS loads on the docs site, so its reset/utilities stay fully sandboxed from
 * Tailwind + fumadocs. We sync two things across the boundary: the iframe's height (to its
 * content, floored at `minHeight`) and the site's light/dark mode.
 */
export function PreviewFrame({
  html,
  scripts,
  block = "center",
  inline = "center",
  minHeight = 0,
  title = "Preview",
  expandable = true,
}: PreviewFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight || 400);
  const [fullscreen, setFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  const srcDoc = useMemo(
    () => buildPreviewDocument({ html, scripts, block, inline, minHeight }),
    [html, scripts, block, inline, minHeight],
  );

  // Reset loaded state when content changes.
  useEffect(() => {
    setLoaded(false);
  }, [srcDoc]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    let resizeObserver: ResizeObserver | undefined;

    const measure = () => {
      const doc = iframe.contentDocument;
      if (!doc?.documentElement) return;
      // html/body are overflow:clip + 100% of the iframe, so documentElement.scrollHeight
      // is the viewport — not the demo. Measure the preview grid, which can scroll.
      const preview = doc.querySelector(".zazz-preview");
      const measured = Math.ceil(preview?.scrollHeight ?? doc.documentElement.scrollHeight);
      setHeight(Math.max(measured, minHeight));
    };

    const syncTheme = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const dark = document.documentElement.classList.contains("dark");
      doc.documentElement.classList.toggle("dark", dark);
    };

    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      syncTheme();

      // Wait for all stylesheets and fonts to finish loading before revealing.
      const styleLinks = Array.from(
        doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      );
      const sheetPromises = styleLinks.map((link) =>
        link.sheet
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              link.addEventListener("load", () => resolve(), { once: true });
              link.addEventListener("error", () => resolve(), { once: true });
            }),
      );

      Promise.all([...sheetPromises, doc.fonts?.ready])
        .then(() => {
          measure();
          setLoaded(true);
        })
        .catch(() => {
          measure();
          setLoaded(true);
        });

      resizeObserver = new ResizeObserver(measure);
      const preview = doc.querySelector(".zazz-preview");
      if (preview) {
        resizeObserver.observe(preview);
        for (const child of preview.children) resizeObserver.observe(child);
      } else {
        resizeObserver.observe(doc.documentElement);
      }
      doc.querySelectorAll("img").forEach((img) => {
        if (!img.complete) img.addEventListener("load", measure, { once: true });
      });
    };

    iframe.addEventListener("load", onLoad);
    // Mirror site theme changes (next-themes toggles `.dark` on <html>).
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    // If the srcDoc already finished loading before listeners attached.
    if (iframe.contentDocument?.readyState === "complete") onLoad();

    return () => {
      iframe.removeEventListener("load", onLoad);
      resizeObserver?.disconnect();
      themeObserver.disconnect();
    };
  }, [srcDoc, minHeight]);

  const iframeEl = (
    <iframe
      ref={ref}
      title={title}
      srcDoc={srcDoc}
      loading="eager"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      className="block w-full"
      style={{ height: fullscreen ? "100%" : height, colorScheme: "normal" }}
    />
  );

  const loadingSkeleton = !loaded && (
    <div className="absolute inset-0 z-5 flex items-center justify-center bg-fd-background transition-opacity duration-300">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <span className="inline-block size-2 animate-pulse rounded-full bg-fd-muted-foreground/40 [animation-delay:0ms]" />
          <span className="inline-block size-2 animate-pulse rounded-full bg-fd-muted-foreground/40 [animation-delay:150ms]" />
          <span className="inline-block size-2 animate-pulse rounded-full bg-fd-muted-foreground/40 [animation-delay:300ms]" />
        </div>
        <span className="text-xs text-fd-muted-foreground">Loading components…</span>
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-fd-background">
        <button
          type="button"
          onClick={toggleFullscreen}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "absolute right-4 top-4 z-10 px-2 py-1 bg-fd-background shadow-xs",
          )}
          aria-label="Close fullscreen preview"
        >
          <XIcon className="size-3.5 " />
          Close
        </button>
        <div className="relative flex-1 overflow-auto">
          {loadingSkeleton}
          {iframeEl}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-clip">
      {loadingSkeleton}
      {expandable && (
        <div className="absolute right-2 bottom-2 z-10">
          <button
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "px-2 py-1 bg-fd-background shadow-xs",
            )}
            onClick={toggleFullscreen}
            aria-label="Expand preview fullscreen"
          >
            <ExpandIcon className="size-3.5 mr-1" />
            Expand
          </button>
        </div>
      )}
      {iframeEl}
    </div>
  );
}
