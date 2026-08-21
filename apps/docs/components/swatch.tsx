import { cn } from "../lib/cn";
import type { ReactNode } from "react";

interface SwatchProps {
  color: string;
  step?: string;
  name?: string;
  className?: string;
}

export function Swatch({ color, step, name, className }: SwatchProps) {
  return (
    <div className={cn("group flex flex-col gap-2", className)}>
      <div
        className="aspect-square rounded-lg border border-fd-border/40 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md"
        style={{ background: color }}
      />
      {(step || name) && (
        <div className="flex flex-col gap-0.5 px-0.5">
          {step && (
            <span className="text-xs font-medium leading-none text-fd-foreground tabular-nums">
              {step}
            </span>
          )}
          {name && (
            <span className="block truncate font-mono text-[10px] leading-tight text-fd-muted-foreground/70">
              {name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface SwatchGridProps {
  children: ReactNode;
  className?: string;
  cols?: 4 | 11 | 13;
}

const COLS_CLASSES: Record<number, string> = {
  11: "grid-cols-4 sm:grid-cols-6 md:grid-cols-11",
  13: "grid-cols-4 sm:grid-cols-7 md:grid-cols-[repeat(13,minmax(0,1fr))]",
  4: "grid-cols-2 sm:grid-cols-4",
};

export function SwatchGrid({ children, className, cols = 11 }: SwatchGridProps) {
  return (
    <div className={cn("grid gap-2.5 my-6", COLS_CLASSES[cols] ?? COLS_CLASSES[11], className)}>
      {children}
    </div>
  );
}
