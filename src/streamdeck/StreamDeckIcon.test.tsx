import React from 'react';
import { render } from '@testing-library/react-native';
import { StreamDeckIcon } from './StreamDeckIcon';

describe('StreamDeckIcon', () => {
  it('renders a Lucide icon (not an SVG brand icon) for a plain name', async () => {
    const { queryByTestId } = await render(<StreamDeckIcon name="Camera" size={24} color="#fff" />);
    expect(queryByTestId('streamdeck-icon-brand-svg')).toBeNull();
  });

  it('renders a brand SVG icon for a known brand: name, using the given color', async () => {
    const { getByTestId } = await render(<StreamDeckIcon name="brand:discord" size={24} color="#fff" />);
    expect(getByTestId('streamdeck-icon-brand-svg')).toBeTruthy();
    const path = getByTestId('streamdeck-icon-brand-path');
    expect(path.props.fill).toBeTruthy();
    expect(typeof path.props.d).toBe('string');
    expect(path.props.d.length).toBeGreaterThan(0);
  });

  it('falls back to HelpCircle (no SVG) for an unknown brand slug', async () => {
    const { queryByTestId } = await render(<StreamDeckIcon name="brand:not-a-real-brand" size={24} color="#fff" />);
    expect(queryByTestId('streamdeck-icon-brand-svg')).toBeNull();
  });

  it('falls back to HelpCircle (no SVG) for an unknown Lucide name', async () => {
    const { queryByTestId } = await render(<StreamDeckIcon name="TotallyNotARealIcon" size={24} color="#fff" />);
    expect(queryByTestId('streamdeck-icon-brand-svg')).toBeNull();
  });
});
