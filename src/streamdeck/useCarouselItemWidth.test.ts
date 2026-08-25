import { computeItemWidth } from './useCarouselItemWidth';

describe('computeItemWidth', () => {
  it('tablet landscape targets 6.4 visible items', () => {
    // width=1280, height=800 (tablet landscape), gap=12
    const width = computeItemWidth(1280, 800, 12);
    const expected = (1280 - 12) / 6.4;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('tablet portrait targets 4.5 visible items', () => {
    const width = computeItemWidth(800, 1280, 12);
    const expected = (800 - 12) / 4.5;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('mobile portrait targets 2.4 visible items', () => {
    const width = computeItemWidth(375, 667, 12);
    const expected = (375 - 12) / 2.4;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('mobile landscape targets 3.5 visible items', () => {
    const width = computeItemWidth(667, 375, 12);
    const expected = (667 - 12) / 3.5;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('boundary: width exactly 768 in landscape counts as tablet', () => {
    const width = computeItemWidth(768, 500, 12);
    const expected = (768 - 12) / 6.4;
    expect(width).toBeCloseTo(expected, 5);
  });
});
