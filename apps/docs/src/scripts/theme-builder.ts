/**
 * `<theme-builder>`: the theme form in components/ThemeBuilder.astro. Every
 * change rebuilds one `:root { … }` block holding only the tokens that differ
 * from the kit's defaults, previews it, and copies it on request. Live, the
 * same block is scoped to the cards' preview wrapper (`.fieldnotes__preview`)
 * so the rest of the page, the theme panel included, keeps the site's theme.
 *
 * The kit resolves its derived tokens (`--radius-*`, `--space-*`, the `--ui-*`
 * hooks) on `:root`, so a subtree override would not reach them on its own:
 * ThemeBuilder.astro re-declares every derived token on the preview wrapper,
 * and they recompute there. The `--shadow-*` tokens follow because the
 * wrapper sets `--shadow-tint`, which makes the kit re-declare them. The `<style>` lives
 * inside the element, so leaving the page (a swap navigation) drops the theme.
 *
 * The panel's values (the preview's card elevation included) persist in
 * localStorage until the form is reset, so a reload or a trip to another page
 * keeps the theme being worked on.
 *
 * Font: one combobox lists local stacks and, when the build had a Google
 * Fonts key, the popular Google families; the choice goes to headings and
 * body text alike. A Google family loads through one `<link>` in the head,
 * and the copied CSS carries that tag in a comment above the `:root` block.
 *
 * A custom element because swap navigation never runs a swapped-in page's
 * scripts; BaseLayout defines it on every page.
 */
import { ZazzElement, defineZazzElement } from "@zazz-ui/core/base/zazz-element.ts";
import { googleFontsHref } from "../lib/fonts.ts";
import { createPalette, foregroundFor, normalizeHex } from "../lib/palette.ts";

const STORAGE_KEY = "fieldnotes-theme";
/** How the collapsed bar's chips print each control's value. */
const CHIP_FORMAT: Record<string, (value: string) => string> = {
  "tb-spacing": (v) => `${v}rem`,
  "tb-shadow": (v) => `${v}°`,
  "tb-radius": (v) => `${v}×`,
  "tb-shadow-intensity": (v) => `${v}×`,
  "tb-shadow-blur": (v) => `${v}×`,
  "tb-shadow-distance": (v) => `${v}×`,
  "tb-font": (v) => v.replace(/^Default.*/, "Default"),
};

/** The class on the preview wrapper the live theme is scoped to. */
const PREVIEW = "fieldnotes__preview";

const PALETTES = ["primary", "neutral"] as const;
type PaletteName = (typeof PALETTES)[number];

/** Number controls: the token each writes and how its value is spelled (`format` wins over `unit`). */
const NUMBERS: Record<string, { token: string; unit: string; format?: (n: number) => string }> = {
  spacing: { token: "--spacing", unit: "rem" },
  radius: { token: "--radius-multiplier", unit: "" },
  "corner-shape": {
    token: "--radius-corner-shape",
    unit: "",
    format: (n) => `superellipse(${n})`,
  },
  shadow: { token: "--default-shadow-angle", unit: "deg" },
  "shadow-intensity": { token: "--default-shadow-intensity", unit: "" },
  "shadow-blur": { token: "--default-shadow-blur", unit: "" },
  "shadow-distance": { token: "--default-shadow-distance", unit: "" },
  "scale-min": { token: "--typeset-scale-min", unit: "" },
  "scale-max": { token: "--typeset-scale-max", unit: "" },
};

/** A theme control: the inputs, the font combobox's hidden input, and the scale selects. */
type Field = HTMLInputElement | HTMLSelectElement;

/**
 * The value a control shipped with. Selects and the comboboxes' hidden inputs
 * carry it in `data-default` (a hidden input's `defaultValue` follows its
 * value, so it can never tell a change); the other inputs in `defaultValue`.
 */
const defaultOf = (field: Field): string =>
  field.dataset.default ?? (field instanceof HTMLInputElement ? field.defaultValue : "");

class ThemeBuilder extends ZazzElement {
  protected setup(signal: AbortSignal): void {
    const form = this.querySelector("form");
    const output = this.querySelector<HTMLStyleElement>("style[data-theme-output]");
    if (!form || !output) return;

    const q = <T extends Element>(selector: string) => this.querySelector<T>(selector);
    const copy = q<HTMLButtonElement>("[data-theme-copy]");
    const reset = q<HTMLButtonElement>("[data-theme-reset]");
    const preview = q<HTMLElement>("[data-theme-css]");
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.setAttribute("data-theme-fonts", "");
    const panel = q<HTMLElement>("[data-theme-panel]");
    const sheet = q<HTMLElement>("[data-theme-sheet]");
    const dialog = q<HTMLDialogElement>("dialog#tb-sheet");

    // The hex fields' initial values are the defaults (ThemeBuilder.astro copies them from _variables.css).
    const defaults = Object.fromEntries(
      PALETTES.map((name) => [
        name,
        q<HTMLInputElement>(`[data-theme-hex="${name}"]`)!.defaultValue,
      ]),
    ) as Record<PaletteName, string>;
    const hints = Object.fromEntries(
      PALETTES.map((name) => [
        name,
        q<HTMLElement>(`[data-theme-hint="${name}"]`)?.textContent ?? "",
      ]),
    ) as Record<PaletteName, string>;

    // No clipboard outside a secure context: hide the copy buttons, which cannot work.
    if (!navigator.clipboard?.writeText) {
      for (const button of this.querySelectorAll<HTMLElement>(
        "[data-theme-copy], [data-theme-copy-proxy]",
      )) {
        button.hidden = true;
      }
    }

    /** The panel's controls, by `name`: the theme inputs and the preview's elevation slider. */
    const fields = () => [
      ...form.querySelectorAll<Field>(
        "[data-theme-hex], [data-theme-number], [data-theme-token], [data-theme-font], [data-fieldnotes-elevation]",
      ),
    ];
    const changed = (field: Field) => field.value !== defaultOf(field);
    // Storage can be missing or blocked (a private window, cleared site data).
    const stored = (): Record<string, string> | null => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, string>) : null;
      } catch {
        return null;
      }
    };
    const save = () => {
      const values = Object.fromEntries(
        fields()
          .filter(changed)
          .map((f) => [f.name, f.value]),
      );
      try {
        if (Object.keys(values).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* nothing to keep */
      }
    };
    const forget = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* nothing kept */
      }
    };
    /** Puts the stored values back into the fields; each then announces itself as an input. */
    const restore = () => {
      const values = stored();
      if (!values) return;
      for (const field of fields()) {
        const value = values[field.name];
        if (value === undefined || value === field.value) continue;
        // A combobox is set through its element, which moves the label and the
        // selection too. The kit may define <ui-combobox> after this element
        // runs, and a value set before the upgrade would shadow the accessor,
        // so the write waits for the definition and renders again.
        const combobox = field.closest<HTMLElement & { value: string }>("ui-combobox");
        if (combobox) {
          // A stored family this build does not list (a fork without the key,
          // a family that left the popular ten) keeps the default row.
          if (!combobox.querySelector(`[data-combobox-value="${CSS.escape(value)}"]`)) continue;
          void customElements.whenDefined("ui-combobox").then(() => {
            if (!signal.aborted) {
              combobox.value = value;
              render();
            }
          });
          continue;
        }
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    let css = "";

    const render = () => {
      const lines: string[] = [];

      for (const name of PALETTES) {
        const hex = normalizeHex(q<HTMLInputElement>(`[data-theme-hex="${name}"]`)!.value);
        const changed = hex !== null && hex !== normalizeHex(defaults[name]);
        // Unchanged, there is no picked color to mark: the kit's own role flips stops by scheme.
        let stop: number | undefined;
        let swatches: Record<string, string> | undefined;
        if (changed) {
          const palette = createPalette(hex);
          stop = palette.stop;
          swatches = palette.swatches;
          for (const [s, value] of Object.entries(palette.swatches)) {
            lines.push(`--color-${name}-${s}: ${value}`);
          }
          // The input becomes the role color in both schemes (the kit's default
          // flips primary to its 50 in dark mode; a picked brand color shouldn't).
          if (name === "primary") {
            lines.push(`--color-primary: var(--color-primary-${stop})`);
            lines.push(`--color-primary-foreground: ${foregroundFor(palette, "primary")}`);
          }
        }
        for (const swatch of this.querySelectorAll<HTMLElement>(
          `[data-theme-strip="${name}"] [data-stop]`,
        )) {
          swatch.toggleAttribute("aria-current", Number(swatch.dataset.stop) === stop);
          // The panel sits outside the preview's scope, so the strip is painted from
          // the generated palette itself, and from the kit's tokens when unchanged.
          const at = swatch.dataset.stop!;
          swatch.style.setProperty("--bg", swatches?.[at] ?? `var(--color-${name}-${at})`);
        }
        const hint = q<HTMLElement>(`[data-theme-hint="${name}"]`);
        if (hint) hint.textContent = changed ? `Your color is ${name}-${stop}.` : hints[name];
      }

      for (const input of this.querySelectorAll<Field>("[data-theme-number]")) {
        const { token, unit, format } = NUMBERS[input.dataset.themeNumber!];
        if (input.value === "" || !input.checkValidity()) continue;
        const n = Number(input.value);
        if (n !== Number(input.dataset.default)) {
          lines.push(`${token}: ${format ? format(n) : `${n}${unit}`}`);
        }
      }

      // Single colors (the shadow color): a hex field that writes its token as is.
      for (const input of this.querySelectorAll<HTMLInputElement>("[data-theme-token]")) {
        const hex = normalizeHex(input.value);
        if (hex && hex !== normalizeHex(defaultOf(input))) {
          lines.push(`${input.dataset.themeToken}: ${hex}`);
        }
      }

      // Font: the chosen row carries the stack to write and, for a Google
      // family, what to load; headings and body text share it.
      const hidden = q<HTMLInputElement>("[data-theme-font]");
      const item = hidden
        ?.closest("ui-combobox")
        ?.querySelector<HTMLElement>('[data-combobox-slot~="item"][aria-selected="true"]');
      const stack = item?.dataset.fontStack;
      if (item && hidden?.value && stack) {
        lines.push(`--font-family-heading: ${stack}`, `--font-family-body: ${stack}`);
      }
      const href = googleFontsHref(
        item?.dataset.fontGoogle
          ? [
              {
                google: item.dataset.fontGoogle,
                weights: item.dataset.fontWeights?.split(";").map(Number),
              },
            ]
          : [],
      );
      if (href) {
        if (fontLink.href !== href) fontLink.href = href;
        if (!fontLink.isConnected) document.head.append(fontLink);
      } else {
        fontLink.remove();
      }

      const load = href ? `/* Add to <head>: <link rel="stylesheet" href="${href}"> */\n` : "";
      css = lines.length
        ? `${load}:root {\n${lines.map((line) => `  ${line};`).join("\n")}\n}\n`
        : "";
      // Live, the same block is scoped to the preview, which re-declares the kit's
      // derived tokens (ThemeBuilder.astro) so they recompute there; the copy stays :root.
      output.textContent = css.replace(":root", `.${PREVIEW}`);
      if (preview) preview.textContent = css || "/* No changes yet */";
      if (copy) copy.disabled = !css;
      if (reset) reset.disabled = !css && !fields().some(changed);
      for (const proxy of this.querySelectorAll<HTMLButtonElement>("[data-theme-copy-proxy]")) {
        proxy.disabled = !css;
      }
      for (const proxy of this.querySelectorAll<HTMLButtonElement>("[data-theme-reset-proxy]")) {
        proxy.disabled = !css && !fields().some(changed);
      }
      // A number control's readout, where it has one, prints like its chip.
      for (const input of this.querySelectorAll<HTMLInputElement>("input[data-theme-number]")) {
        const out = q<HTMLOutputElement>(`output[for='${input.id}']`);
        if (out) out.value = CHIP_FORMAT[input.id]?.(input.value) ?? input.value;
      }
      // The collapsed bar's chips mirror the controls.
      for (const chip of this.querySelectorAll<HTMLElement>("[data-theme-chip]")) {
        const input = q<Field>(`#${chip.dataset.themeChip}`);
        if (!input) continue;
        const value = chip.querySelector<HTMLElement>("[data-theme-chip-value]");
        if (value) value.textContent = CHIP_FORMAT[input.id]?.(input.value) ?? input.value;
        const colored = input.dataset.themeHex ?? input.dataset.themeToken;
        const hex = colored ? normalizeHex(input.value) : null;
        if (hex)
          chip
            .querySelector<HTMLElement>("[data-theme-chip-swatch]")
            ?.style.setProperty("--bg", hex);
      }
    };

    // Narrow screens show the bar; the form then lives in the sheet, and comes
    // back to the inline panel when the panel is shown again.
    const place = () => {
      if (!panel || !sheet) return;
      const inline = getComputedStyle(panel).display !== "none";
      const host = inline ? panel : sheet;
      if (form.parentElement === host) return;
      host.append(form);
      // Inside the sheet the dialog is the surface: the card loses its outline and padding.
      form.toggleAttribute("data-card-variant", inline);
      if (inline) form.setAttribute("data-card-variant", "outline");
      if (inline && dialog?.open) dialog.close();
    };
    place();
    const resized = new ResizeObserver(place);
    resized.observe(this);
    signal.addEventListener("abort", () => resized.disconnect(), { once: true });

    // A chip opens the sheet on its control; the bar's actions drive the form's.
    this.addEventListener(
      "click",
      (event) => {
        const target = event.target as Element;
        const chip = target.closest<HTMLElement>("[data-theme-chip]");
        if (chip) {
          const input = q<HTMLInputElement>(`#${chip.dataset.themeChip}`);
          // The control may sit in a closed accordion section: open it, focus without
          // scrolling (the section is still 0 tall), and bring the control into view
          // once the open transition ends, or after a beat if nothing animates.
          const section = input?.closest("details");
          const opening = section && !section.open;
          if (section) section.open = true;
          requestAnimationFrame(() => {
            input?.focus({ preventScroll: opening ?? false });
            if (!opening || !input) return;
            const reveal = () => input.scrollIntoView({ block: "nearest" });
            section.addEventListener("transitionend", reveal, { once: true, signal });
            setTimeout(reveal, 400);
          });
        }
        if (target.closest("[data-theme-copy-proxy]")) copy?.click();
        if (target.closest("[data-theme-reset-proxy]")) form.reset();
      },
      { signal },
    );

    form.addEventListener(
      "input",
      (event) => {
        const target = event.target as HTMLInputElement;
        // Keep each palette's picker and hex field in step.
        const picked = target.dataset.themeColor;
        if (picked) q<HTMLInputElement>(`[data-theme-hex="${picked}"]`)!.value = target.value;
        const typed = target.dataset.themeHex;
        const hex = typed ? normalizeHex(target.value) : null;
        if (typed && hex) q<HTMLInputElement>(`[data-theme-color="${typed}"]`)!.value = hex;
        // Same for a single color: keep its picker and hex field in step.
        const pickFor = target.dataset.themePickFor;
        if (pickFor) q<HTMLInputElement>(`#${pickFor}`)!.value = target.value;
        const token = target.dataset.themeToken ? normalizeHex(target.value) : null;
        if (token) q<HTMLInputElement>(`[data-theme-pick-for="${target.id}"]`)!.value = token;
        render();
        save();
      },
      { signal },
    );
    // A combobox commits with `change` on its hidden input, not `input`, and
    // a select driven by script may fire only `change` too.
    form.addEventListener(
      "change",
      () => {
        render();
        save();
      },
      { signal },
    );
    // A reset restores the fields after the event, so render on the next task.
    form.addEventListener(
      "reset",
      () => {
        forget();
        setTimeout(render);
      },
      { signal },
    );
    form.addEventListener("submit", (event) => event.preventDefault(), { signal });

    copy?.addEventListener(
      "click",
      async () => {
        if (!css) return;
        try {
          await navigator.clipboard.writeText(css);
        } catch {
          return;
        }
        const idle = copy.querySelector<HTMLElement>("[data-copy-idle]");
        const done = copy.querySelector<HTMLElement>("[data-copy-done]");
        if (!idle || !done) return;
        idle.hidden = true;
        done.hidden = false;
        setTimeout(() => {
          idle.hidden = false;
          done.hidden = true;
        }, 1500);
      },
      { signal },
    );

    restore();
    render();
  }

  protected teardown(): void {
    const output = this.querySelector("style[data-theme-output]");
    if (output) output.textContent = "";
    document.head.querySelector("link[data-theme-fonts]")?.remove();
  }
}

defineZazzElement("theme-builder", ThemeBuilder);
