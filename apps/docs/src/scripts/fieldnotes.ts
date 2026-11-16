/**
 * Behavior for the Fieldnotes demo cards (components/fieldnotes/):
 *
 * - `<fieldnotes-demo>`: keeps the card grid packed like a masonry (each card's
 *   row span is measured, on a 1px row track, so cards of any height and column
 *   span sit tight under `grid-auto-flow: dense`; scripts/fieldnotes-pack.ts).
 *   The first pack runs inline, before the cards paint (ThemeBuilder.astro);
 *   this element repacks as cards resize, and shows the grid after restoring a
 *   `?preset=` theme, which the inline pass leaves hidden (`[data-fieldnotes-packed]`
 *   in site.css). It also makes range inputs update their `<output for>`, the
 *   theme panel's card-elevation slider restyles the cards (preview only),
 *   ⌘/Ctrl+Enter in the sighting form presses its log button, and no form in
 *   the demo submits.
 * - `<fieldnotes-sightings>`: filters, sorts, and pages the rendered table rows,
 *   showing the empty state when a filter matches nothing.
 *
 * Custom elements because swap navigation never runs a swapped-in page's
 * scripts. ThemeBuilder.astro loads this module on its own page and
 * scripts/islands.ts loads it after a swap.
 */
import { ZazzElement, defineZazzElement } from "@zazz-ui/core/base/zazz-element.ts";
import { packGrid } from "./fieldnotes-pack.ts";

class FieldnotesDemo extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    this.#pack(signal);
    // The slider may already hold a restored value (the theme panel can upgrade first).
    const elevation = this.querySelector<HTMLInputElement>("[data-fieldnotes-elevation]");
    if (elevation) this.#elevate(elevation);
    this.addEventListener(
      "input",
      (event) => {
        const input = event.target as HTMLInputElement;
        if (input.type !== "range" || !input.id) return;
        if (input.hasAttribute("data-fieldnotes-elevation")) this.#elevate(input);
        else if (input.closest("theme-builder")) return;
        const output = this.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`);
        if (output) output.value = input.value;
      },
      { signal },
    );
    // The theme form's reset restores the slider after the event; the cards follow.
    this.addEventListener(
      "reset",
      () => {
        setTimeout(() => {
          const input = this.querySelector<HTMLInputElement>("[data-fieldnotes-elevation]");
          if (input) this.#elevate(input);
        });
      },
      { signal },
    );
    // The cards' forms are for show: a submit validates, and goes nowhere.
    this.addEventListener("submit", (event) => event.preventDefault(), { signal });
    this.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
        const form = (event.target as Element).closest("[data-fieldnotes-form]");
        form?.querySelector<HTMLButtonElement>("button[command]")?.click();
      },
      { signal },
    );
  }

  /** The preview's card elevation: written to each card, never to the copied theme. */
  #elevate(input: HTMLInputElement): void {
    const output = this.querySelector<HTMLOutputElement>(`output[for="${input.id}"]`);
    if (output) output.value = input.value;
    for (const card of this.querySelectorAll<HTMLElement>(
      "[data-fieldnotes-grid] > [data-ui~='card']",
    )) {
      card.style.setProperty("--elevation", input.value);
    }
  }

  /** Keeps the grid packed (scripts/fieldnotes-pack.ts) as its cards resize. */
  #pack(signal: AbortSignal): void {
    const grid = this.querySelector<HTMLElement>("[data-fieldnotes-grid]");
    if (!grid) return;
    // A card's dialog is its sibling in the grid, and never laid out while closed.
    const cards = [...grid.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.tagName !== "DIALOG",
    );

    let frame = 0;
    const pack = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      packGrid(grid);
    };
    // Usually packed already, inline; again here in case fonts or the kit's
    // upgrades changed a card since.
    pack();
    // One pass per frame however many cards resized; a pass ends at the same
    // sizes it started from, so it does not re-trigger itself.
    const observer = new ResizeObserver(() => {
      frame ||= requestAnimationFrame(pack);
    });
    for (const card of cards) observer.observe(card);
    // A pass holds the columns at fixed widths, so a wider or narrower grid
    // reaches no card until the next pass sizes them again.
    observer.observe(grid);
    // Unless the inline pass showed them, the cards are invisible until now
    // (site.css): after a swap navigation, which runs no inline scripts, or
    // with a `?preset=`. They show a frame later: by then a restored theme has
    // applied and been packed too.
    requestAnimationFrame(() => {
      if (signal.aborted) return;
      pack();
      this.setAttribute("data-fieldnotes-packed", "");
    });
    signal.addEventListener(
      "abort",
      () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
      },
      { once: true },
    );
  }
}

type SortKey = "species" | "date";
type Direction = "ascending" | "descending";

class FieldnotesSightings extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    const tbody = this.querySelector("tbody");
    if (!tbody) return;
    const rows = [...tbody.rows];
    const pageSize = Number(this.dataset.pageSize) || rows.length;
    const filter = this.querySelector<HTMLSelectElement>("[data-fieldnotes-filter]");
    const empty = this.querySelector<HTMLElement>("[data-fieldnotes-empty]");
    const table = this.querySelector<HTMLElement>("table");
    const pager = this.querySelector<HTMLElement>("[data-fieldnotes-pager]");
    const range = this.querySelector<HTMLElement>("[data-fieldnotes-range]");
    const prev = this.querySelector<HTMLButtonElement>("[data-fieldnotes-page='prev']");
    const next = this.querySelector<HTMLButtonElement>("[data-fieldnotes-page='next']");
    const thisYear = String(new Date().getFullYear());

    let key: SortKey = "date";
    let direction: Direction = "descending";
    let page = 0;

    const matches = (row: HTMLTableRowElement) => {
      const value = filter?.value ?? "";
      if (!value) return true;
      if (value === "this-year")
        return row.dataset.status === "Confirmed" && row.dataset.year === thisYear;
      return row.dataset.status === value;
    };

    const render = () => {
      const sign = direction === "ascending" ? 1 : -1;
      const shown = rows
        .filter(matches)
        .sort(
          (a, b) =>
            sign *
            (key === "date" ? a.dataset.date! : a.dataset.species!).localeCompare(
              key === "date" ? b.dataset.date! : b.dataset.species!,
            ),
        );
      const pages = Math.max(1, Math.ceil(shown.length / pageSize));
      page = Math.min(page, pages - 1);
      const start = page * pageSize;
      const visible = new Set(shown.slice(start, start + pageSize));

      tbody.replaceChildren(...shown, ...rows.filter((row) => !shown.includes(row)));
      for (const row of rows) row.hidden = !visible.has(row);

      for (const th of this.querySelectorAll<HTMLElement>("th[data-sort-key]")) {
        th.setAttribute("aria-sort", th.dataset.sortKey === key ? direction : "none");
      }
      const none = shown.length === 0;
      if (empty) empty.hidden = !none;
      if (table) table.hidden = none;
      if (pager) pager.hidden = none;
      if (range) {
        range.textContent =
          shown.length <= pageSize
            ? `${shown.length} sightings`
            : `${start + 1}–${Math.min(start + pageSize, shown.length)} of ${shown.length} sightings`;
      }
      if (prev) prev.disabled = page === 0;
      if (next) next.disabled = page >= pages - 1;
    };

    this.addEventListener(
      "click",
      (event) => {
        const target = event.target as Element;
        const th = target
          .closest<HTMLElement>("th[data-sort-key] button")
          ?.closest<HTMLElement>("th");
        if (th) {
          const clicked = th.dataset.sortKey as SortKey;
          direction =
            clicked === key
              ? direction === "ascending"
                ? "descending"
                : "ascending"
              : clicked === "date"
                ? "descending"
                : "ascending";
          key = clicked;
          page = 0;
          render();
          return;
        }
        const step = target.closest<HTMLElement>("[data-fieldnotes-page]")?.dataset.fieldnotesPage;
        if (step) {
          page += step === "next" ? 1 : -1;
          render();
        }
      },
      { signal },
    );
    filter?.addEventListener(
      "change",
      () => {
        page = 0;
        render();
      },
      { signal },
    );

    render();
  }
}

defineZazzElement("fieldnotes-demo", FieldnotesDemo);
defineZazzElement("fieldnotes-sightings", FieldnotesSightings);
