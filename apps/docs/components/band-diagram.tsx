import { cn } from "@/lib/cn";

/**
 * Static diagrams for the layout-and-containers concept page. Both draw the
 * container band model with plain divs and fumadocs theme tokens, so they
 * track light/dark automatically and never drift from the docs typography the
 * way an ASCII-art code block does.
 *
 * Proportions are honest: they model a 104rem-wide region with 2rem gutters,
 * so every band renders at its real share of that region (md = 64/104, etc.).
 */

const REGION = 104; // rem — reference region width for the drawing

const BANDS = [
  { name: "bleed", rem: 104, cap: "edge to edge", isDefault: false },
  { name: "full", rem: 100, cap: "region minus gutters", isDefault: false },
  { name: "xl", rem: 96, cap: "96rem", isDefault: false },
  { name: "lg", rem: 80, cap: "80rem", isDefault: false },
  { name: "md", rem: 64, cap: "64rem", isDefault: true },
  { name: "sm", rem: 48, cap: "48rem", isDefault: false },
  { name: "xs", rem: 40, cap: "40rem", isDefault: false },
];

const pct = (rem: number) => `${((rem / REGION) * 100).toFixed(2)}%`;
/** Inset from either edge to a band's start line. */
const inset = (rem: number) => `${(((REGION - rem) / 2 / REGION) * 100).toFixed(2)}%`;

/** Dashed vertical guides marking the md band's edges across a whole stack. */
function MdGuides() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 border-x border-dashed border-fd-primary/40"
      style={{ left: inset(64), right: inset(64) }}
    />
  );
}

/** The concentric band template: every width a container child can occupy. */
export function BandDiagram() {
  return (
    <figure className="not-prose my-6 rounded-lg border bg-fd-card p-4 sm:p-6">
      <div className="relative flex flex-col gap-1.5">
        <MdGuides />
        {BANDS.map((band) => (
          <div
            key={band.name}
            style={{ width: pct(band.rem) }}
            className={cn(
              "mx-auto flex h-9 min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 font-mono text-xs",
              band.isDefault
                ? "border-fd-primary bg-fd-primary font-semibold text-fd-primary-foreground"
                : "border-fd-primary/25 bg-fd-primary/5 text-fd-foreground",
            )}
          >
            <span>
              {band.name}
              {band.isDefault && (
                <span className="ml-2 hidden font-normal opacity-80 sm:inline">default</span>
              )}
            </span>
            <span
              className={cn(
                "hidden truncate sm:inline",
                !band.isDefault && "text-fd-muted-foreground",
              )}
            >
              {band.cap}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-sm text-fd-muted-foreground">
        The band template, drawn to scale for a 104rem region with 2rem gutters. Every region shares
        it, so an <code className="text-fd-foreground">md</code> child in one section lines up
        exactly with <code className="text-fd-foreground">md</code> children in every other. The
        dashed guides mark the default band.
      </figcaption>
    </figure>
  );
}

const FLOW_CHILDREN = [
  { label: "<h2>", band: "md", rem: 64, tall: false },
  { label: "<p>", band: "md", rem: 64, tall: false },
  { label: '<figure data-container="bleed">', band: "bleed", rem: 104, tall: true },
  { label: "<p>", band: "md", rem: 64, tall: false },
];

/** Siblings in one container flow, each occupying its own band. */
export function BandFlowDiagram() {
  return (
    <figure className="not-prose my-6 rounded-lg border bg-fd-card p-4 sm:p-6">
      <div className="relative flex flex-col gap-1.5">
        <MdGuides />
        {FLOW_CHILDREN.map((child, i) => (
          <div
            key={i}
            style={{ width: pct(child.rem) }}
            className={cn(
              "mx-auto flex min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 font-mono text-xs",
              child.tall
                ? "h-16 border-fd-primary/40 bg-fd-primary/15"
                : "h-9 bg-fd-muted/60 text-fd-foreground",
            )}
          >
            <span className="truncate">{child.label}</span>
            <span className="shrink-0 text-fd-muted-foreground">{child.band}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-sm text-fd-muted-foreground">
        One container, four siblings. The figure opts out to the viewport edge and the next
        paragraph returns to the default band, without any wrappers or negative margins.
      </figcaption>
    </figure>
  );
}
