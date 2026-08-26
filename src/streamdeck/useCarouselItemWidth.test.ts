import { computeItemWidth } from './useCarouselItemWidth';

describe('computeItemWidth', () => {
  it('tablet landscape targets 6.4 visible items', () => {
    // classifyWidth=1280, classifyHeight=800 (tablet landscape), sizingWidth=1280, gap=12
    const width = computeItemWidth(1280, 800, 1280, 12);
    const expected = (1280 - 12) / 6.4;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('tablet portrait targets 4.5 visible items', () => {
    const width = computeItemWidth(800, 1280, 800, 12);
    const expected = (800 - 12) / 4.5;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('mobile portrait targets 2.4 visible items', () => {
    const width = computeItemWidth(375, 667, 375, 12);
    const expected = (375 - 12) / 2.4;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('mobile landscape targets 3.5 visible items', () => {
    const width = computeItemWidth(667, 375, 667, 12);
    const expected = (667 - 12) / 3.5;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('boundary: width exactly 768 in landscape counts as tablet', () => {
    const width = computeItemWidth(768, 500, 768, 12);
    const expected = (768 - 12) / 6.4;
    expect(width).toBeCloseTo(expected, 5);
  });

  it('classifies by window size but sizes by measured container width (drawer regression)', () => {
    // window is 1024x800 tablet-landscape, but a permanent drawer eats 360dp,
    // leaving a measured carousel container width of only 664px.
    // Classification must still use the window size (6.4 visible items),
    // while the pixel width must be computed from the measured container width.
    const classifyWidth = 1024;
    const classifyHeight = 800;
    const sizingWidth = 664;
    const gap = 12;

    const width = computeItemWidth(classifyWidth, classifyHeight, sizingWidth, gap);

    const correctExpected = (sizingWidth - gap) / 6.4;
    const regressionExpected = (classifyWidth - gap) / 6.4;

    expect(width).toBeCloseTo(correctExpected, 5);
    expect(width).not.toBeCloseTo(regressionExpected, 5);
  });
});
