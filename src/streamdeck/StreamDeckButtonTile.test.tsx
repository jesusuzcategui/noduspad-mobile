import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StreamDeckButtonTile } from './StreamDeckButtonTile';
import { SEED_STATE } from './seedData';

const sampleButton = SEED_STATE.buttons['btn-scene-1'];

describe('StreamDeckButtonTile', () => {
  it('renders the button label', async () => {
    const { getByText } = await render(
      <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />,
    );
    expect(getByText('Escena 1')).toBeTruthy();
  });

  it('applies the solid background color from the button', async () => {
    const { getByTestId } = await render(
      <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />,
    );
    const tile = getByTestId('streamdeck-button-btn-scene-1');
    const flatStyle = Array.isArray(tile.props.style) ? Object.assign({}, ...tile.props.style) : tile.props.style;
    expect(flatStyle.backgroundColor).toBe('#3a7bfd');
  });

  it('calls onPress with the button when tapped', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <StreamDeckButtonTile button={sampleButton} width={100} onPress={onPress} />,
    );
    await fireEvent.press(getByTestId('streamdeck-button-btn-scene-1'));
    expect(onPress).toHaveBeenCalledWith(sampleButton);
  });
});
