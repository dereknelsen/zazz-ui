/**
 * Site-wide facts: names, URLs, navigation. Everything a link or a footer line
 * needs lives here so a URL change is a one-file edit.
 */

export const site = {
  name: "Zazz",
  title: "Zazz Design System",
  description:
    "A unified collection of primitives, style utilities, and design tokens, for no-build, low-build, and legacy web projects.",
  url: "https://zazz.sh",
  stage: "alpha",
} as const;

export const links = {
  github: "https://github.com/dereknelsen/zazz-ui",
  license: "https://github.com/dereknelsen/zazz-ui/blob/main/LICENSE",
  issues: "https://github.com/dereknelsen/zazz-ui/issues",
  npm: "https://www.npmjs.com/package/@zazz-ui/core",
} as const;

/** The header's primary navigation, repeated in the footer. */
export const nav = [
  { label: "Docs", href: "/docs/" },
  { label: "API", href: "/api/" },
  { label: "Blog", href: "/blog/" },
  { label: "Playground", href: "/playground/" },
] as const;
