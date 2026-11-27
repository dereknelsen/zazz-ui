import { describe, expect, it, vi } from "vite-plus/test";
import { guardNavigation, guardScript } from "./playground-guard.ts";

/** An event whose target is set by hand (Node's EventTarget has no tree to bubble through). */
class TargetedEvent extends Event {
  submitter: unknown = null;
  constructor(
    type: string,
    private readonly fakeTarget: unknown,
  ) {
    super(type, { cancelable: true });
  }
  override get target() {
    return this.fakeTarget as EventTarget;
  }
}

class NavigateEvent extends Event {
  constructor(
    readonly destination: { url: string },
    readonly hashChange = false,
  ) {
    super("navigate", { cancelable: true });
  }
}

const link = (href: string) => ({
  getAttribute: (name: string) => (name === "href" ? href : null),
  closest: (selector: string) => (selector.includes("a[href]") ? link(href) : null),
});
const form = (method: string | null) => ({
  getAttribute: (name: string) => (name === "method" ? method : null),
});

function setup() {
  const win = new EventTarget() as EventTarget & Record<string, unknown>;
  const target = { scrollIntoView: vi.fn() };
  win.navigation = new EventTarget();
  win.scrollTo = vi.fn();
  win.document = { getElementById: (id: string) => (id === "pricing" ? target : null) };
  win.open = () => ({});
  guardNavigation(win as unknown as Window);
  return { win, target };
}

describe("playground navigation guard", () => {
  it("cancels link clicks", () => {
    const { win } = setup();
    const event = new TargetedEvent("click", link("/docs"));
    win.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("scrolls to an in-page anchor instead of navigating", () => {
    const { win, target } = setup();
    const event = new TargetedEvent("click", link("#pricing"));
    win.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it("leaves clicks off links alone", () => {
    const { win } = setup();
    const event = new TargetedEvent("click", { closest: () => null });
    win.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("cancels form submissions, but not method=dialog", () => {
    const { win } = setup();
    const post = new TargetedEvent("submit", form("post"));
    win.dispatchEvent(post);
    expect(post.defaultPrevented).toBe(true);
    const dialog = new TargetedEvent("submit", form("dialog"));
    win.dispatchEvent(dialog);
    expect(dialog.defaultPrevented).toBe(false);
  });

  it("cancels scripted navigations but allows hash changes and re-renders", () => {
    const { win } = setup();
    const nav = win.navigation as EventTarget;
    const away = new NavigateEvent({ url: "https://example.com/" });
    nav.dispatchEvent(away);
    expect(away.defaultPrevented).toBe(true);
    const hash = new NavigateEvent({ url: "about:srcdoc#top" }, true);
    nav.dispatchEvent(hash);
    expect(hash.defaultPrevented).toBe(false);
    const rerender = new NavigateEvent({ url: "about:srcdoc" });
    nav.dispatchEvent(rerender);
    expect(rerender.defaultPrevented).toBe(false);
  });

  it("disables window.open", () => {
    const { win } = setup();
    expect((win.open as () => unknown)()).toBe(null);
  });

  it("serializes to a self-contained inline script", () => {
    const script = guardScript();
    expect(script).toMatch(/^<script>[\s\S]*<\/script>$/);
    expect(script.slice(8, -9)).not.toContain("</script");
    // Runs with nothing but a window in scope (as the preview evaluates it).
    // oxlint-disable-next-line no-implied-eval
    const run = new Function("window", script.slice(8, -9));
    const { win } = setup();
    expect(() => run(win)).not.toThrow();
  });
});
