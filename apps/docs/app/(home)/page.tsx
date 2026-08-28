import { cn } from "@/lib/cn";
import Link from "next/link";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { HomeDemo } from "@/components/home-demo";

const eyebrow = "font-mono text-xs tracking-widest text-fd-muted-foreground uppercase";

const demos = [
  {
    src: "button/button",
    caption: '<button class="ui-button" data-variant="primary">',
    minHeight: 96,
    wide: true,
  },
  {
    src: "switch/switch",
    caption: '<input type="checkbox" role="switch">',
    minHeight: 150,
    wide: false,
  },
  {
    src: "slider/slider",
    caption: '<input type="range">',
    minHeight: 150,
    wide: false,
  },
  {
    src: "badge/badge",
    caption: '<button class="ui-badge">',
    minHeight: 120,
    wide: false,
  },
  {
    src: "toggle-group/toggle-group",
    caption: '<ui-toggle-group role="group">',
    minHeight: 120,
    wide: false,
  },
  {
    src: "progress/progress",
    caption: '<progress class="ui-progress">',
    minHeight: 130,
    wide: false,
  },
  {
    src: "kbd/kbd",
    caption: "<kbd>⌘</kbd>",
    minHeight: 130,
    wide: false,
  },
  {
    src: "otp/otp",
    caption: '<ui-otp data-otp-groups="3-3">',
    minHeight: 170,
    wide: true,
  },
] as const;

// One factual sentence per mechanism, quoted from the docs pages each item links to.
const facts = [
  {
    term: "No build step",
    href: "/docs/getting-started/installation",
    text: "Zazz runs on CSS and standard browser APIs without required bundlers or frameworks.",
  },
  {
    term: "Cascade layers",
    href: "/docs/foundation/layers",
    text: "Later layers override earlier ones regardless of selector specificity, so utilities beat component rules without !important.",
  },
  {
    term: "Design tokens",
    href: "/docs/foundation/variables",
    text: "Values are CSS custom properties on :root. Components read var(--token), so updating a variable restyles the UI.",
  },
  {
    term: "Data attributes",
    href: "/docs/getting-started/overview",
    text: 'Variants use attributes like data-variant="primary" instead of modifier classes. Omitting the attribute renders the default.',
  },
] as const;

const installSnippet = `pnpm add @zazz-ui/core`;

const importSnippet = `import "@zazz-ui/core/index.css"; // all styles, imported in cascade order
import "@zazz-ui/core"; // custom elements and shared behaviors`;

export default function HomePage() {
  return (
    <div className="min-h-dvh w-full bg-fd-background text-fd-foreground">
      <main className="mx-auto flex w-full max-w-160 flex-col gap-16 px-6 py-20 md:gap-20 md:px-8 md:pt-28 md:pb-24">
        <header className="flex flex-col gap-6">
          <h1 className="sr-only">Zazz Design Framework</h1>
          <div className="flex flex-col gap-5">
            <Logo variant="lockup" className="h-auto w-28 text-fd-foreground md:w-32" />
            <p className={eyebrow}>A web-native ui library</p>
          </div>
          <p className="max-w-136 text-base leading-relaxed">
            Zazz is a CSS and vanilla JavaScript UI kit that does not require a build step. It uses
            semantic design tokens, cascade layers, data-* variants, and browser APIs such as
            popover, dialog, and anchor positioning.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/docs" className={cn(buttonVariants({ variant: "primary" }), "w-fit")}>
              Read the docs
            </Link>
            <a
              className={cn(
                "group inline-flex items-center gap-1.5 text-sm text-fd-foreground",
                "underline decoration-1 underline-offset-2 transition-all hover:underline-offset-4",
                "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-4 focus-visible:outline-none",
              )}
              href="https://www.figma.com/community/file/1468718708506413296"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ArrowUpRight
                className="size-3.5 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
              <span>Figma kit</span>
            </a>
          </div>
        </header>

        <section aria-label="Component examples" className="flex flex-col gap-5">
          <h2 className={eyebrow}>Examples</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {demos.map((demo) => (
              <HomeDemo
                key={demo.src}
                src={demo.src}
                caption={demo.caption}
                minHeight={demo.minHeight}
                className={demo.wide ? "md:col-span-2" : undefined}
              />
            ))}
          </div>
        </section>

        <section aria-label="How it works" className="flex flex-col gap-5">
          <h2 className={eyebrow}>How it works</h2>
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.term} className="flex flex-col gap-1.5">
                <dt>
                  <Link
                    href={fact.href}
                    className="text-sm font-medium underline decoration-fd-border underline-offset-2 transition-colors hover:decoration-fd-foreground"
                  >
                    {fact.term}
                  </Link>
                </dt>
                <dd className="text-sm leading-relaxed text-fd-muted-foreground">{fact.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Install" className="flex flex-col gap-5">
          <h2 className={eyebrow}>Install</h2>
          <div className="flex flex-col gap-3">
            <DynamicCodeBlock lang="bash" code={installSnippet} />
            <DynamicCodeBlock lang="js" code={importSnippet} />
          </div>
        </section>
      </main>
    </div>
  );
}
