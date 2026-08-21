import { cn } from "@/lib/cn";
import Link from "next/link";
import ZazzLineartBg from "@/components/zazz-lineart-bg";
import { buttonVariants } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";

const links = [
  { label: "Read the docs", href: "/docs", external: false, main: true },
  {
    label: "Figma kit",
    href: "https://www.figma.com/community/file/1468718708506413296",
    external: true,
    main: false,
  },
] as const;

export default function HomePage() {
  return (
    <div className="dark relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-fd-background text-fd-foreground">
      <ZazzLineartBg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full text-fd-foreground"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      />

      <div className="relative z-10 grid min-h-dvh flex-1 grid-cols-2 gap-8 p-6 lg:gap-16 lg:p-24 max-md:grid-cols-1 max-md:gap-8">
        <Logo
          variant="lockup"
          className={cn("h-auto w-28 justify-self-start self-start text-fd-foreground lg:w-36")}
        />

        <p
          className={cn(
            "col-start-2 row-start-1 justify-self-end self-start font-mono text-xs tracking-widest text-fd-muted-foreground uppercase",
            "max-md:col-start-1 max-md:justify-self-start",
          )}
        >
          A web-native ui library
        </p>

        <div className={cn("flex flex-col gap-3.5 self-end")}>
          {links.map((l) => {
            return l.external ? (
              <a
                key={l.label}
                className={
                  l.main
                    ? cn(buttonVariants({ variant: "primary" }), "w-fit pr-3 gap-3.5")
                    : cn(
                        "opacity-60 hover:opacity-100",
                        "group inline-flex w-fit items-center gap-3.5 px-2 py-0.5 text-sm leading-tight tracking-tight",
                        "text-fd-foreground no-underline transition hover:text-fd-primary",
                        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-4 focus-visible:outline-none",
                      )
                }
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ArrowUpRight
                  className="size-3.5 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
                <span>{l.label}</span>
              </a>
            ) : (
              <Link
                key={l.label}
                className={
                  l.main
                    ? cn(buttonVariants({ variant: "primary" }), "w-fit pr-3 gap-3.5")
                    : cn(
                        "opacity-60 hover:opacity-100",
                        "group inline-flex w-fit items-center gap-3.5 px-2 py-0.5 text-sm leading-tight tracking-tight",
                        "text-fd-foreground no-underline transition hover:text-fd-primary",
                        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-4 focus-visible:outline-none",
                      )
                }
                href={l.href}
              >
                <ArrowUpRight
                  className="size-3.5 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </div>

        <h1
          className={cn(
            "col-start-2 row-start-2 m-0 justify-self-end self-end text-right text-5xl leading-none font-semibold tracking-tight text-fd-foreground sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl",
            "max-md:col-start-1 max-md:row-start-4 max-md:justify-self-start max-md:self-end max-md:text-left",
          )}
        >
          <span className="block">Zazz</span>
          <span className="block">Design</span>
          <span className="block">Framework</span>
        </h1>
      </div>
    </div>
  );
}
