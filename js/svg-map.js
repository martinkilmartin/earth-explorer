// @ts-check
/// <reference path="../types/global.d.ts" />

/**
 * @typedef {Object} CountryData
 * @property {string} name - Full country name
 * @property {string} code - ISO 3166-1 alpha-2 code
 * @property {SVGPathElement} element - SVG path element
 */

class SVGWorldMap {
  constructor() {
    this.viewport = /** @type {HTMLElement} */ (document.getElementById('mapViewport'));
    this.svg = /** @type {SVGSVGElement | null} */ (null);
    this.countryInfo = /** @type {HTMLElement} */ (document.getElementById('countryInfo'));
    this.countryNameSpan = /** @type {HTMLElement} */ (document.getElementById('countryName'));
    this.loadingScreen = /** @type {HTMLElement} */ (document.getElementById('loadingScreen'));
    this.resetBtn = /** @type {HTMLElement} */ (document.getElementById('resetView'));

    // Transform state
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.minScale = 0.5;
    this.maxScale = 20;

    // Interaction state
    this.isDragging = false;
    this.hasDragged = false;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.pointerDownX = 0;
    this.pointerDownY = 0;
    
    // Active country
    this.activeCountry = /** @type {CountryData | null} */ (null);
    this.hoveredCountry = /** @type {CountryData | null} */ (null);

    // Country mapping
    this.countryMap = new Map();
    
    // Color generator (matching existing app)
    this.colorResolver = this.createColorResolver();
  }

  /**
   * Initialize the map
   */
  async init() {
    try {
      await this.loadSVG();
      await this.loadCountryMapping();
      this.setupCountries();
      this.setupEventListeners();
      this.centerMap();
      this.hideLoading();
      
      // Expose for testing
      if (typeof window !== 'undefined') {
        window.__SVG_WORLD_MAP__ = this;
        window.__SVG_WORLD_MAP_READY__ = true;
      }
    } catch (error) {
      console.error('Failed to initialize map:', error);
      this.loadingScreen.querySelector('.loading-text').textContent = 'Failed to load map';
    }
  }

  /**
   * Load and inject SVG
   */
  async loadSVG() {
    const response = await fetch('world-map.svg');
    const svgText = await response.text();
    this.viewport.innerHTML = svgText;
    this.svg = this.viewport.querySelector('svg');
    
    if (!this.svg) {
      throw new Error('SVG not found');
    }

    // Remove any existing dimensions to make it responsive
    this.svg.removeAttribute('width');
    this.svg.removeAttribute('height');
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
  }

  /**
   * Load country name mapping from CSV
   */
  async loadCountryMapping() {
    const response = await fetch('mapping.csv');
    const csv = await response.text();
    const lines = csv.trim().split('\n');
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const code = parts[1].trim();
        this.countryMap.set(code, name);
      }
    }
  }

  /**
   * Setup country path elements
   */
  setupCountries() {
    if (!this.svg) return;

    const paths = this.svg.querySelectorAll('path[id]');
    paths.forEach(pathElement => {
      const path = /** @type {SVGPathElement} */ (pathElement);
      const code = path.id;
      const name = this.countryMap.get(code) || this.formatCountryName(code);
      
      /** @type {CountryData} */
      const countryData = {
        name,
        code,
        element: path
      };

      // Apply color
      const colors = this.colorResolver(code, name);
      path.style.fill = this.rgbToHex(colors.baseColor);

      // Store country data on element
      const htmlPath = /** @type {HTMLElement} */ (/** @type {unknown} */ (path));
      htmlPath.dataset.countryName = name;
      htmlPath.dataset.countryCode = code;

      // Add event listeners
      path.addEventListener('mouseenter', () => this.handleCountryHover(countryData));
      path.addEventListener('mouseleave', () => this.handleCountryLeave());
      path.addEventListener('pointerdown', (e) => this.handlePointerDown(e, countryData));
      path.addEventListener('pointerup', (e) => this.handlePointerUp(e, countryData));
    });
  }

  /**
   * Format country name from code
   */
  formatCountryName(code) {
    if (code.startsWith('_')) {
      // Format like "_somaliland" → "Somaliland"
      return code.substring(1).charAt(0).toUpperCase() + code.substring(2);
    }
    return code.toUpperCase();
  }

  /**
   * Create color resolver matching existing app
   */
  createColorResolver() {
    const BASE_FLAG_OVERRIDES = {
      'us': 0xb22234, 'ca': 0xd62828, 'mx': 0x006341,
      'br': 0x009c3b, 'ar': 0x74acdf, 'gb': 0xc8102e,
      'fr': 0x0055a4, 'de': 0x000000, 'it': 0x009246,
      'es': 0xaa151b, 'ru': 0x0039a6, 'cn': 0xde2910,
      'in': 0xff9933, 'jp': 0xbc002d, 'au': 0x012169,
      'za': 0x007a4d, 'eg': 0xce1126, 'ng': 0x008751,
      'kr': 0x003478, 'se': 0x006aa7, 'no': 0xef2b2d,
      'fi': 0x003580, 'dk': 0xc8102e, 'nl': 0x21468b,
      'be': 0x000000, 'ch': 0xff0000, 'at': 0xed2939,
      'pl': 0xdc143c, 'ua': 0x005bbb, 'tr': 0xe30a17,
      'sa': 0x165d31, 'ir': 0x239f40, 'iq': 0xce1126
    };

    const PHI = 0.618033988749895;

    return (code, name) => {
      const lookupCode = code.toLowerCase().replace('_', '');
      
      if (BASE_FLAG_OVERRIDES[lookupCode]) {
        const base = BASE_FLAG_OVERRIDES[lookupCode];
        return {
          baseColor: base,
          highlightColor: this.rotateHue(base, 22)
        };
      }

      // Hash-based color generation
      let hash = 0;
      const str = code + name;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }

      const hue = Math.abs(hash * PHI % 1) * 360;
      const saturation = 45 + (Math.abs(hash) % 30);
      const lightness = 40 + (Math.abs(hash >> 8) % 20);

      const baseColor = this.hslToRgb(hue, saturation, lightness);
      const highlightColor = this.hslToRgb((hue + 22) % 360, saturation, Math.min(lightness + 10, 70));

      return { baseColor, highlightColor };
    };
  }

  /**
   * Convert HSL to RGB color value
   */
  hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return ((Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255));
  }

  /**
   * Rotate hue of a color
   */
  rotateHue(rgb, degrees) {
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;

    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;

    if (max === min) {
      return rgb;
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h;
    switch (max) {
      case r / 255: h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) * 60; break;
      case g / 255: h = ((b / 255 - r / 255) / d + 2) * 60; break;
      default: h = ((r / 255 - g / 255) / d + 4) * 60; break;
    }

    return this.hslToRgb((h + degrees) % 360, s * 100, l * 100);
  }

  /**
   * Convert RGB number to hex string
   */
  rgbToHex(rgb) {
    return '#' + ('000000' + rgb.toString(16)).slice(-6);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const DRAG_THRESHOLD = 5;

    this.viewport.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.hasDragged = false;
      this.startX = e.clientX - this.translateX;
      this.startY = e.clientY - this.translateY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.pointerDownX = e.clientX;
      this.pointerDownY = e.clientY;
      this.viewport.classList.add('dragging');
    });

    this.viewport.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.lastX;
      const deltaY = e.clientY - this.lastY;

      // Check if dragged beyond threshold
      if (!this.hasDragged) {
        const totalDeltaX = e.clientX - this.pointerDownX;
        const totalDeltaY = e.clientY - this.pointerDownY;
        const distance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
        if (distance > DRAG_THRESHOLD) {
          this.hasDragged = true;
        }
      }

      this.translateX += deltaX;
      this.translateY += deltaY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      this.updateTransform();
    });

    this.viewport.addEventListener('pointerup', () => {
      this.isDragging = false;
      this.viewport.classList.remove('dragging');
    });

    this.viewport.addEventListener('pointerleave', () => {
      this.isDragging = false;
      this.viewport.classList.remove('dragging');
    });

    // Wheel zoom
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const rect = this.viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY;
      const zoomFactor = delta > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));

      if (newScale !== this.scale) {
        // Zoom towards mouse position
        const scaleChange = newScale / this.scale;
        this.translateX = mouseX - (mouseX - this.translateX) * scaleChange;
        this.translateY = mouseY - (mouseY - this.translateY) * scaleChange;
        this.scale = newScale;
        this.updateTransform();
      }
    }, { passive: false });

    // Reset button
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  /**
   * Handle country hover
   */
  handleCountryHover(country) {
    if (this.activeCountry) return; // Don't hover if country is active
    this.hoveredCountry = country;
  }

  /**
   * Handle country leave
   */
  handleCountryLeave() {
    this.hoveredCountry = null;
  }

  /**
   * Handle pointer down on country
   */
  handlePointerDown(e, country) {
    // Reset drag tracking
    this.hasDragged = false;
  }

  /**
   * Handle pointer up on country (click)
   */
  handlePointerUp(e, country) {
    // Only register as click if user didn't drag
    if (this.hasDragged) {
      return;
    }

    e.stopPropagation();
    this.setActiveCountry(country);
  }

  /**
   * Set active country and zoom to it
   */
  setActiveCountry(country) {
    this.activeCountry = country;

    if (country) {
      // Update info panel
      const iso2 = country.code.toUpperCase().replace('_', '');
      const flag = this.getCountryFlag(iso2, country.name);
      this.countryNameSpan.textContent = flag ? `${flag} ${country.name}` : country.name;

      // Update country styles
      this.refreshCountryStyles();

      // Zoom to country
      this.zoomToCountry(country);
    } else {
      this.countryNameSpan.textContent = 'Click a country';
      this.refreshCountryStyles();
      this.reset();
    }
  }

  /**
   * Get country flag emoji
   */
  getCountryFlag(iso2, name) {
    // Special cases
    const specialCases = {
      'France': 'FR',
      'Somaliland': 'SO'
    };

    const code = specialCases[name] || iso2;
    
    // Validate ISO2 code
    if (!/^[A-Z]{2}$/i.test(code)) {
      return '';
    }

    // Convert to regional indicator symbols
    return String.fromCodePoint(
      ...code.toUpperCase().split('').map(c => 0x1F1E6 - 65 + c.charCodeAt(0))
    );
  }

  /**
   * Refresh country styles based on active state
   */
  refreshCountryStyles() {
    if (!this.svg) return;

    const paths = this.svg.querySelectorAll('path[id]');
    
    if (this.activeCountry) {
      paths.forEach(path => {
        if (path === this.activeCountry.element) {
          path.classList.add('active');
          path.classList.remove('inactive');
        } else {
          path.classList.remove('active');
          path.classList.add('inactive');
        }
      });
    } else {
      paths.forEach(path => {
        path.classList.remove('active', 'inactive');
      });
    }
  }

  /**
   * Zoom to country bounds
   */
  zoomToCountry(country) {
    const bbox = country.element.getBBox();
    const viewportRect = this.viewport.getBoundingClientRect();

    // Calculate scale to fit country in viewport (with padding)
    const padding = 0.8; // 20% padding
    const scaleX = (viewportRect.width * padding) / bbox.width;
    const scaleY = (viewportRect.height * padding) / bbox.height;
    const targetScale = Math.min(scaleX, scaleY, this.maxScale);

    // Calculate center position
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    // Get SVG dimensions
    const svgRect = this.svg.getBBox();
    const svgWidth = svgRect.width;
    const svgHeight = svgRect.height;

    // Calculate translate to center the country
    this.scale = targetScale;
    this.translateX = viewportRect.width / 2 - (centerX / svgWidth) * viewportRect.width * targetScale;
    this.translateY = viewportRect.height / 2 - (centerY / svgHeight) * viewportRect.height * targetScale;

    this.updateTransform(true);
  }

  /**
   * Update SVG transform
   */
  updateTransform(animate = false) {
    if (!this.svg) return;

    if (animate) {
      this.svg.style.transition = 'transform 0.5s ease';
      setTimeout(() => {
        if (this.svg) {
          this.svg.style.transition = '';
        }
      }, 500);
    }

    this.svg.style.transform = `translate(-50%, -50%) translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  /**
   * Center the map
   */
  centerMap() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
  }

  /**
   * Reset view
   */
  reset() {
    this.setActiveCountry(null);
    this.centerMap();
  }

  /**
   * Hide loading screen
   */
  hideLoading() {
    this.loadingScreen.classList.add('hidden');
  }
}

// Initialize on load
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const map = new SVGWorldMap();
    map.init();
  });
} else if (typeof window !== 'undefined') {
  const map = new SVGWorldMap();
  map.init();
}

export { SVGWorldMap };
