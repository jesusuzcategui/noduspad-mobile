import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { ColorPicker } from './ColorPicker';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

function renderPicker(props: { value: string; onChange: (hex: string) => void; testID?: string }) {
  return render(
    <AllThemeProviders>
      <ColorPicker {...props} />
    </AllThemeProviders>,
  );
}

describe('ColorPicker', () => {
  it('renders with an initial value reflected in the hex input and preview', async () => {
    const { getByTestId } = await renderPicker({ value: '#3a7bfd', onChange: jest.fn(), testID: 'picker' });

    expect(getByTestId('picker-hex-input').props.value).toBe('#3a7bfd');
    expect(getByTestId('picker-preview').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#3a7bfd' })]),
    );
  });

  it('typing a valid hex calls onChange with the normalized hex', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderPicker({ value: '#3a7bfd', onChange, testID: 'picker' });

    fireEvent.changeText(getByTestId('picker-hex-input'), '#ABC');

    expect(onChange).toHaveBeenCalledWith('#aabbcc');
  });

  it('typing an invalid/incomplete hex does not call onChange', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderPicker({ value: '#3a7bfd', onChange, testID: 'picker' });

    // '#3a' is neither a 3-digit nor a 6-digit hex — genuinely incomplete
    // (unlike e.g. '#3a7', which is a valid 3-digit shorthand).
    fireEvent.changeText(getByTestId('picker-hex-input'), '#3a');

    expect(onChange).not.toHaveBeenCalled();
    // And it doesn't crash — the raw (invalid) text stays visible for editing.
    await waitFor(() => {
      expect(getByTestId('picker-hex-input').props.value).toBe('#3a');
    });
  });

  it('dragging the hue slider calls onChange with a plausible hex', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderPicker({ value: '#3a7bfd', onChange, testID: 'picker' });

    // Give the track a known width so x -> ratio math is deterministic.
    fireEvent(getByTestId('picker-hue-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 28 } },
    });

    const gesture = getByGestureTestId('picker-hue-gesture');
    fireGestureHandler(gesture, [{ x: 100, y: 14 }]);

    expect(onChange).toHaveBeenCalled();
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallHex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('dragging the lightness slider calls onChange with a plausible hex', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderPicker({ value: '#3a7bfd', onChange, testID: 'picker' });

    fireEvent(getByTestId('picker-lightness-track'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 28 } },
    });

    const gesture = getByGestureTestId('picker-lightness-gesture');
    fireGestureHandler(gesture, [{ x: 20, y: 14 }]);

    expect(onChange).toHaveBeenCalled();
    const lastCallHex = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCallHex).toMatch(/^#[0-9a-f]{6}$/);
    // Dragging near the low end of the lightness track should darken the
    // color substantially compared to the initial 50%-ish lightness input.
    expect(lastCallHex).not.toBe('#3a7bfd');
  });
});
