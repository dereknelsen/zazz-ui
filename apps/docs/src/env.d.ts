// Interest Invokers (`interestfor`, polyfilled by the kit) aren't in Astro's JSX types yet.
declare namespace astroHTML.JSX {
  interface ButtonHTMLAttributes {
    interestfor?: string | undefined | null;
  }
}
