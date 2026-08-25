import React from 'react';
import { ScreenWithAppBar } from '../navigation/ScreenWithAppBar';
import { StreamDeckGrid } from '../streamdeck/StreamDeckGrid';

export function HomeScreen() {
  return (
    <ScreenWithAppBar>
      <StreamDeckGrid />
    </ScreenWithAppBar>
  );
}
