import { useWindowDimensions } from 'react-native';

export type DashboardLayout = 'drawer' | 'appbar';

const TABLET_WIDTH_THRESHOLD = 768;

export function computeLayout(width: number, height: number): DashboardLayout {
  const isLandscape = width > height;
  return width >= TABLET_WIDTH_THRESHOLD && isLandscape ? 'drawer' : 'appbar';
}

export function useDashboardLayout(): DashboardLayout {
  const { width, height } = useWindowDimensions();
  return computeLayout(width, height);
}
