/// <reference path="../types/phaser.d.ts" />
// @ts-check

import { createCountryColorResolver } from './countryColors.js';

/** @type {any} */
const Phaser = /** @type {any} */ (window).Phaser;

if (!Phaser) {
  throw new Error('Phaser library is required before loading game.js');
}

const loadingScreenEl = document.getElementById('loadingScreen');
const resetViewBtn = document.getElementById('resetView');

/**
 * @typedef {Object} ProjectedSegment
 * @property {{ x: number, y: number }[]} points
 * @property {{ graphics: any, points: { x: number, y: number }[] }=} graphics
 */

/**
 * @typedef {Object} ProjectedCountry
 * @property {string} name
 * @property {string} iso3
 * @property {string} iso2
 * @property {number} baseColor
 * @property {number} highlightColor
 * @property {ProjectedSegment[]} segments
 * @property {{ graphics: any, points: { x: number, y: number }[] }[]=} graphics
 */

async function loadWorldData() {
  try {
    const response = await fetch('assets/world.geo.json');
    if (!response.ok) {
      throw new Error(`Failed to load world data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export class EarthExplorerGame {
  /**
   * @param {{ features?: any[] }} worldGeoJson
   */
  constructor(worldGeoJson) {
    this.worldGeoJson = worldGeoJson;
    this.game = null;
    this.scene = null;
    this.worldContainer = null;
    /** @type {ProjectedCountry[]} */
    this.projectedCountries = [];
    this.hoveredCountry = null;
    this.activeCountry = null;
    this.activeCountryText = null;
    this.zoom = 1;
    this.baseScale = 1;
    this.isDragging = false;
    this.isPinching = false;
    this.lastPointerPosition = null;
    this.startPinchDistance = null;
    this.startPinchZoom = null;
    this.worldBounds = new Phaser.Geom.Rectangle(0, 0, 0, 0);
    this.colorResolver = createCountryColorResolver();
  }

  /**
   * @param {{ x: number, y: number }} a
   * @param {{ x: number, y: number }} b
   */
  getMidpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  init() {
    const instance = this;

    const config = {
      type: Phaser.CANVAS,
      parent: 'gameContainer',
      canvas: document.getElementById('gameCanvas'),
      backgroundColor: '#153654',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
      },
      scene: {
        preload() {
          instance.handlePreload(this);
        },
        create() {
          instance.handleCreate(this);
        },
        update(_time, delta) {
          instance.handleUpdate(delta);
        }
      }
    };

    this.game = new (Phaser).Game(config);
  }

  handlePreload(scene) {
    scene.input.addPointer(2);
  }

  handleCreate(scene) {
    this.scene = scene;
    this.worldContainer = scene.add.container();
    this.worldContainer.setName('world');

    this.prepareWorldAtlas();
    this.drawWorld();
    this.setupInputHandlers();
    this.setupUiBindings();
    this.onResize(scene.scale.width, scene.scale.height);

    scene.scale.on('resize', ({ width, height }) => this.onResize(width, height));

    if (loadingScreenEl) {
      loadingScreenEl.style.opacity = '0';
      loadingScreenEl.style.pointerEvents = 'none';
      setTimeout(() => loadingScreenEl.remove?.(), 400);
    }
  }

  /**
   * @param {number} [delta]
   */
  handleUpdate(delta) {
    if (this.isPinching) {
      const activePointers = this.getActivePointers();
      if (activePointers.length >= 2) {
        const [p1, p2] = activePointers;
        const distance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
        if (this.startPinchDistance) {
          const scaleFactor = distance / this.startPinchDistance;
          this.setZoom(this.startPinchZoom * scaleFactor, this.getMidpoint(p1, p2));
        } else {
          this.startPinchDistance = distance;
        }
      }
    }
  }

  prepareWorldAtlas() {
    const features = Array.isArray(this.worldGeoJson?.features) ? this.worldGeoJson.features : [];

    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    const updateExtents = (lon, lat) => {
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    };

    const walkGeometry = (geometry, visitor) => {
      if (!geometry) return;
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(ring => {
          ring.forEach(visitor);
        });
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(poly => {
          poly.forEach(ring => {
            ring.forEach(visitor);
          });
        });
      }
    };

    features.forEach(feature => {
      walkGeometry(feature.geometry, ([lon, lat]) => updateExtents(lon, lat));
    });

    if (!Number.isFinite(minLon) || !Number.isFinite(maxLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      throw new Error('World dataset did not contain any coordinates.');
    }

    const originLon = (minLon + maxLon) / 2;
    const originLat = (minLat + maxLat) / 2;

    const lonSpan = maxLon - minLon;
    const latSpan = maxLat - minLat;
    const cosine = Math.cos(originLat * Phaser.Math.DEG_TO_RAD);
    const targetWidth = 2048;
    const targetHeight = 1152;
    const projectedWidth = lonSpan * cosine;
    const projectedHeight = latSpan;
    const scale = Math.min(
      targetWidth / Math.max(projectedWidth, 0.0001),
      targetHeight / Math.max(projectedHeight, 0.0001)
    );

    const project = (lon, lat) => {
      const x = (lon - originLon) * cosine * scale;
      const y = -(lat - originLat) * scale;
      return new Phaser.Math.Vector2(x, y);
    };

    const simplifyPath = (points, minDistance = 1.4) => {
      if (points.length <= 3) return points;
      const simplified = [points[0]];
      let last = points[0];

      for (let i = 1; i < points.length; i += 1) {
        const current = points[i];
        if (
          Phaser.Math.Distance.Between(last.x, last.y, current.x, current.y) >= minDistance ||
          i === points.length - 1
        ) {
          simplified.push(current);
          last = current;
        }
      }

      return simplified;
    };

    this.projectedCountries = [];
    this.worldBounds = new Phaser.Geom.Rectangle(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0, 0);

    const updateBounds = point => {
      if (point.x < this.worldBounds.x) {
        this.worldBounds.x = point.x;
      }
      if (point.y < this.worldBounds.y) {
        this.worldBounds.y = point.y;
      }
      const right = point.x - this.worldBounds.x;
      const bottom = point.y - this.worldBounds.y;
      if (right > this.worldBounds.width) {
        this.worldBounds.width = right;
      }
      if (bottom > this.worldBounds.height) {
        this.worldBounds.height = bottom;
      }
    };

    features.forEach(feature => {
      const name = feature.properties?.name || 'Unknown region';
      const iso3 = feature.properties?.['ISO3166-1-Alpha-3'] || 'UNK';
      const iso2 = feature.properties?.['ISO3166-1-Alpha-2'] || 'UN';
      const geometry = /** @type {any} */ (feature.geometry);
      if (!geometry) return;

      const baseColor = this.colorResolver({ name, iso2, iso3 });
      const highlightColor = Phaser.Display.Color.IntegerToColor(baseColor).clone().lighten(18).color;

      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      const segments = [];

      polygons.forEach(poly => {
        if (!Array.isArray(poly) || !poly.length) return;
        const outerRing = poly[0];
        if (!Array.isArray(outerRing) || outerRing.length < 3) return;

        const points = outerRing
          .map(([lon, lat]) => project(lon, lat))
          .filter(Boolean);

        if (points.length < 3) return;

        const simplified = simplifyPath(points);
        simplified.forEach(updateBounds);

        segments.push({ points: simplified });
      });

      if (!segments.length) return;

      this.projectedCountries.push({
        name,
        iso3,
        iso2,
        baseColor,
        highlightColor,
        segments
      });
    });

    // Normalize bounds to be centered around the origin
    const worldCenterX = this.worldBounds.x + this.worldBounds.width / 2;
    const worldCenterY = this.worldBounds.y + this.worldBounds.height / 2;

    this.projectedCountries.forEach(country => {
      country.segments.forEach(segment => {
        segment.points = segment.points.map(point =>
          new Phaser.Math.Vector2(point.x - worldCenterX, point.y - worldCenterY)
        );
      });
    });

    this.worldBounds.x = -this.worldBounds.width / 2;
    this.worldBounds.y = -this.worldBounds.height / 2;
  }

  drawWorld() {
    const scene = this.scene;
    if (!scene) return;

    this.worldContainer.removeAll(true);

    this.projectedCountries.forEach(country => {
      country.graphics = country.segments.map(segment => {
        const graphics = scene.add.graphics();
        this.renderSegment(graphics, segment.points, country.baseColor, 0.18);
        graphics.country = country;

        if (segment.points.length >= 3) {
          const hitPolygon = new Phaser.Geom.Polygon(segment.points.flatMap(pt => [pt.x, pt.y]));
          graphics.setInteractive(hitPolygon, Phaser.Geom.Polygon.Contains);
        }

        graphics.on('pointerover', pointer => {
          if (pointer.isDown) return;
          this.setHoveredCountry(country);
        });

        graphics.on('pointerout', () => {
          this.setHoveredCountry(null);
        });

        graphics.on('pointerup', event => {
          if (event?.event) {
            event.event.stopPropagation();
          }
          this.setActiveCountry(country, segment);
        });

        this.worldContainer.add(graphics);
        return { graphics, points: segment.points };
      });
    });

    this.refreshCountryStyles();

    if (!this.projectedCountries.length) {
      console.warn('No countries were available in the dataset.');
    }
  }

  renderSegment(graphics, points, fillColor, borderAlpha = 0.2) {
    graphics.clear();
    graphics.fillStyle(fillColor, 1);
    graphics.lineStyle(1, 0xffffff, borderAlpha);

    points.forEach((point, index) => {
      if (index === 0) {
        graphics.beginPath();
        graphics.moveTo(point.x, point.y);
      } else {
        graphics.lineTo(point.x, point.y);
      }
    });
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  setupInputHandlers() {
    const scene = this.scene;
    const input = scene.input;

    input.on('pointerdown', pointer => {
      const activePointers = this.getActivePointers();
      if (activePointers.length >= 2) {
        this.isPinching = true;
        this.startPinchDistance = null;
        this.startPinchZoom = this.zoom;
        this.isDragging = false;
      } else {
        this.isDragging = true;
        this.lastPointerPosition = { x: pointer.x, y: pointer.y };
      }
    });

    input.on('pointerup', () => {
      this.isDragging = false;
      const activePointers = this.getActivePointers();
      if (activePointers.length < 2) {
        this.isPinching = false;
        this.startPinchDistance = null;
      }
    });

    input.on('pointermove', pointer => {
      if (this.isPinching) return;
      if (!this.isDragging || !this.lastPointerPosition) return;

      const deltaX = pointer.x - this.lastPointerPosition.x;
      const deltaY = pointer.y - this.lastPointerPosition.y;

      this.worldContainer.x += deltaX;
      this.worldContainer.y += deltaY;
      this.lastPointerPosition = { x: pointer.x, y: pointer.y };
      this.constrainPan();
    });

    input.on('wheel', (pointer, _, __, deltaY) => {
      const center = new Phaser.Math.Vector2(pointer.x, pointer.y);
      const zoomFactor = 1 - Phaser.Math.Clamp(deltaY, -500, 500) * 0.0012;
      this.setZoom(this.zoom * zoomFactor, center);
    });
  }

  setupUiBindings() {
    if (!resetViewBtn) return;
    resetViewBtn.addEventListener('click', () => this.resetView());
  }

  onResize(width, height) {
    if (!this.worldContainer) return;

    const margin = 80;
    const worldWidth = this.worldBounds.width;
    const worldHeight = this.worldBounds.height;

    const scaleX = (width - margin * 2) / worldWidth;
    const scaleY = (height - margin * 2) / worldHeight;
    this.baseScale = Math.min(scaleX, scaleY);
    this.zoom = this.baseScale;

    this.worldContainer.setScale(this.zoom);
    this.worldContainer.setPosition(width / 2, height / 2);
    this.constrainPan();
  }

  setZoom(targetZoom, focusPoint = null) {
    if (!this.worldContainer) return;

    const minZoom = this.baseScale * 0.35;
    const maxZoom = this.baseScale * 999;
    const newZoom = Phaser.Math.Clamp(targetZoom, minZoom, maxZoom);

    if (Math.abs(newZoom - this.zoom) < 0.0001) return;

    const container = this.worldContainer;
    const focal = focusPoint || new Phaser.Math.Vector2(this.scene.scale.width / 2, this.scene.scale.height / 2);
    const worldX = (focal.x - container.x) / this.zoom;
    const worldY = (focal.y - container.y) / this.zoom;

    this.zoom = newZoom;
    container.setScale(this.zoom);
    container.x = focal.x - worldX * this.zoom;
    container.y = focal.y - worldY * this.zoom;

    this.constrainPan();
  }

  constrainPan() {
    if (!this.worldContainer) return;

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const mapHalfWidth = (this.worldBounds.width * this.zoom) / 2;
    const mapHalfHeight = (this.worldBounds.height * this.zoom) / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxOffsetX = Math.max(0, mapHalfWidth - width / 2 + 30);
    const maxOffsetY = Math.max(0, mapHalfHeight - height / 2 + 30);

    this.worldContainer.x = Phaser.Math.Clamp(this.worldContainer.x, centerX - maxOffsetX, centerX + maxOffsetX);
    this.worldContainer.y = Phaser.Math.Clamp(this.worldContainer.y, centerY - maxOffsetY, centerY + maxOffsetY);
  }

  resetView() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    this.zoom = this.baseScale;
    this.worldContainer.setScale(this.zoom);
    this.worldContainer.setPosition(width / 2, height / 2);
    this.constrainPan();
    this.setActiveCountry(null);
  }

  getActivePointers() {
    const manager = this.scene?.input?.manager;
    if (!manager) {
      return [];
    }

    const pointers = Array.isArray(manager.pointers) ? manager.pointers : [];
    return pointers.filter(pointer => pointer && pointer.isDown);
  }

  setHoveredCountry(country) {
    if (this.hoveredCountry === country || this.activeCountry === country) {
      return;
    }

    this.hoveredCountry = country;
    this.refreshCountryStyles();
  }

  setActiveCountry(country, clickedSegment = null) {
    this.activeCountry = country;
    
    // Remove existing country text if any
    if (this.activeCountryText) {
      this.activeCountryText.destroy();
      this.activeCountryText = null;
    }
    
    // Update info panel
    const countryNameEl = document.getElementById('countryName');
    if (countryNameEl) {
      if (country) {
        // Convert ISO2 code to flag emoji
        const flag = country.iso2 
          ? String.fromCodePoint(...[...country.iso2.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
          : '';
        countryNameEl.textContent = flag ? `${flag} ${country.name}` : country.name;
      } else {
        countryNameEl.textContent = 'Click a country';
      }
    }
    
    if (country && this.scene && this.scene.scale) {
      // If a specific segment was clicked, use that segment for zoom
      // Otherwise calculate center from all segments
      const segmentsToUse = clickedSegment ? [clickedSegment] : country.segments;
      
      let totalX = 0;
      let totalY = 0;
      let totalPoints = 0;
      
      segmentsToUse.forEach(segment => {
        segment.points.forEach(point => {
          totalX += point.x;
          totalY += point.y;
          totalPoints++;
        });
      });
      
      if (totalPoints > 0) {
        const centerX = totalX / totalPoints;
        const centerY = totalY / totalPoints;
        
        // Zoom to the clicked segment (or all segments if none specified)
        this.zoomToCountry(country, centerX, centerY, clickedSegment);
      }
    }
    
    this.refreshCountryStyles();
  }
  
  zoomToCountry(country, centerX, centerY, clickedSegment = null) {
    if (!this.scene || !this.scene.scale) return;
    
    // If a specific segment was clicked, only use that segment
    // Otherwise, calculate bounds for all segments to find the largest
    const segmentsToConsider = clickedSegment ? [clickedSegment] : country.segments;
    
    // Calculate bounds for each segment separately to handle countries that wrap around
    const segmentBounds = segmentsToConsider.map(segment => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      segment.points.forEach(point => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
      
      return {
        minX, maxX, minY, maxY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
      };
    });
    
    // Find the largest segment (main landmass) to zoom to
    // For clicked segments, this will be the clicked segment itself
    // For countries like Russia/USA, this avoids the wrap-around issue
    const largestSegment = segmentBounds.reduce((largest, current) => {
      const currentArea = current.width * current.height;
      const largestArea = largest.width * largest.height;
      return currentArea > largestArea ? current : largest;
    });
    
    const countryWidth = largestSegment.width;
    const countryHeight = largestSegment.height;
    const segmentCenterX = largestSegment.centerX;
    const segmentCenterY = largestSegment.centerY;
    
    // Calculate zoom to fit country with some padding
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const padding = 100;
    
    const scaleX = (screenWidth - padding * 2) / countryWidth;
    const scaleY = (screenHeight - padding * 2) / countryHeight;
    const targetZoom = Math.min(scaleX, scaleY) * 0.8; // 0.8 for extra padding
    
    // Clamp zoom to reasonable limits
    const minZoom = this.baseScale * 0.35;
    const maxZoom = this.baseScale * 999;
    const newZoom = Phaser.Math.Clamp(targetZoom, minZoom, maxZoom);
    
    // Animate zoom and pan
    this.zoom = newZoom;
    this.worldContainer.setScale(this.zoom);
    
    // Position the largest segment in the center of the screen
    this.worldContainer.x = screenWidth / 2 - segmentCenterX * this.zoom;
    this.worldContainer.y = screenHeight / 2 - segmentCenterY * this.zoom;
    
    this.constrainPan();
  }

  refreshCountryStyles() {
    const activeCountry = this.activeCountry;
    const hoveredCountry = this.hoveredCountry;

    this.projectedCountries.forEach(country => {
      let fillColor = country.baseColor;
      let outlineAlpha = 0.18;

      if (country === activeCountry) {
        fillColor = country.highlightColor;
        outlineAlpha = 0.38;
      } else if (country === hoveredCountry) {
        fillColor = Phaser.Display.Color.IntegerToColor(country.baseColor).clone().lighten(28).color;
        outlineAlpha = 0.26;
      }

      country.graphics?.forEach(segment => {
        this.renderSegment(segment.graphics, segment.points, fillColor, outlineAlpha);
      });
    });
  }
}

export async function bootstrapGame() {
  const worldGeoJson = await loadWorldData();
  const earthExplorerGame = new EarthExplorerGame(worldGeoJson);
  earthExplorerGame.init();

  if (typeof window !== 'undefined') {
    /** @type {any} */ (window).__EARTH_EXPLORER_GAME__ = earthExplorerGame;
    /** @type {any} */ (window).__EARTH_EXPLORER_READY__ = true;
  }

  window.addEventListener('beforeunload', () => {
    earthExplorerGame.game?.destroy(true);
  });

  return earthExplorerGame;
}

if (typeof window !== 'undefined' && window.document && !(/** @type {any} */ (window)).__EARTH_EXPLORER_TEST__) {
  bootstrapGame();
}

