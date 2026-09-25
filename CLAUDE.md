# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Blueprint Studio is a Nuxt 4 + Nuxt UI + Pinia single-page app for designing a blueprint grid and exporting it as a print-ready desk mat, mouse pad or wallpaper (SVG or PNG).

## Commands

Package manager is pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest run (tests/**/*.spec.ts)
pnpm lint         # eslint .
pnpm typecheck    # nuxt typecheck
pnpm build
```

Single test: `pnpm vitest run tests/blueprint.spec.ts -t "<test name>"`.

CI (`.github/workflows/ci.yml`) runs lint, typecheck and test on every push. ESLint's config imports `.nuxt/eslint.config.mjs`, so `nuxt prepare` (run by `postinstall`) must have run before linting.

## Architecture

**One SVG builder, two modes.** Everything visual goes through `buildBlueprintSvg` in `app/utils/blueprint/svg.ts`:
- `mode: 'viewport'` — the full-window background (`BlueprintCanvas.vue`). An unbounded field whose origin is centred on the window, drawn with SVG `<pattern>`s, in px (`PX_PER_MM * zoom`).
- `mode: 'sheet'` — a finished export file, in mm, with bleed, border and clipped crosses. Used by `export.ts` (`exportSvg`) and the export preview.

SVG strings are rendered via `v-html`; this is safe only because colours are validated as `#rrggbb` (store `setColor` and the persist `afterHydrate` check) and numbers come from the store. Keep that invariant if adding user-controlled values.

**Geometry is pure and separate from markup.** `app/utils/blueprint/geometry.ts` computes lines/points/labels (`viewportGeometry`, `sheetGeometry`); `svg.ts` only serialises them. `fmt()` mimics Python's `:g` formatting.

**Styles are composable layers; presets bundle them.** `BlueprintDesign.style` (`GridStyle` in `constants.ts`) toggles each layer independently: major/minor as lines, dots or off, crosses (+ on edges), border, grid fit (`cells`/`sheet`) and margin, rulers (sides, units, clearance), title block, and stroke `weights`. `STYLE_PRESETS` set `style` + `cross` (never spacing or colours). The selected preset is derived (`matchStylePreset` in `style.ts`), not stored. `normalizeStyle` validates/clamps any style, including persisted state.

**Sheet output must match the original Python generators.** The `grid` preset ports `make_blueprint.py` and the `rulers` preset `make_blueprint_rulers.py`. The tests compare our `<line>`/`<text>` output against reference SVGs in `tests/fixtures/` group-by-group (`minor-grid`, `major-grid`, `plus-signs`, …). Changing those presets, sheet geometry, group ids, or number formatting will break these — treat the fixtures as the spec.

**State lives in one Pinia setup store** (`app/stores/blueprint.ts`). Design + zoom + export settings persist to `localStorage` under key `blueprint-studio` (via `pinia-plugin-persistedstate`); drawer open state does not. `afterHydrate` migrates older saves (`layout: 'grid' | 'rulers'`, four colours) to the style model. Mutations go through store actions that clamp/validate (limits in `constants.ts`). Because of window size and localStorage, `/` is client-only (`routeRules: { '/': { ssr: false } }`).

**Export** (`app/utils/blueprint/export.ts`): print target is in mm with bleed and DPI; screen target is in px with a 1–3x scale. PNG is rasterised through a canvas, so `exceedsCanvasLimit` / `canvasCanHold` guard browser canvas size limits.

## Conventions

- ESLint stylistic: no trailing commas, `1tbs` braces. `eslint-plugin-better-tailwindcss` checks classes against `app/assets/css/main.css` (including object values in `:ui` bindings).
- Theme tokens are Tailwind v4 `@theme` colours prefixed `bp-` (`text-bp-text`, `border-bp-hairline`, …) in `main.css`; the live design colours are passed as CSS vars (`--bp-bg`, `--bp-major`, …) from `pages/index.vue`. Global element styling is scoped under `[data-bp-root]`.
- Components in `app/components/blueprint/` are auto-imported with the `Blueprint` prefix (e.g. `edit/EditPanel.vue` → `<BlueprintEditPanel>`).
