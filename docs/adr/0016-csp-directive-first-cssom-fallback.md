# Strict CSP: recommend `style-src-attr`, fall back to the CSSOM

Status: accepted (2026-10-13). Resolves the strict-CSP exclusion recorded in ADR-0012.

## Context

- Every utility is a custom property in a `style` attribute (ADR-0012). A Content Security Policy without `'unsafe-inline'` for styles makes the browser keep the attribute in the DOM and decline to apply it: the kit's `[style*="--p:"]` gates still match, the values never reach the element, and every utility on the page is gone. Primitives, presets, switches, and hooks in a stylesheet are unaffected.
- ADR-0012 named the path ("a shim that copies into `el.style` via CSSOM") and left it unbuilt. SPEC §15 listed strict CSP as out of scope. Feedback in 2026-10 called it a dealbreaker for security-sensitive apps and asked whether the kit should offer an alternate build, as Alpine does for its CSP users.
- Two facts decide the shape. CSP Level 3 has `style-src-attr`, a directive for the attribute alone, supported in Chrome 75, Firefox 108, and Safari 15.4, inside the kit's browser floor; a policy can nonce or origin-lock every stylesheet and still allow the attribute. And the CSP specification does not govern the CSSOM: `element.style.setProperty()` is not inline style, while `setAttribute("style", …)` and `style.cssText = …` are and stay blocked.
- Alpine needs a separate build because its mechanism, evaluating expressions, has no directive that admits it safely. The kit's mechanism has one.

## Decision

- **The recommendation comes first.** The documented policy is `style-src-elem` locked to the origin or a nonce, `style-src-attr 'unsafe-inline'`, and strict fetch directives (`img-src`, `font-src`, `connect-src`), which is where exfiltration is stopped. The docs page `install/security` carries the header and the reasoning: an attribute cannot import, run, or fetch on its own, so allowing it concedes layout and color on an element that an attacker who can inject markup already controls. `'unsafe-hashes'` with per-value hashes is noted for static sites.
- **A fallback ships, auto-detected, for policies that forbid the attribute anyway.** `base/csp.ts` reads each `style` attribute with the shared parser (`base/declarations.ts`) and writes its declarations with `setProperty`, then watches attribute writes and inserted subtrees. `index.ts` loads it only after finding a styled element whose declaration block is empty, the signature of a blocked attribute, so a compliant page never fetches it and the kit writes no probe that would raise a violation report. `data-ui-guard="off"` opts an element out. The documented costs: utilities then need JavaScript and apply after the module runs.
- **`buildHead` takes a `nonce`** for its two inline scripts (the import map and the theme script), so the head itself passes a strict `script-src`.
- **Sanitizers are a limit, not a bug.** Content that passes through a sanitizer which strips `style` uses the channels that survive: identities, switches, presets, slots, and hooks set in a stylesheet. The docs say so, and say to check what the sanitizer in use keeps.

## Considered options

- **An alternate build** that reads utilities from a different channel: rejected. There is no channel a strict policy allows that the `style` attribute does not, once the CSSOM path exists, and a second syntax doubles the authoring surface, the editor data, and the audit.
- **A `data-ui-style` attribute** as the CSP channel (ADR-0012's sketch): rejected for the same reason. The attribute text already carries everything; copying it from `style` needs no second attribute, and keeps one spelling for markup, the linter, and the docs.
- **Loading the fallback unconditionally**: rejected. It is dead weight on every compliant page, and it would have to run before first paint to avoid the flash, which no deferred module can.
- **A probe element** for detection (`setAttribute("style", …)` on a scratch node and checking the block): rejected because a blocked write raises a violation report on every page load, which a security team reads as the kit misbehaving.

## Consequences

- SPEC §15's exclusion is replaced by the directive, the detection, and the fallback. The style guard keeps its own parser for now; it could share `declarations.ts` later.
- The manifest gains `CORE_FALLBACKS` (file, the scripts it requires, and a named gate) beside `CORE_POLYFILLS`, whose entries keep their `CSS.supports` shape because the published CLI drops the whole list when one entry lacks it. The CLI vendors and wires fallbacks whose gate it knows; an older CLI ignores the list, so a vendored project gets the fallback with its next CLI release. The manifest test pins that every dynamic import in `index.ts` is listed in one of the two.
- Verified by `base/csp.browser.test.ts`, which runs the kit inside a `srcdoc` iframe whose `<meta http-equiv>` policy is `style-src-attr 'none'`: the blocked state, the detection, the recovery with `!important` intact, reapplication after a later blocked write, and the opt-out.
