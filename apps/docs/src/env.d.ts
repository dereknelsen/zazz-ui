interface ImportMetaEnv {
  readonly GOOGLE_FONTS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Interest Invokers (`interestfor`, polyfilled by the kit) aren't in Astro's JSX types yet.
declare namespace astroHTML.JSX {
  interface ButtonHTMLAttributes {
    interestfor?: string | undefined | null;
  }
}

/// <reference types="astro/client" />
