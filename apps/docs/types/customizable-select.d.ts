import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /**
       * Customizable `<select>` — mirrors the selected `<option>`'s content
       * inside the `<button>` trigger when `appearance: base-select` is used.
       * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/selectedcontent
       */
      selectedcontent: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
