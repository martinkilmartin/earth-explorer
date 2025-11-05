# Earth Explorer

## Prerequisites

- Node.js 18+
- `npm install`
- Required browsers for Playwright (`npx playwright install`)

## Available Scripts

- `npm run typecheck` – run TypeScript in no-emit mode across JS files.
- `npm run test:unit` – execute Vitest with coverage (happy-dom environment).
- `npm run test:ui` – run Playwright smoke tests headless. Use `npm run test:ui:headful` for headed mode.
- `npm run ci` – sequentially run typecheck, unit tests, and UI smoke tests.

## Testing Workflow

1. Install dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install`
3. Run `npm run ci` before shipping changes.

Vitest relies on Phaser stubs and a lightweight GeoJSON fixture. Playwright boots a static server from `tests/server.js` to serve the PWA locally and uses DOM hooks to control hover, selection, and zoom interactions.
