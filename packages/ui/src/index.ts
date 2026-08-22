/**
 * @fileoverview Zazz — single entry point for every component script.
 * @description Imports all Zazz behavior modules so a page needs only one
 * `<script type="module" src=".../index.js">` instead of eight separate tags.
 * Each module runs for its side effects: global/utility setup, scroll-reveal
 * and carousel auto-initialization, SPA navigation, and the custom-element
 * registrations (`<ui-carousel>`, `<ui-lightbox>`, `<ui-password>`,
 * `<ui-tabs>`, `<ui-toaster>`).
 *
 * Internal dependencies are resolved by the module graph — utils loads
 * before embla, embla before carousel, carousel before lightbox — so the
 * import order below is for readability, not correctness.
 *
 * External dependency: Embla carousels also need the Embla CDN UMD bundles
 * loaded as `defer` scripts *before* this module (embla reads them as
 * globals). Defer scripts and module scripts execute in document order, so
 * place the CDN `<script defer>` tags ahead of this one. Omit them on pages
 * with no carousels — embla only touches those globals when a carousel
 * is present.
 */

import "./base/utils.ts";
import "./base/reveal.ts";
import "./base/embla.ts";
import "./ui/carousel/carousel.ts";
import "./ui/lightbox/lightbox.ts";
import "./ui/password-group/password-group.ts";
import "./ui/tabs/tabs.ts";
import "./ui/toaster/toaster.ts";
import "./base/navigation.ts";
