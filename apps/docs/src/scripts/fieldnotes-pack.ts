/**
 * One masonry pass over the Fieldnotes card grid (components/ThemeBuilder.astro).
 *
 * Runs twice over a page's life: inline, right after the grid's markup, so the
 * cards are packed before their first paint (ThemeBuilder.astro inlines this
 * file, compiled, with lib/inline-script.ts), and then from
 * `<fieldnotes-demo>` (scripts/fieldnotes.ts) whenever a card resizes.
 *
 * Self-contained on purpose: the inline copy is this file alone, so it may
 * import nothing, and its one export is the function the inline caller names.
 */

/**
 * Measures every card into a row span (the card's bottom margin is the row
 * gap), then closes the holes dense placement leaves: a wide card waits for
 * every column it spans, so the card above a hole grows down to the next
 * card in its columns (each card's `--place-content` keeps its parts at the
 * top of the extra height).
 */
export function packGrid(grid: HTMLElement): void {
  // A card's dialog is its sibling in the grid, and never laid out while closed.
  const cards = [...grid.children].filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.tagName !== "DIALOG",
  );
  grid.style.setProperty("--auto-rows", "1px");
  const span = (card: HTMLElement, rows: number) =>
    card.style.setProperty("--row-span", String(Math.max(1, Math.ceil(rows))));

  // The columns size to their cards (max-content), so where a spanning card
  // lands changes their widths, and the widths change the heights this pass
  // measures. Left free, a pass could move a spanning card, the new widths
  // would resize the cards, and the next pass would move it back: the grid
  // flips between two layouts every frame. So size the columns from one fixed
  // placement (every card a single row) and hold them while packing.
  grid.style.setProperty("--template-cols", "");
  for (const card of cards) card.style.removeProperty("--row-span");
  grid.style.setProperty(
    "--template-cols",
    getComputedStyle(grid).getPropertyValue("--template-cols"),
  );

  // Measured unstretched: a box shorter than its content collapses the rows
  // that hold scroll containers (the table), so a stretched card can't be read.
  for (const card of cards) card.style.setProperty("--self", "start");
  const sizes = cards.map((card) => ({
    card,
    height: card.getBoundingClientRect().height,
    gap: Number.parseFloat(getComputedStyle(card).marginBlockEnd) || 0,
  }));
  for (const { card, height, gap } of sizes) {
    span(card, height + gap);
    card.style.setProperty("--self", "stretch");
  }
  // Placed at their natural heights; now extend each down to the card below it.
  const rects = sizes.map(({ card }) => card.getBoundingClientRect());
  sizes.forEach(({ card, height, gap }, i) => {
    const a = rects[i]!;
    let next = Infinity;
    rects.forEach((b, j) => {
      const below = j !== i && b.top >= a.bottom - 1;
      const overlaps = b.left < a.right - 1 && a.left < b.right - 1;
      if (below && overlaps) next = Math.min(next, b.top);
    });
    const hole = next === Infinity ? 0 : next - a.bottom - gap;
    if (hole > 1) span(card, height + gap + hole);
  });
}
