import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EarthExplorerGame, bootstrapGame } from '../js/game.js';
import worldFixture from './fixtures/world_small.geo.json' assert { type: 'json' };

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneFeatureByIso3(iso3) {
  const feature = worldFixture.features.find(item => item.properties?.['ISO3166-1-Alpha-3'] === iso3);
  return deepClone(feature ?? worldFixture.features[0]);
}

function buildWorldCollection(...iso3Codes) {
  const codes = iso3Codes.length ? iso3Codes : worldFixture.features.map(item => item.properties?.['ISO3166-1-Alpha-3']);
  return {
    type: 'FeatureCollection',
    features: codes.map(code => cloneFeatureByIso3(code))
  };
}

function cloneWorldFixture() {
  return {
    type: 'FeatureCollection',
    features: worldFixture.features.map(feature => deepClone(feature))
  };
}

class ContainerStub {
  constructor() {
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.name = '';
  }

  removeAll() {
    this.children = [];
  }

  add(child) {
    this.children.push(child);
  }

  setScale(value) {
    this.scale = value;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  setName(name) {
    this.name = name;
  }
}

describe('EarthExplorerGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const loading = document.getElementById('loadingScreen');
    if (loading) {
      loading.style = { opacity: '', pointerEvents: '' };
      loading.remove = vi.fn();
    }
    
    // Set up countryName element if it doesn't exist and reset it
    let countryNameEl = document.getElementById('countryName');
    if (!countryNameEl) {
      countryNameEl = document.createElement('span');
      countryNameEl.id = 'countryName';
      document.body.appendChild(countryNameEl);
    }
    countryNameEl.textContent = ''; // Reset for each test
  });

  it('projects GeoJSON data into normalized segments and world bounds', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);

    game.prepareWorldAtlas();

    expect(game.projectedCountries).toHaveLength(1);
    const country = game.projectedCountries[0];
    expect(country.name).toBe('United States of America');
    expect(country.segments[0].points.length).toBeGreaterThan(3);
    expect(game.worldBounds.width).toBeGreaterThan(0);
    expect(game.worldBounds.height).toBeGreaterThan(0);
    expect(game.worldBounds.x).toBeCloseTo(-game.worldBounds.width / 2);
    expect(game.worldBounds.y).toBeCloseTo(-game.worldBounds.height / 2);
  });

  it('updates active and hovered country state', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);

    game.prepareWorldAtlas();
    const country = game.projectedCountries[0];

    game.setHoveredCountry(country);
    expect(game.hoveredCountry).toBe(country);

    game.setActiveCountry(country);
    expect(game.activeCountry).toBe(country);

    game.setActiveCountry(null);
    expect(game.activeCountry).toBe(null);
  });

  it('filters active pointers to those currently pressed', () => {
    const worldGeoJson = buildWorldCollection();
    const game = new EarthExplorerGame(worldGeoJson);

    game.scene = {
      input: {
        manager: {
          pointers: [
            { id: 1, isDown: true },
            { id: 2, isDown: false }
          ]
        }
      }
    };

    const active = game.getActivePointers();
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(1);
  });

  it('draws world graphics and refreshes styles for hover and selection', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);
    const container = new ContainerStub();
    const graphicsCreated = [];

    game.scene = {
      add: {
        graphics: () => {
          const g = new window.Phaser.GameObjects.Graphics();
          graphicsCreated.push(g);
          return g;
        }
      }
    };

    game.worldContainer = container;
    game.prepareWorldAtlas();
    game.drawWorld();

    const country = game.projectedCountries[0];
    expect(country.graphics).toHaveLength(1);
    const graphic = country.graphics[0].graphics;
    expect(graphic.commands.some(cmd => cmd[0] === 'fillStyle')).toBe(true);

    game.setHoveredCountry(country);
    const hoverFill = graphic.commands.filter(cmd => cmd[0] === 'fillStyle').at(-1);
    expect(hoverFill?.[1]).not.toBe(country.baseColor);

    game.setActiveCountry(country);
    const selectFill = graphic.commands.filter(cmd => cmd[0] === 'fillStyle').at(-1);
    expect(selectFill?.[1]).toBe(country.highlightColor);
  });

  it('clamps zoom and constrains pan based on bounds', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);
    const container = new ContainerStub();

    game.scene = {
      scale: { width: 800, height: 600 }
    };

    game.worldContainer = container;
    game.prepareWorldAtlas();
    game.baseScale = 1;
    game.zoom = 1;

    game.setZoom(0.01);
    expect(game.zoom).toBeCloseTo(0.35, 2);

    game.setZoom(99999, { x: 100, y: 120 });
    expect(game.zoom).toBeCloseTo(game.baseScale * 999, 2);

    game.worldContainer.x = 9999;
    game.worldContainer.y = -9999;
    game.constrainPan();
    const mapHalfWidth = (game.worldBounds.width * game.zoom) / 2;
    const mapHalfHeight = (game.worldBounds.height * game.zoom) / 2;
    const centerX = game.scene.scale.width / 2;
    const centerY = game.scene.scale.height / 2;
    const maxOffsetX = Math.max(0, mapHalfWidth - game.scene.scale.width / 2 + 30);
    const maxOffsetY = Math.max(0, mapHalfHeight - game.scene.scale.height / 2 + 30);

    expect(game.worldContainer.x).toBeLessThanOrEqual(centerX + maxOffsetX + 0.0001);
    expect(game.worldContainer.x).toBeGreaterThanOrEqual(centerX - maxOffsetX - 0.0001);
    expect(game.worldContainer.y).toBeLessThanOrEqual(centerY + maxOffsetY + 0.0001);
    expect(game.worldContainer.y).toBeGreaterThanOrEqual(centerY - maxOffsetY - 0.0001);
  });

  it('resets view and clears active country', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);
    const container = new ContainerStub();

    game.scene = {
      scale: { width: 1024, height: 768 }
    };

    game.worldContainer = container;
    game.prepareWorldAtlas();
    const country = game.projectedCountries[0];
    game.setActiveCountry(country);
    game.resetView();

    expect(game.activeCountry).toBeNull();
    expect(game.worldContainer.x).toBeCloseTo(game.scene.scale.width / 2);
    expect(game.worldContainer.y).toBeCloseTo(game.scene.scale.height / 2);
    expect(game.worldContainer.scale).toBeCloseTo(game.zoom);
  });

  it('handles pinch gesture updates', () => {
    const worldGeoJson = buildWorldCollection();
    const game = new EarthExplorerGame(worldGeoJson);
    game.isPinching = true;
    game.startPinchDistance = 5;
    game.startPinchZoom = 2;
    const pointers = [{ x: 0, y: 0 }, { x: 3, y: 4 }];
    const midpoint = game.getMidpoint(pointers[0], pointers[1]);

    const setZoomSpy = vi.spyOn(game, 'setZoom');
    game.getActivePointers = vi.fn().mockReturnValue(pointers);

    game.handleUpdate();

    expect(setZoomSpy).toHaveBeenCalledWith(game.startPinchZoom, midpoint);

    game.startPinchDistance = null;
    game.handleUpdate();
    expect(game.startPinchDistance).toBeCloseTo(5);
  });

  it('initialises via init and wires handlers during scene lifecycle', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);
    const originalGameClass = window.Phaser.Game;
    let capturedConfig = null;
    window.Phaser.Game = class {
      constructor(config) {
        capturedConfig = config;
      }
      destroy() {}
    };

    const inputHandlers = {};
    const scaleHandlers = {};
    const container = new ContainerStub();
    const sceneStub = {
      add: {
        container: () => container,
        graphics: () => new window.Phaser.GameObjects.Graphics()
      },
      input: {
        addPointer: vi.fn(),
        on: (event, cb) => {
          inputHandlers[event] = cb;
        },
        manager: { pointers: [] }
      },
      scale: {
        width: 800,
        height: 600,
        on: (event, cb) => {
          scaleHandlers[event] = cb;
        }
      }
    };

    try {
      game.init();
      expect(capturedConfig).not.toBeNull();
      expect(capturedConfig.type).toBe(window.Phaser.CANVAS);

      capturedConfig.scene.preload.call(sceneStub);
      expect(sceneStub.input.addPointer).toHaveBeenCalledWith(2);

      capturedConfig.scene.create.call(sceneStub);
      expect(game.scene).toBe(sceneStub);
      expect(typeof scaleHandlers.resize).toBe('function');

      scaleHandlers.resize({ width: 1024, height: 768 });
      expect(game.worldContainer.scale).toBeCloseTo(game.zoom);

      const pointerdown = inputHandlers.pointerdown;
      const pointermove = inputHandlers.pointermove;
      const pointerup = inputHandlers.pointerup;
      const wheel = inputHandlers.wheel;

      sceneStub.input.manager.pointers = [
        { id: 1, isDown: true, x: 0, y: 0 },
        { id: 2, isDown: true, x: 10, y: 0 }
      ];

      pointerdown({ x: 0, y: 0 });
      expect(game.isPinching).toBe(true);

      pointermove({ x: 5, y: 5, isDown: true });
      sceneStub.input.manager.pointers[1].isDown = false;
      pointerup();
      expect(game.isPinching).toBe(false);

      sceneStub.input.manager.pointers = [{ id: 1, isDown: true }];
      pointerdown({ x: 2, y: 3 });
      pointermove({ x: 4, y: 6, isDown: true });
      pointerup();

      wheel({ x: 10, y: 10 }, null, null, 120);

      const resetButton = document.getElementById('resetView');
      resetButton.dispatchEvent(new Event('click'));
      expect(game.activeCountry).toBeNull();

      vi.runAllTimers();
      const loading = document.getElementById('loadingScreen');
      expect(loading.style.opacity).toBe('0');
      expect(loading.remove).toHaveBeenCalled();
    } finally {
      window.Phaser.Game = originalGameClass;
    }
  });

  it('gracefully skips drawing when scene is unavailable', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);
    game.worldContainer = new ContainerStub();
    expect(() => game.drawWorld()).not.toThrow();
  });

  it('onResize exits early when world container is missing', () => {
    const worldGeoJson = { type: 'FeatureCollection', features: [] };
    const game = new EarthExplorerGame(worldGeoJson);
    expect(() => game.onResize(800, 600)).not.toThrow();
  });

  it('ignores hover updates when country already active', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);
    game.prepareWorldAtlas();
    const country = game.projectedCountries[0];
    game.activeCountry = country;
    game.setHoveredCountry(country);
    expect(game.hoveredCountry).toBeNull();
  });

  it('setZoom returns when requested zoom matches current value', () => {
    const worldGeoJson = { type: 'FeatureCollection', features: [] };
    const game = new EarthExplorerGame(worldGeoJson);
    const container = new ContainerStub();
    container.setScale(2);
    game.worldContainer = container;
    game.scene = { scale: { width: 1024, height: 768 } };
    game.baseScale = 2;
    game.zoom = 2;

    game.setZoom(2);

    expect(game.worldContainer.scale).toBe(2);
  });

  it('ignores features without geometry in prepareWorldAtlas', () => {
    const worldGeoJson = cloneWorldFixture();
    worldGeoJson.features.push({
      type: 'Feature',
      properties: { name: 'EmptyLand', 'ISO3166-1-Alpha-3': 'EMP', 'ISO3166-1-Alpha-2': 'EL' },
      geometry: null
    });
    const game = new EarthExplorerGame(worldGeoJson);

    game.prepareWorldAtlas();

    expect(game.projectedCountries.some(c => c.name === 'EmptyLand')).toBe(false);
  });

  it('ignores hover updates when country already active', () => {
    const worldGeoJson = buildWorldCollection('USA', 'CAN');
    const game = new EarthExplorerGame(worldGeoJson);
    game.prepareWorldAtlas();
    const [usa, can] = game.projectedCountries;

    game.setActiveCountry(usa);
    game.setHoveredCountry(can);

    expect(game.hoveredCountry).toBe(can);
    expect(game.activeCountry).toBe(usa);
  });

  it('throws when world data fails to load', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(bootstrapGame()).rejects.toThrow('Failed to load world data: 503');

    globalThis.fetch = originalFetch;
  });
});

describe('bootstrapGame', () => {
  it('updates info panel with country name and flag emoji', () => {
    const worldGeoJson = buildWorldCollection('USA');
    const game = new EarthExplorerGame(worldGeoJson);

    game.prepareWorldAtlas();
    const country = game.projectedCountries[0];

    // Set active country - this should update the DOM element
    game.setActiveCountry(country);
    
    // Get the element content after update
    const countryNameEl = document.getElementById('countryName');
    const infoPanelText = countryNameEl?.textContent || '';
    
    // Should contain country name and flag emoji (��)
    expect(infoPanelText).toContain('United States of America');
    expect(infoPanelText.length).toBeGreaterThan('United States of America'.length); // Flag adds characters
    expect(infoPanelText).toMatch(/🇺🇸/); // US flag emoji

    // Clear selection
    game.setActiveCountry(null);
    const clearedText = countryNameEl?.textContent || '';
    expect(clearedText).toBe('Click a country');
  });

  it('handles invalid ISO codes gracefully (no flag emoji)', () => {
    // Create a mock country with invalid ISO code like France and Somaliland in the dataset
    const worldGeoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          name: 'Test Country',
          'ISO3166-1-Alpha-3': '-99',
          'ISO3166-1-Alpha-2': '-99'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [0, 0], [1, 0], [1, 1], [0, 1], [0, 0]
          ]]
        }
      }]
    };
    
    const game = new EarthExplorerGame(worldGeoJson);
    game.prepareWorldAtlas();
    const country = game.projectedCountries[0];
    
    game.setActiveCountry(country);
    
    const countryNameEl = document.getElementById('countryName');
    const infoPanelText = countryNameEl?.textContent || '';
    
    // Should contain only country name, no emoji
    expect(infoPanelText).toBe('Test Country');
    expect(infoPanelText).not.toMatch(/🇦|🇧|🇨/); // No flag emojis
  });

  it('zooms to specific segment when clicked (overseas territories)', () => {
    const worldGeoJson = buildWorldCollection('FRA'); // France has overseas territories
    const game = new EarthExplorerGame(worldGeoJson);
    
    game.scene = {
      scale: { width: 1920, height: 1080 }
    };
    game.worldContainer = new ContainerStub();
    game.prepareWorldAtlas();
    
    const country = game.projectedCountries[0];
    if (country.segments.length > 1) {
      const firstSegment = country.segments[0];
      const secondSegment = country.segments[1];
      
      // Calculate centers for comparison
      const getSegmentCenter = (segment) => {
        let totalX = 0, totalY = 0;
        segment.points.forEach(p => { totalX += p.x; totalY += p.y; });
        return { x: totalX / segment.points.length, y: totalY / segment.points.length };
      };
      
      const center1 = getSegmentCenter(firstSegment);
      const center2 = getSegmentCenter(secondSegment);
      
      // Zoom to first segment
      game.zoomToCountry(country, center1.x, center1.y, firstSegment);
      const pos1 = { x: game.worldContainer.x, y: game.worldContainer.y };
      
      // Zoom to second segment
      game.zoomToCountry(country, center2.x, center2.y, secondSegment);
      const pos2 = { x: game.worldContainer.x, y: game.worldContainer.y };
      
      // Positions should be different when zooming to different segments
      const moved = Math.abs(pos1.x - pos2.x) > 1 || Math.abs(pos1.y - pos2.y) > 1;
      expect(moved).toBe(true);
    }
  });

  it('loads data and returns an initialised game instance', async () => {
    const originalFetch = globalThis.fetch;
    const originalGameClass = window.Phaser.Game;
    const fixture = buildWorldCollection('USA');
    const inputHandlers = {};

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture
    });

    window.Phaser.Game = class {
      constructor(config) {
        const container = new ContainerStub();
        const sceneStub = {
          add: {
            container: () => container,
            graphics: () => new window.Phaser.GameObjects.Graphics()
          },
          input: {
            addPointer: vi.fn(),
            on: (event, cb) => {
              inputHandlers[event] = cb;
            },
            manager: { pointers: [] }
          },
          scale: {
            width: 800,
            height: 600,
            on: vi.fn()
          }
        };

        config.scene.preload.call(sceneStub);
        config.scene.create.call(sceneStub);
      }

      destroy() {}
    };

    try {
      const game = await bootstrapGame();
      expect(game.projectedCountries.length).toBeGreaterThan(0);
      expect(typeof inputHandlers.pointerdown).toBe('function');
    } finally {
      globalThis.fetch = originalFetch;
      window.Phaser.Game = originalGameClass;
    }
  });
});
