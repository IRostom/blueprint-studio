# Blueprint Studio

Design a blueprint grid and export it as a print-ready desk mat, mouse pad or wallpaper.

Built with [Nuxt 4](https://nuxt.com), [Nuxt UI](https://ui.nuxt.com) and [Pinia](https://pinia.vuejs.org), starting from the [Nuxt UI starter template](https://github.com/nuxt-ui-templates/starter).

## Features

- Full-window blueprint background, centred on the window, with Ctrl + scroll zoom (50–400%).
- Two layouts: **Grid + crosses** and **Rulers + dots** (cm/inch rulers and a title block).
- Major spacing, subdivisions, cross size, four themes and custom colours.
- Export for print (mm, with bleed and trim preview) or screen (px), as SVG or PNG (150/300/600 dpi or 1–3x).
- Design settings persist in `localStorage`.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # geometry and export tests
pnpm lint
pnpm typecheck
```

## Structure

- `app/stores/blueprint.ts`: Pinia store for design, zoom, export settings and drawer state.
- `app/utils/blueprint/`: pure geometry, the shared `buildBlueprintSvg` builder and export helpers.
- `app/components/blueprint/`: the page UI (buttons, drawers, Edit and Export panels).
- `tests/`: Vitest suite. `tests/fixtures/` holds the reference SVGs the export geometry is checked against.

## License

MIT
