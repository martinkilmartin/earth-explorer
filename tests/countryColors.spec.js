import { describe, it, expect } from 'vitest';
import { createCountryColorResolver, COUNTRY_COLOR_OVERRIDES } from '../js/countryColors.js';

describe('createCountryColorResolver', () => {
  it('returns predefined override for ISO codes regardless of case', () => {
    const resolver = createCountryColorResolver();

    const overrideUpper = resolver({ iso3: 'USA' });
    const overrideLower = resolver({ iso2: 'us' });

    expect(overrideUpper).toBe(COUNTRY_COLOR_OVERRIDES.USA);
    expect(overrideLower).toBe(COUNTRY_COLOR_OVERRIDES.US);
  });

  it('accepts hex string overrides when provided via constructor', () => {
    const resolver = createCountryColorResolver({ nz: '#123abc' });
    const color = resolver({ name: 'New Zealand', iso2: 'nz' });

    expect(color).toBe(0x123abc);
  });

  it('generates deterministic colors for regions without overrides', () => {
    const resolver = createCountryColorResolver();
    const first = resolver({ name: 'Atlantis', iso3: 'ATL' });
    const second = resolver({ name: 'Atlantis', iso3: 'ATL' });

    expect(first).toBe(second);
  });

  it('avoids reusing generated colors by rotating hue', () => {
    const resolver = createCountryColorResolver();
    const base = resolver({ name: 'Region One', iso3: 'REG1' });
    const other = resolver({ name: 'Region Two', iso3: 'REG2' });

    expect(other).not.toBe(base);
  });

  it('falls back to string names when codes are missing', () => {
    const resolver = createCountryColorResolver();
    const color = resolver({ name: 'Mystery Land' });

    expect(typeof color).toBe('number');
  });
});
