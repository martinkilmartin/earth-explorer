const Phaser = window.Phaser;

if (!Phaser) {
  throw new Error('Phaser library is required before loading game.js');
}

const selectionDetailsEl = document.getElementById('selectionDetails');
const loadingScreenEl = document.getElementById('loadingScreen');
const resetViewBtn = document.getElementById('resetView');

async function loadWorldData() {
  try {
    const response = await fetch('assets/world.geo.json');
    if (!response.ok) {
      throw new Error(`Failed to load world data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    if (selectionDetailsEl) {
      selectionDetailsEl.textContent = 'Unable to load world data. Check your connection and reload the page.';
    }
    throw error;
  }
}

class EarthExplorerGame {
  constructor(worldGeoJson) {
    this.worldGeoJson = worldGeoJson;
    this.game = null;
    this.scene = null;
    this.worldContainer = null;
    this.projectedCountries = [];
    this.hoveredCountry = null;
    this.activeCountry = null;
    this.zoom = 1;
    this.baseScale = 1;
    this.isDragging = false;
    this.isPinching = false;
    this.lastPointerPosition = null;
    this.startPinchDistance = null;
    this.startPinchZoom = null;
    this.worldBounds = new Phaser.Geom.Rectangle(0, 0, 0, 0);
  }

  init() {
    const instance = this;

    const config = {
      type: Phaser.CANVAS,
      parent: 'gameContainer',
      canvas: document.getElementById('gameCanvas'),
      backgroundColor: '#02111d',
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

    this.game = new Phaser.Game(config);
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

  handleUpdate() {
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

    const colorForName = name => {
      let hash = 0;
      for (let i = 0; i < name.length; i += 1) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
      }
      const hue = ((hash % 360) + 360) % 360;
      return Phaser.Display.Color.HSLToColor(hue / 360, 0.52, 0.45).color;
    };

    features.forEach(feature => {
      const name = feature.properties?.name || 'Unknown region';
      const iso3 = feature.properties?.['ISO3166-1-Alpha-3'] || 'UNK';
      const geometry = feature.geometry;
      if (!geometry) return;

      const baseColor = colorForName(name);
      const highlightColor = Phaser.Display.Color.IntegerToColor(baseColor).clone().lighten(20).color;

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
        iso2: feature.properties?.['ISO3166-1-Alpha-2'] || 'UN',
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
          this.setActiveCountry(country);
        });

        this.worldContainer.add(graphics);
        return { graphics, points: segment.points };
      });
    });

    if (!this.projectedCountries.length && selectionDetailsEl) {
      selectionDetailsEl.textContent = 'No countries were available in the dataset.';
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

  getMidpoint(a, b) {
    return new Phaser.Math.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2);
  }

  setHoveredCountry(country) {
    if (this.hoveredCountry === country || this.activeCountry === country) return;
    this.hoveredCountry = country;
    this.refreshCountryStyles();
    if (!this.activeCountry) {
      this.updateSelectionDetails(country, 'hover');
    }
  }

  setActiveCountry(country) {
    this.activeCountry = country;
    if (!country) {
      this.updateSelectionDetails(null, 'reset');
    } else {
      this.updateSelectionDetails(country, 'select');
    }
    this.refreshCountryStyles(true);
  }

  refreshCountryStyles(force = false) {
    const highlight = this.activeCountry || this.hoveredCountry;

    this.projectedCountries.forEach(country => {
      const color = country === highlight ? country.highlightColor : country.baseColor;
      if (!force && country === highlight) {
        // Already redrawn when selected
      }
      country.graphics?.forEach(segment => {
        this.renderSegment(segment.graphics, segment.points, color, country === highlight ? 0.35 : 0.18);
      });
    });
  }

  updateSelectionDetails(country, mode) {
    if (!selectionDetailsEl) return;

    if (!country) {
      selectionDetailsEl.innerHTML = '<strong>World sandbox ready.</strong><br>Drag the map, zoom in, then tap a country to explore it.';
      return;
    }

    const title = mode === 'select' ? 'Selected' : 'Exploring';
    const isoCodes = [country.iso3, country.iso2].filter(Boolean).join(' · ');
    const segmentCount = country.segments?.length ?? 0;

    selectionDetailsEl.innerHTML = `
      <div class="country-detail">
        <span class="eyebrow">${title}</span>
        <h3>${country.name}</h3>
        <dl>
          <div><dt>Codes</dt><dd>${isoCodes}</dd></div>
          <div><dt>Regions</dt><dd>${segmentCount}</dd></div>
        </dl>
      </div>
    `;
  }
}

const worldGeoJson = await loadWorldData();
const earthExplorerGame = new EarthExplorerGame(worldGeoJson);
earthExplorerGame.init();

window.addEventListener('beforeunload', () => {
  earthExplorerGame.game?.destroy(true);
});

