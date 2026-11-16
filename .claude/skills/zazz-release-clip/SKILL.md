---
name: zazz-release-clip
description: Build a looping feature clip for a Zazz release post (or any docs page) as mock UI in plain HTML and CSS keyframes, styled with Zazz tokens and the primitive's own --ui-* hooks, then verify it frame by frame. Use when a release post or doc needs a visual explainer for a concept, such as a drag, a layout change, or a state change.
metadata:
  internal: true
---

# Zazz release clip

A looping product clip for a release post: mock UI in plain HTML and CSS keyframes, with no video, GIF, or JavaScript. It lives in the docs site as an Astro component and is placed in a post as a Markdoc tag. It is styled with the kit, so it follows the theme, dark mode, and `--radius-multiplier` the way the real primitive does.

Existing clips to copy from: `apps/docs/src/components/clips/GalleryClip.astro` (0.13), `DrawerClip.astro` and `ToastClip.astro` (0.14).

## Before building

- **Pick one flow per clip**, such as "a drawer opens at its first snap point, settles, and is flicked closed". If the request names no flow, offer three or four from the changelog entry the clip explains.
- **Read the real primitive first**: its example HTML (`packages/core/src/primitives/<name>/*.html`) for labels and slot names, its CSS header and `:root` hooks for colors and sizes, and its script's `@fileoverview` for behavior and thresholds (the toaster's 45px, the drawer's quarter-height close). Copy labels and numbers exactly. Simplify, but never invent a feature, a control, or an outcome the kit doesn't produce. Use Acme-style sample data.

## Where it goes

1. `apps/docs/src/components/clips/<Name>Clip.astro`: a frontmatter block with only a doc comment (the flow, where the numbers come from, any simplification), then the markup, then a scoped `<style>`.
2. Register it in `apps/docs/markdoc.config.mjs` next to `gallery-clip`:

   ```js
   "drawer-clip": {
     render: component("./src/components/clips/DrawerClip.astro"),
     selfClosing: true,
   },
   ```

3. Place it in the post with `{% drawer-clip /%}`, after the paragraph that introduces the concept.

A running `astro dev` does not reload `markdoc.config.mjs`. After registering a tag, or after a checkout that changes the file, restart the docs dev server, or the post fails with `Undefined tag`.

## Styling with Zazz

Use the kit wherever a value has a token or hook, and fall back to a literal only where scaling or physics demands it. Don't add fallbacks to `var()`: the docs site always loads the kit.

| Value                     | Use                                                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces, text, borders   | `--color-*` roles (`--color-muted` stage, `--color-card`, `--color-foreground`, `--color-muted-foreground`, `--color-border`, `--color-primary`)                                                                                                                 |
| The primitive's own parts | its hooks: `--ui-drawer-bg`, `--ui-drawer-shadow`, `--ui-drawer-handle-bg` and `-bg--dragging`, `--ui-toaster-bg`, `--ui-toaster-border-color`, `--ui-toaster-shadow`, `--ui-toaster-title-font-weight`, `--ui-toaster-scale-step`, `--ui-dialog-backdrop-color` |
| Type                      | `--font-family-body`, `--font-family-heading`, `--font-family-mono`; `--font-weight-heading`, `--font-weight-strong`; `--leading-*`, `--tracking-*`                                                                                                              |
| Shadows, pills            | `--shadow-*` or the primitive's shadow hook; `--radius-full`                                                                                                                                                                                                     |
| Spacing and radii         | the em mirror below, never raw `rem`                                                                                                                                                                                                                             |
| Physical objects          | literals: a phone bezel (`--color-neutral-950` is fine), a mouse pointer, a fingertip, a terminal                                                                                                                                                                |

**Lengths scale in em.** The stage sets `font-size: 2.2cqw`, so the clip shrinks like a video. The kit's spacing and radii are in `rem` and would stay full size on a phone, so give the clip an em copy of `--spacing` and write every length as a kit multiple of it:

```css
.fc-xx {
  --fc-spacing: 0.25em; /* --spacing is 0.25rem; 1em ≈ 1rem at full width */
  --fc-radius-sm: calc(var(--fc-spacing) * 1.5 * var(--radius-multiplier));
  --fc-radius-md: calc(var(--fc-spacing) * 2.5 * var(--radius-multiplier));
  --fc-radius: calc(var(--fc-spacing) * 4.5 * var(--radius-multiplier)); /* the stage: radius-lg */
  --fc-radius-xl: calc(var(--fc-spacing) * 7 * var(--radius-multiplier));
  container-type: inline-size;
  width: 100%;
  aspect-ratio: 740 / 415;
  margin: 0;
  margin-block: var(--space-lg);
}
```

The multiples are the kit's: `--radius-md` is `--spacing × 2.5`, `--ui-toaster-p` is `× 4`, `--ui-drawer-handle-w` is `× 12`. Reading `--radius-multiplier` means a square theme gets a square clip. Nest radii concentrically, inner = outer minus the padding between them (`max(0em, …)`), or a little smaller when the gap is large.

Copy the primitive's real behavior too. A collapsed toast stack hides the content of the toasts behind the front one. A drawer's backdrop is `--ui-dialog-backdrop-color` and darkens with how much of the sheet shows.

## Story and keyframes

- **3 or 4 beats** on a 10-second, 0 to 100% timeline. Fade the body in over the first 3% and out over the last 4%.
- **The base styles are the last frame.** With no keyframes, every element must already look finished, so anything that leaves during the loop has `opacity: 0` at base.
- **Share timing**: labels sit in one grid cell and swap with `step-end` (two labels mid-fade smear). Type text by stepping `clip-path: inset(0 100% 0 0)` to `inset(0)` with `steps()` sized to the character count.
- **Pointer**: a mouse pointer's tip is its top-left corner (`transform-origin: 0 0`); a fingertip is placed by its center (`translate: -50% -50%`). Give it its own keyframes with `top`/`left` percentages and a brief `scale: 0.8` per press, and move it 1:1 with the thing it drags.
- **Three engine and build traps:**
  - Name the keyframes in every `animation` shorthand. The docs build's minifier turns a nameless one into `none`.
  - Never animate `display`. WebKit ignores it in keyframes; place things with registered `<number>` custom properties instead (GalleryClip).
  - `animation-timing-function` inside `@keyframes` ignores `var()`. Write the curve out (`cubic-bezier(0.32, 0.72, 0, 1)` for the drawer) with a comment naming the hook it copies. A `var()` in a keyframe's property values works, such as `scale: calc(1 - var(--ui-toaster-scale-step))`.
- **Reduced motion**: stop everything, hide the pointer, and, where the last frame says little (a closed drawer, one toast left), override the base to show the most telling frame:

  ```css
  @media (prefers-reduced-motion: reduce) {
    .fc-xx-body,
    .fc-xx-body * {
      animation: none !important;
    }
    .fc-xx-cursor {
      display: none;
    }
  }
  ```

- **Accessibility**: `role="img"` and an `aria-label` describing the whole loop on the stage, and `aria-hidden="true"` on the animated body.

## Check it

The scripts in `scripts/` run against the kit's built CSS and need no docs server. Run `vp run core#build` first, then:

```bash
S=.claude/skills/zazz-release-clip/scripts
OUT=<scratchpad>/clips                       # never inside the repo
python3 $S/harness.py DrawerClip $OUT          # standalone page with the kit's CSS
$S/frames.sh $OUT DrawerClip light 7 25 37 49 68 90
$S/frames.sh $OUT DrawerClip dark 14 45 60
$S/sheet.sh $OUT DrawerClip sheet.png          # contact sheet of every captured frame
```

Then, with `agent-browser` on the harness page (`agent-browser eval`):

1. **Beats**: look at the contact sheet yourself, in both themes. Themed surfaces must change, and inner radii must sit inside outer ones.
2. **Pointer on target**: pause every animation at each press (`document.getAnimations().forEach(a => { a.pause(); a.currentTime = pct * 100 })`) and compare the pointer's tip or center with the target's rect. Within 2px, and constant while dragging.
3. **No overflow at 390px**: `document.documentElement.scrollWidth <= innerWidth`.
4. **Reduced motion** (`agent-browser set media light reduced-motion`): no running animations, pointer hidden, a frame that reads on its own.
5. **Tokens exist**: every `var(--…)` the clip names, other than its own `--fc-*`, is declared in `packages/core/src`:

   ```bash
   grep -oE 'var\(--[a-z0-9-]+' <clip>.astro | sed 's/var(//' | sort -u | grep -v '^--fc-' |
     while read v; do grep -rqE -e "^[[:space:]]*$v:" packages/core/src/base packages/core/src/primitives || echo "MISSING $v"; done
   ```

6. **The build keeps the animations**: after `vp run docs#build`, count the clip's named animations in `apps/docs/dist/_astro/*.css` and compare with the source.

## Deliver

Report the flow, the beat timeline, where each number and label came from, any simplification, and the check results, with the contact sheet's path. Write the post's prose around the clip with the `humanizer` skill.
