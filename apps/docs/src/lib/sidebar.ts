/**
 * Builds a sidebar from a content collection: entries grouped by `section`
 * (in the order each section first declares), sorted by `order` then title.
 * Pure, so it is tested without Astro.
 */

export interface SidebarEntry {
  /** Collection id, e.g. `"concepts/utilities"`; `"index"` is the section root. */
  id: string;
  title: string;
  section: string;
  order: number;
  /** Section order, read from the entry that defines the section (lowest wins). */
  sectionOrder?: number;
  /** In-page anchors to list under the entry (`#attributes`). */
  anchors?: { label: string; slug: string }[];
}

export interface SidebarLink {
  title: string;
  href: string;
  current: boolean;
  anchors: { label: string; href: string }[];
}

export interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

/** The URL for a collection id under a base: `index` is the base itself. */
export function hrefFor(base: string, id: string): string {
  const path = id.replace(/\/?index$/, "");
  return path ? `${base}/${path}/` : `${base}/`;
}

export function buildSidebar(
  entries: readonly SidebarEntry[],
  base: string,
  currentPath: string,
): SidebarSection[] {
  const sections = new Map<string, { order: number; entries: SidebarEntry[] }>();
  for (const entry of entries) {
    const section = sections.get(entry.section) ?? { order: Infinity, entries: [] };
    section.order = Math.min(section.order, entry.sectionOrder ?? Infinity);
    section.entries.push(entry);
    sections.set(entry.section, section);
  }
  const byOrder = (a: { order: number; title: string }, b: { order: number; title: string }) =>
    a.order - b.order || a.title.localeCompare(b.title);
  return [...sections.entries()]
    .map(([title, { order, entries }]) => ({ title, order, entries }))
    .sort(byOrder)
    .map(({ title, entries }) => ({
      title,
      links: [...entries].sort(byOrder).map((entry) => {
        const href = hrefFor(base, entry.id);
        return {
          title: entry.title,
          href,
          current: href === currentPath,
          anchors: (entry.anchors ?? []).map((a) => ({
            label: a.label,
            href: `${href}#${a.slug}`,
          })),
        };
      }),
    }));
}
