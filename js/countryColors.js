// @ts-check

const PhaserRef = /** @type {any} */ (window).Phaser;

if (!PhaserRef) {
  throw new Error('Phaser must be available before loading countryColors.js');
}

const BASE_FLAG_OVERRIDES = Object.freeze({
  CAN: 0xd62828,
  CA: 0xd62828,
  MEX: 0x167a3a,
  MX: 0x167a3a,
  IRL: 0x2f8f44,
  IE: 0x2f8f44,
  RUS: 0x82afe4,
  RU: 0x82afe4,
  IND: 0xff8f1a,
  IN: 0xff8f1a,
  USA: 0x7daedb,
  US: 0x7daedb,
  GBR: 0xc8102e,
  GB: 0xc8102e,
  FRA: 0x0055a4,
  FR: 0x0055a4,
  CHN: 0xc4271b,
  CN: 0xc4271b,
  AUS: 0x8dd4c3,
  AU: 0x8dd4c3,
  DEU: 0xffce00,
  DE: 0xffce00,
  BRA: 0x158f3f,
  BR: 0x158f3f,
  ZAF: 0x007a4d,
  ZA: 0x007a4d,
  JPN: 0xbc002d,
  JP: 0xbc002d,
  ATA: 0xf6f6f0,
  AQ: 0xf6f6f0,
  GRL: 0xf3f5f9,
  GL: 0xf3f5f9
});

const GOLDEN_RATIO_CONJUGATE = 0.61803398875;
const MAX_ADJUST_ATTEMPTS = 6;

const clamp = PhaserRef.Math.Clamp;

const normalizeColor = value => {
  if (value == null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >>> 0;
  }
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned) return undefined;
    const hex = cleaned[0] === '#' ? cleaned.slice(1) : cleaned;
    const parsed = parseInt(hex, 16);
    return Number.isFinite(parsed) ? (parsed >>> 0) : undefined;
  }
  return undefined;
};

const hashString = input => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const colorFromHash = hash => {
  const hue = ((hash * GOLDEN_RATIO_CONJUGATE) % 1 + 1) % 1;
  const saturation = clamp(0.58 + (((hash >> 3) & 3) * 0.08), 0.5, 0.78);
  const lightness = clamp(0.46 + (((hash >> 5) & 3) * 0.05), 0.38, 0.64);
  return PhaserRef.Display.Color.HSLToColor(hue, saturation, lightness).color;
};

const rotateHue = (color, degrees) => {
  const c = PhaserRef.Display.Color.IntegerToColor(color);
  const newHue = (c.h + degrees + 360) % 360;
  return PhaserRef.Display.Color.HSLToColor(newHue / 360, c.s, c.l).color;
};

const normalizeCode = code => (code || '').toUpperCase();

export function createCountryColorResolver(extraOverrides = {}) {
  const overrides = { ...BASE_FLAG_OVERRIDES };

  Object.entries(extraOverrides).forEach(([code, value]) => {
    const normalized = normalizeColor(value);
    if (normalized !== undefined) {
      overrides[normalizeCode(code)] = normalized;
    }
  });

  const usedGeneratedColors = new Set();
  const regionCache = new Map();

  return ({ name = 'Unknown region', iso2 = '', iso3 = '' }) => {
    const normalizedIso3 = normalizeCode(iso3);
    const normalizedIso2 = normalizeCode(iso2);
    const cacheKey = `${normalizedIso3}:${normalizedIso2}:${name}`;

    if (regionCache.has(cacheKey)) {
      return regionCache.get(cacheKey);
    }

    const candidates = [normalizedIso3, normalizedIso2];
    for (const code of candidates) {
      if (!code) continue;
      const override = overrides[code];
      if (override !== undefined) {
        usedGeneratedColors.add(override);
        regionCache.set(cacheKey, override);
        return override;
      }
    }

    const seed = `${name}:${candidates.join(':')}`;
    const hash = hashString(seed);
    let color = colorFromHash(hash);
    let attempt = 0;

    while (usedGeneratedColors.has(color) && attempt < MAX_ADJUST_ATTEMPTS) {
      color = rotateHue(color, 40 + ((hash + attempt) % 4) * 17);
      attempt += 1;
    }

    usedGeneratedColors.add(color);
    regionCache.set(cacheKey, color);
    return color;
  };
}

export const COUNTRY_COLOR_OVERRIDES = BASE_FLAG_OVERRIDES;
