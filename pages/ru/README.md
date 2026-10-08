# Trailkin — static pages

37 screens of the interactive prototype exported as plain HTML + CSS. **No JavaScript is included and nothing is wired up.**

## Structure
```
index.html            list of all pages
pages/NN-name.html    one file per screen
css/base.css          shared: design tokens, app shell, components (same for every page)
css/pages/NN-name.css page-specific styles (one per page; classes u1, u2, ... )
```
Open `index.html` (or any page) straight from disk. Fonts (Fraunces, IBM Plex Sans) load from Google Fonts.

## Where to wire the buttons
Every interactive element keeps a placeholder attribute with the **original prototype handler as a hint** (it is never executed):

| attribute | meaning |
|---|---|
| `data-action` | what a click did in the prototype, e.g. `go('home')` |
| `data-on-input` | what typing / dragging did |
| `data-on-change` | what a select / file input did |

Each `<button>` also has a `<!-- TODO: wire up button — label -->` comment above it.
Attach your own listeners with e.g. `document.querySelectorAll('[data-action]')`.

## Notes
- Text is in Russian; the other language lives in the sibling folder (en/ and ru/ are identical in structure).
- Sample content (names, dates, trails) is placeholder data used to show each screen filled in.
- Screens with optional controls are exported with them visible (e.g. Plan an event / Schedule route show the group-size slider and ride seats).
- The bottom tab bar and top bar are included on every screen where the prototype shows them.
- Maps are the same schematic SVG routes as in the prototype, not live map tiles.
