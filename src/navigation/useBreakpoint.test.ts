import { computeLayout } from './useBreakpoint';

describe('computeLayout', () => {
  it('returns drawer for tablet landscape', () => {
    expect(computeLayout(1280, 800)).toBe('drawer');
  });

  it('returns appbar for tablet portrait', () => {
    expect(computeLayout(800, 1280)).toBe('appbar');
  });

  it('returns appbar for mobile landscape', () => {
    expect(computeLayout(667, 375)).toBe('appbar');
  });

  it('returns appbar for mobile portrait', () => {
    expect(computeLayout(375, 667)).toBe('appbar');
  });

  it('returns drawer exactly at the 768 width threshold in landscape', () => {
    expect(computeLayout(768, 500)).toBe('drawer');
  });
});
