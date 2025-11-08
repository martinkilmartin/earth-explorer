import { test, expect } from '@playwright/test';

async function loadApp(page) {
  await page.goto('/');
  await page.waitForFunction(() => {
    return typeof window !== 'undefined' && window.__EARTH_EXPLORER_READY__ === true;
  }, null, { timeout: 15_000 });
}

test.describe('Earth Explorer UI smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  test('renders globe canvas and populates countries', async ({ page }) => {
    await expect(page.locator('#gameCanvas')).toBeVisible();

    const { countryCount, segmentCount, knownCountry } = await page.evaluate(() => {
      const game = window.__EARTH_EXPLORER_GAME__;
      const countries = game.projectedCountries;
      const known = countries.find(country => country.iso3 === 'USA' || country.iso3 === 'CAN') ?? countries[0];
      return {
        countryCount: countries.length,
        segmentCount: known?.segments?.length ?? 0,
        knownCountry: known?.name ?? null
      };
    });

    expect(countryCount).toBeGreaterThan(0);
    expect(segmentCount).toBeGreaterThan(0);
    expect(knownCountry).not.toBeNull();
  });

  test('zooms to country and displays label on selection', async ({ page }) => {
    const { zoomChanged, hasText, countryName } = await page.evaluate(() => {
      const game = window.__EARTH_EXPLORER_GAME__;
      const target = game.projectedCountries.find(country => country.iso3 === 'JPN') ?? game.projectedCountries[0];
      
      const before = game.zoom;
      game.setActiveCountry(target);
      const after = game.zoom;
      
      return {
        zoomChanged: Math.abs(before - after) > 0.001,
        hasText: game.activeCountryText !== null,
        countryName: target.name
      };
    });

    expect(zoomChanged).toBe(true);
    expect(hasText).toBe(true);
    expect(countryName).toBeTruthy();

    // Clear selection
    await page.evaluate(() => {
      const game = window.__EARTH_EXPLORER_GAME__;
      game.setActiveCountry(null);
    });

    const { hasTextAfterClear } = await page.evaluate(() => {
      const game = window.__EARTH_EXPLORER_GAME__;
      return {
        hasTextAfterClear: game.activeCountryText !== null
      };
    });

    expect(hasTextAfterClear).toBe(false);
  });

  test('supports zoom controls and reset view button', async ({ page }) => {
    const { initialScale, zoomedScale } = await page.evaluate(() => {
      const game = window.__EARTH_EXPLORER_GAME__;
      const container = game.worldContainer;
      const before = container.scaleX;
      game.setZoom(game.zoom * 1.5);
      return {
        initialScale: before,
        zoomedScale: container.scaleX
      };
    });

    expect(zoomedScale).toBeGreaterThan(initialScale);

    await page.locator('#resetView').click();

    const resetScale = await page.evaluate(() => {
      const game = window.__EARTH_EXPLORER_GAME__;
      return game.worldContainer.scaleX;
    });

    expect(resetScale).toBeCloseTo(initialScale, 2);
  });

  test('registers service worker successfully', async ({ page }) => {
    const registered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      const existing = await navigator.serviceWorker.getRegistration('/sw.js');
      if (existing) {
        return true;
      }

      const ready = await navigator.serviceWorker.ready;
      return ready?.active?.scriptURL?.endsWith('/sw.js') ?? false;
    });

    expect(registered).toBe(true);
  });
});
