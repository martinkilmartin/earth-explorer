const createColor = value => ({
  color: value >>> 0,
  h: 0,
  s: 0.5,
  l: 0.5,
  clone() {
    return createColor(this.color);
  },
  lighten(amount) {
    const increment = Math.floor(amount * 1000);
    this.color = Math.min(0xffffff, this.color + increment);
    return this;
  },
  darken(amount) {
    const decrement = Math.floor(amount * 1000);
    this.color = Math.max(0, this.color - decrement);
    return this;
  }
});

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

class Rectangle {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class Polygon {
  constructor(points) {
    this.points = points;
  }

  static Contains(polygon, x, y) {
    return Boolean(polygon && polygon.points && polygon.points.length && typeof x === 'number' && typeof y === 'number');
  }
}

class Graphics {
  constructor() {
    this.commands = [];
    this.country = null;
  }

  clear() {
    this.commands.push(['clear']);
    return this;
  }

  fillStyle(color, alpha) {
    this.commands.push(['fillStyle', color, alpha]);
    return this;
  }

  lineStyle(width, color, alpha) {
    this.commands.push(['lineStyle', width, color, alpha]);
    return this;
  }

  beginPath() {
    this.commands.push(['beginPath']);
    return this;
  }

  moveTo(x, y) {
    this.commands.push(['moveTo', x, y]);
    return this;
  }

  lineTo(x, y) {
    this.commands.push(['lineTo', x, y]);
    return this;
  }

  closePath() {
    this.commands.push(['closePath']);
    return this;
  }

  fillPath() {
    this.commands.push(['fillPath']);
    return this;
  }

  strokePath() {
    this.commands.push(['strokePath']);
    return this;
  }

  setInteractive() {
    this.commands.push(['setInteractive']);
    return this;
  }

  on() {
    return this;
  }
}

const Phaser = {
  CANVAS: 1,
  Scale: {
    RESIZE: 2,
    CENTER_BOTH: 3
  },
  Math: {
    DEG_TO_RAD: Math.PI / 180,
    Distance: {
      Between(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
      }
    },
    DistanceBetween(x1, y1, x2, y2) {
      return Math.hypot(x2 - x1, y2 - y1);
    },
    Clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    Vector2
  },
  Display: {
    Color: {
      IntegerToColor: createColor,
      HSLToColor(h, s, l) {
        const hue = Math.round(((h % 1) + 1) % 1 * 360);
        const saturation = Math.round(Math.min(Math.max(s, 0), 1) * 100);
        const lightness = Math.round(Math.min(Math.max(l, 0), 1) * 100);
        const value = hue * 10000 + saturation * 100 + lightness;
        return createColor(value);
      }
    }
  },
  Geom: {
    Rectangle,
    Polygon
  },
  GameObjects: {
    Graphics
  },
  Game: class {
    constructor() {}
    destroy() {}
  }
};

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}

window.Phaser = Phaser;
window.__EARTH_EXPLORER_TEST__ = true;

['selectionDetails', 'loadingScreen', 'resetView'].forEach(id => {
  if (!document.getElementById(id)) {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
});

export {};
