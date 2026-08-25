# 13-separator

Status: resolved
Type: task

Separator primitive on native <hr>.

## Answer

.ui-separator (class-form, semantic hr root per ADR-0001) with --ui-separator-color/-thickness;
data-orientation="vertical" stretches in flex/grid rows (1lh flow fallback). Migrated the
toolbar separator divs and all menu/menubar/components.html hrs onto it; docs page with the
meaningful-vs-decorative guidance (aria-orientation vs role=presentation).

## Comments
