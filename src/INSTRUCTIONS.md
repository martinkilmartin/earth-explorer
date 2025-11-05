# Earth Explorer AI Collaboration Instructions

## 1. Context
- Personal side project: Phaser-based “Earth Explorer” PWA built for the user’s children.
- Stack: Plain JavaScript + Phaser, service worker, GeoJSON world map already rendering with hover/select UI.
- Goal: Iterate quickly with heavy AI involvement while preventing regressions via strong automated tests.

## 2. Sequential Task Chunks

### Chunk A – Enable JSDoc + `ts-check`
1. Add `jsconfig.json` enabling `checkJs`.
2. Annotate existing modules with JSDoc typedefs (color resolver, projection helpers, etc.).
3. Verify build/dev scripts still run (`npm start`, `npm run build`).

### Chunk B – Unit Testing Setup (Vitest)
1. Install `vitest` and `happy-dom` (or `jsdom`).
2. Create `vitest.config.js` with jsdom/happy-dom environment.
3. Write unit tests for:
   - Country color resolver
   - GeoJSON projection/normalization utilities
   - Service-worker-related helpers (if any)
4. Update npm scripts (`npm test`) to run Vitest.

### Chunk C – UI Smoke Tests (Playwright)
1. Install `@playwright/test` and run `npx playwright install`.
2. Add tests that:
   - Launch the app and wait for the canvas to render
   - Verify at least one known country polygon exists
   - Confirm hover highlights update the selection panel
   - Test zoom/reset controls
   - Assert service worker registration succeeds
3. Add `npm run test:ui` (or similar) for Playwright.

### Chunk D – Fixtures & Data Validation
1. Create reduced GeoJSON fixtures (`tests/fixtures/world_small.geo.json`).
2. Point unit tests to fixtures for speed.
3. Optional: add schema or lint script to validate the production GeoJSON after AI edits.

### Chunk E – Combined Automation
1. Add `npm run ci` that chains unit + UI tests.
2. Document workflow in README: run `npm test` + `npm run test:ui` (or `npm run ci`) before merging AI-generated changes.

## 3. Notes for Future Enhancements
- If Headless UI testing is too heavy, replace Playwright with Cypress while keeping identical coverage goals.
- Consider migrating to TypeScript once test coverage stabilizes; current plan keeps JavaScript lean.
- Monitor GeoJSON bundle size; split data if future changes make it too large.

## 4. Questions for Future AI Sessions
1. Will any build scripts require updates after adding `ts-check`, Vitest, or Playwright?
2. Are additional fixtures (icons, manifest) needed for headless tests?
3. Preferred command naming convention (`npm test`, `npm run test:unit`, etc.)?
4. Should the full GeoJSON dataset also be validated in automated checks?

## 5. Guardrails for Assistants
- Do **not** modify `assets/world.geo.json` without explicit instruction (large, production data).
- Leave PWA manifest and service worker cache lists untouched unless a task explicitly calls for changes.
- Avoid altering Phaser configuration unless the current chunk demands it.

Follow the chunks in order, creating a new chat per chunk to conserve context. Each chat should begin with the relevant chunk plus any answered questions from prior steps.
