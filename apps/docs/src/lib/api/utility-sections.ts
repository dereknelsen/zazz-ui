/**
 * Where each style utility is documented: Tailwind's section order, so a
 * reader who knows Tailwind finds `--px` under Spacing and `--ring` under
 * Borders. The test next to this file fails when a utility is added to the
 * kit's table and not filed here, or filed twice.
 */
import { PSEUDO_ONLY, UTILITIES } from "@zazz-ui/core/base/utilities.js";

export interface UtilitySection {
  /** URL slug under `/api/utilities/`. */
  id: string;
  title: string;
  description: string;
  utilities: readonly string[];
}

export const UTILITY_SECTIONS: readonly UtilitySection[] = [
  {
    id: "layout",
    title: "Layout",
    description: "Display, position, overflow, and stacking.",
    utilities: [
      "aspect",
      "display",
      "object-fit",
      "overflow",
      "overflow-x",
      "overflow-y",
      "position",
      "inset",
      "inset-x",
      "inset-y",
      "top",
      "right",
      "bottom",
      "left",
      "visibility",
      "z",
    ],
  },
  {
    id: "flexbox-grid",
    title: "Flexbox and grid",
    description: "Tracks, placement, gaps, and alignment.",
    utilities: [
      "flex-wrap",
      "flex",
      "basis",
      "shrink",
      "order",
      "grid-cols",
      "grid-rows",
      "grid-template-cols",
      "grid-template-rows",
      "grid-fit",
      "grid-flow",
      "auto-cols",
      "auto-rows",
      "col",
      "col-span",
      "col-start",
      "col-end",
      "row",
      "row-span",
      "row-start",
      "row-end",
      "gap",
      "gap-x",
      "gap-y",
      "items",
      "justify",
      "place-items",
      "place-content",
      "self",
    ],
  },
  {
    id: "spacing",
    title: "Spacing",
    description: "Padding and margin on the spacing scale.",
    utilities: ["p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml"],
  },
  {
    id: "sizing",
    title: "Sizing",
    description: "Width, height, and their limits.",
    utilities: ["w", "min-w", "max-w", "h", "min-h", "max-h", "size"],
  },
  {
    id: "typography",
    title: "Typography",
    description: "Font, text layout, and text color.",
    utilities: [
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "leading",
      "tracking",
      "line-clamp",
      "text-align",
      "text-decoration",
      "text-transform",
      "text-wrap",
      "whitespace",
      "text",
    ],
  },
  {
    id: "backgrounds",
    title: "Backgrounds",
    description: "Background color, alpha, and gradients.",
    utilities: ["bg", "bg-alpha", "bg-linear", "bg-radial", "bg-conic", "bg-stops"],
  },
  {
    id: "borders",
    title: "Borders",
    description: "Radius, borders, dividers, outline, and the focus ring.",
    utilities: [
      "rounded",
      "border",
      "border-x",
      "border-y",
      "border-t",
      "border-r",
      "border-b",
      "border-l",
      "border-width",
      "border-color",
      "border-style",
      "divide",
      "outline",
      "ring",
      "ring-color",
      "ring-offset",
      "ring-offset-color",
    ],
  },
  {
    id: "effects",
    title: "Effects",
    description: "Shadows and opacity.",
    utilities: ["shadow", "shadow-hue", "opacity"],
  },
  {
    id: "transforms",
    title: "Transforms",
    description: "Scale, translate, and rotate.",
    utilities: ["scale", "translate", "rotate"],
  },
  {
    id: "transitions",
    title: "Transitions",
    description: "Animate between states.",
    utilities: ["transition"],
  },
  {
    id: "interactivity",
    title: "Interactivity",
    description: "Cursor and pointer events.",
    utilities: ["cursor", "pointer-events"],
  },
  {
    id: "pseudo-elements",
    title: "Pseudo-elements",
    description: "Style `::before` and `::after` from the host element.",
    utilities: ["content"],
  },
];

/** Every utility name the kit's table defines, including the pseudo-only ones. */
export function allUtilityNames(): string[] {
  return [...UTILITIES, ...PSEUDO_ONLY].map((u) => u.name);
}

export function sectionOf(name: string): UtilitySection | undefined {
  return UTILITY_SECTIONS.find((s) => s.utilities.includes(name));
}

export function sectionById(id: string): UtilitySection | undefined {
  return UTILITY_SECTIONS.find((s) => s.id === id);
}
