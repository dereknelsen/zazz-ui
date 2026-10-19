// Monaco's side-effect modules (language registrations) ship without declaration files.
declare module "monaco-editor/basic-languages/monaco.contribution";
declare module "monaco-editor/language/html/monaco.contribution";

// Interest Invokers (`interestfor`, polyfilled by the kit) aren't in Astro's JSX types yet.
declare namespace astroHTML.JSX {
  interface ButtonHTMLAttributes {
    interestfor?: string | undefined | null;
  }
}
