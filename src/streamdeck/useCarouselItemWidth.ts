import { useWindowDimensions } from 'react-native';

const TABLET_WIDTH_THRESHOLD = 768;

function targetVisibleCount(width: number, height: number): number {
  const isLandscape = width > height;
  const isTablet = width >= TABLET_WIDTH_THRESHOLD;

  if (isTablet && isLandscape) return 6.4;
  if (isTablet && !isLandscape) return 4.5;
  if (!isTablet && !isLandscape) return 2.4;
  return 3.5; // mobile landscape
}

export function computeItemWidth(
  classifyWidth: number,
  classifyHeight: number,
  sizingWidth: number,
  gap: number,
): number {
  return (sizingWidth - gap) / targetVisibleCount(classifyWidth, classifyHeight);
}

export function useCarouselItemWidth(sizingWidth: number, gap: number): number {
  const { width, height } = useWindowDimensions();
  return computeItemWidth(width, height, sizingWidth, gap);
}
