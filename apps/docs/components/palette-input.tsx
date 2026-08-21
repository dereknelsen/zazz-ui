"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn";

interface PaletteHexInputProps {
  name: string;
  defaultHex: string;
  className?: string;
}

export function PaletteHexInput({ name, defaultHex, className }: PaletteHexInputProps) {
  const [hex, setHex] = useState(defaultHex.replace(/^#/, ""));
  const clean = hex.replace(/^#/, "").toUpperCase().slice(0, 6);
  const isValid = /^[0-9A-F]{6}$/.test(clean);
  const url = `https://tailwind.simeongriggs.dev/api/${name}/${clean}`;

  return (
    <div
      className={cn(
        "my-4 flex items-center gap-2.5 rounded-lg border border-fd-border bg-fd-card/40 px-2.5 py-2",
        className,
      )}
    >
      <span className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-fd-muted-foreground sm:inline-block">
        Base
      </span>

      <div className="flex flex-1 items-center gap-2.5 rounded-md border border-fd-border/60 bg-fd-background pl-2 pr-2.5 py-1.5 min-w-0 focus-within:border-fd-ring focus-within:ring-2 focus-within:ring-fd-ring/30">
        <div
          className="size-5 shrink-0 rounded border border-fd-border/60"
          style={{ background: isValid ? `#${clean}` : "transparent" }}
        />
        <span className="font-mono text-xs text-fd-muted-foreground/60 select-none">#</span>
        <input
          type="text"
          value={clean}
          onChange={(e) => setHex(e.target.value.replace(/[^0-9A-Fa-f]/g, ""))}
          maxLength={6}
          spellCheck={false}
          aria-label={`${name} base hex value`}
          className="flex-1 min-w-0 bg-transparent font-mono text-sm uppercase tracking-wide text-fd-foreground outline-none placeholder:text-fd-muted-foreground/40"
          placeholder="000000"
        />
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!isValid}
        className={cn(
          "group/cta inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          isValid
            ? "bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90"
            : "pointer-events-none bg-fd-muted text-fd-muted-foreground",
        )}
      >
        Generate
        <ArrowUpRight className="size-3.5 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
      </a>
    </div>
  );
}
