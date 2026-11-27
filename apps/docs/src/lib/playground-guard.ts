/**
 * Keeps the playground preview on its own document. The frame's sandbox already
 * blocks popups and top-level navigation, but a link, a form, or a script could
 * still navigate the frame itself: away to a 404, or (for `href="#id"`, which a
 * srcdoc document resolves against the playground's URL) into a copy of the
 * playground. This guard runs first in the preview's head and cancels those.
 *
 * `guardNavigation` is serialized into the preview with `Function#toString`, so
 * it must stay self-contained: no imports, no references outside its body.
 */
export function guardNavigation(win: Window): void {
  const toAnchor = (href: string): void => {
    let id = href.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // not valid percent-encoding (`#50%`): the id is the text as written
    }
    if (!id || id === "top") win.scrollTo(0, 0);
    else win.document.getElementById(id)?.scrollIntoView();
  };

  // Links: cancel, but follow in-page anchors by scrolling. Registered on the
  // window in the bubble phase, so the kit's own handlers have run first.
  const onLink = (event: Event): void => {
    const target = event.target as Element | null;
    const link = target?.closest?.("a[href], area[href]");
    if (!link) return;
    const handled = event.defaultPrevented;
    event.preventDefault();
    const href = link.getAttribute("href") ?? "";
    if (!handled && event.type === "click" && href.startsWith("#")) toAnchor(href);
  };
  win.addEventListener("click", onLink);
  win.addEventListener("auxclick", onLink);

  // Forms: validation still runs (submit fires only once it passes); the
  // submission does not. method="dialog" only closes its dialog, so it stays.
  win.addEventListener("submit", (event) => {
    const submitter = (event as SubmitEvent).submitter;
    const form = event.target as HTMLFormElement;
    const method = submitter?.getAttribute("formmethod") ?? form.getAttribute("method") ?? "";
    if (method.toLowerCase() !== "dialog") event.preventDefault();
  });

  // Everything else (location.href = …, meta refresh, history traversal) where
  // the Navigation API exists. Hash changes stay; so does about:srcdoc, which
  // is the playground itself writing a new render.
  const nav = (win as unknown as { navigation?: EventTarget }).navigation;
  nav?.addEventListener("navigate", (event) => {
    const navigate = event as Event & { hashChange: boolean; destination: { url: string } };
    if (!navigate.cancelable || navigate.hashChange) return;
    if (navigate.destination.url.startsWith("about:srcdoc")) return;
    navigate.preventDefault();
  });

  win.open = () => null;
}

/** The guard as an inline `<script>` for the top of the preview's `<head>`. */
export function guardScript(): string {
  return `<script>(${guardNavigation.toString()})(window);</script>`;
}
