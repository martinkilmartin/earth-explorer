# Earth Explorer

Progressive Web App for interactive world exploration using Phaser 3 game engine.

🌍 **Live Demo:** [https://martinkilmartin.github.io/earth-explorer/](https://martinkilmartin.github.io/earth-explorer/)

## Features

- 🗺️ Interactive world map with GeoJSON country data
- 🎨 Unique colors for each country
- 🔍 Double-click to zoom to any country
- 📱 Responsive design (mobile & desktop)
- 📴 Offline support via service worker
- 🎯 Orientation-aware action bar (left in landscape, bottom in portrait)

## Prerequisites

- Python 3.6+ (for local development server)
- Node.js 18+ (for testing and type checking)
- `npm install`
- Required browsers for Playwright (`npx playwright install`)

## Development

- `npm run dev` or `npm run serve` – start Python HTTP server at <http://127.0.0.1:8000>
  - Customize with `PORT` and `HOST` environment variables
  - Example: `PORT=3000 npm run dev`

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

## GitHub Pages Deployment

The app is automatically deployed to GitHub Pages on every push to `main` branch via GitHub Actions.

### Setup Instructions

1. Go to your repository Settings → Pages
2. Under "Build and deployment":
   - Source: **GitHub Actions**
3. Push to `main` branch to trigger deployment
4. Visit `https://<username>.github.io/<repository-name>/`

The deployment workflow:

- Runs all tests (`npm run ci`)
- Uploads the entire project as-is
- Deploys to GitHub Pages
- Uses relative paths for compatibility with subdirectory hosting

