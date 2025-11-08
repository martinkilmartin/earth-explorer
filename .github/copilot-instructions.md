# Earth Explorer - AI Coding Agent Instructions

## Project Overview
Earth Explorer is a Progressive Web App (PWA) showcasing interactive world exploration using Phaser 3 game engine. It renders GeoJSON country polygons with custom coloring, supports pan/zoom/pinch gestures, and works fully offline via service worker caching.

## Architecture & Data Flow

### Core Components
- **`js/game.js`** - Main game logic via `EarthExplorerGame` class
  - Loads `assets/world.geo.json` (200+ countries)
  - Projects GeoJSON (lon/lat) to Mercator-like 2D coordinates using custom projection
  - Manages Phaser canvas, containers, graphics objects, and user interactions
  - Exports `bootstrapGame()` and sets `window.__EARTH_EXPLORER_GAME__` + `window.__EARTH_EXPLORER_READY__` for testing
- **`js/countryColors.js`** - Color generation system
  - `BASE_FLAG_OVERRIDES` provides hardcoded colors for ~30 countries (e.g., `CAN: 0xd62828`)
  - Falls back to deterministic hash-based HSL colors using golden ratio conjugate
  - Returns `{ baseColor, highlightColor }` pairs for hover/selection states
- **`sw.js`** - Service worker implementing cache-first strategy with precached assets
- **`index.html`** - Loads Phaser from CDN, bootstraps game, registers service worker

### Key Data Structures
```javascript
// ProjectedCountry - output of GeoJSON processing
{
  name: string,         // Full country name
  iso3: string,         // 3-letter code (e.g., "USA")
  iso2: string,         // 2-letter code (e.g., "US")
  baseColor: number,    // Hex color for normal state
  highlightColor: number, // Hex color for hover/active
  segments: [           // Array of polygon segments
    { points: [{ x, y }] } // Projected coordinates
  ]
}
```

## Testing Strategy

### Unit Tests (Vitest)
- **Environment**: `happy-dom` with Phaser stubs (`tests/setup/phaserStub.js`)
- **Versions**: Vitest 4.x, happy-dom 20.x
- **Fixture**: `tests/fixtures/world_small.geo.json` (subset of countries)
- **Pattern**: Import `EarthExplorerGame` directly, construct with mock GeoJSON
- **DOM access**: Tests use `document.getElementById('selectionDetails')` - DOM elements must exist
- **Coverage thresholds**: 90% statements/lines, 89% functions, 70% branches

### E2E Tests (Playwright)
- **Test server**: `tests/server.js` - minimal Node.js static file server for automated tests
- **Dev server**: `server.py` - Python HTTP server for manual testing (`npm run dev`)
- **Pattern**: Wait for `window.__EARTH_EXPLORER_READY__` before assertions
- **Access**: Use `page.evaluate(() => window.__EARTH_EXPLORER_GAME__)` to interact with game instance
- **Configuration**: Single Chromium project, runs test server automatically via `webServer` config

### Running Tests
```bash
npm run test:unit      # Vitest with coverage
npm run test:ui        # Playwright headless
npm run test:ui:headful # Playwright with browser UI
npm run ci             # Full suite: typecheck + unit + e2e
```

## Development Server

### Local Testing
- **Python server**: `npm run dev` or `npm run serve` (requires Python 3)
- **Server script**: `server.py` - simple HTTP server with proper MIME types
- Default: `http://127.0.0.1:8000`
- Environment variables: `PORT` and `HOST` to customize
- Service worker cache headers: `sw.js` served with `no-cache` for development

## TypeScript & Tooling

### JSDoc-based Type Checking
- **No transpilation** - JavaScript files checked via `@ts-check` comments
- **Type definitions**: `types/phaser.d.ts` (minimal Phaser API), `types/global.d.ts`
- **Triple-slash refs**: `/// <reference path="../types/phaser.d.ts" />` at file tops
- **Phaser access**: `const Phaser = window.Phaser;` with type assertion `/** @type {any} */ (window).Phaser`
- Run `npm run typecheck` to validate without emitting files

### Custom Type Definitions
Define game-specific types via JSDoc `@typedef`:
```javascript
/**
 * @typedef {Object} ProjectedSegment
 * @property {{ x: number, y: number }[]} points
 */
```

## Project-Specific Conventions

### Module System
- **ES Modules only** (`"type": "module"` in package.json)
- Import assertions for JSON: `import data from './file.json' assert { type: 'json' }`
- Named exports preferred: `export class EarthExplorerGame` and `export async function bootstrapGame()`

### Projection & Coordinate System
- Input: GeoJSON with `[longitude, latitude]` arrays
- Output: Mercator-like projection centered on world centroid, scaled to fit 2048×1152 target
- **Simplification**: Removes points closer than 1.4px to reduce vertex count
- **World bounds**: Calculated during projection, stored as Phaser.Geom.Rectangle

### Color System Details
- Override colors first checked by ISO3, then ISO2, then fall back to hash
- Hash uses string code → golden ratio conjugate → HSL with bounded saturation/lightness
- Highlight colors derived via hue rotation (+22°) from base colors

### DOM Integration Pattern
Game manipulates DOM directly:
```javascript
const selectionDetailsEl = document.getElementById('selectionDetails');
selectionDetailsEl.innerHTML = `<div class="selection-label">Selected</div>...`;
```
UI state is **not** stored in React/Vue - use vanilla DOM manipulation.

### Service Worker Approach
- Cache name: `'earth-explorer-v1'` (increment for breaking changes)
- Precache includes Phaser CDN URL - **must update if Phaser version changes**
- Cache-first strategy: serve from cache, fall back to network

## Common Tasks

### Adding a New Country Color Override
1. Edit `js/countryColors.js` → `BASE_FLAG_OVERRIDES` object
2. Use ISO3 code as key (e.g., `NOR: 0x002868`)
3. Test with `npm run test:unit` - color tests validate overrides

### Changing Projection Parameters
1. Edit `prepareWorldAtlas()` in `js/game.js`
2. Adjust `targetWidth`, `targetHeight`, or projection formula
3. Verify with `npm run test:unit` (checks bounds) and `npm run test:ui` (visual)

### Modifying Test Fixtures
- Unit tests use `tests/fixtures/world_small.geo.json`
- E2E tests use full `assets/world.geo.json`
- Keep fixture structure identical to production GeoJSON schema

### Updating Dependencies
- **Phaser version**: Update `index.html` CDN URL + `sw.js` precache + `phaserStub.js` test stub
- Bump `CACHE_NAME` in `sw.js` after any asset changes to force cache refresh

## Performance Considerations
- Target device: **Amazon Fire 7 tablet** (low-end hardware)
- Polygon simplification reduces render load (see `simplifyPath()`)
- Canvas-based rendering via Phaser (not WebGL by default)
- Service worker ensures fast subsequent loads
