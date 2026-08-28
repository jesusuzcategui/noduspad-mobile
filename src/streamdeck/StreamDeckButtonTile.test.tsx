import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StreamDeckButtonTile } from './StreamDeckButtonTile';
import { SEED_STATE } from './seedData';
import { GridAppearanceProvider } from '../theme/GridAppearanceContext';

const sampleButton = SEED_STATE.buttons['btn-scene-1'];

describe('StreamDeckButtonTile', () => {
  it('renders the button label', async () => {
    const { getByText } = await render(
      <GridAppearanceProvider>
        <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />
      </GridAppearanceProvider>,
    );
    expect(getByText('Escena 1')).toBeTruthy();
  });

  it('applies the solid background color from the button', async () => {
    const { getByTestId } = await render(
      <GridAppearanceProvider>
        <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />
      </GridAppearanceProvider>,
    );
    const tile = getByTestId('streamdeck-button-btn-scene-1');
    const flatStyle = Array.isArray(tile.props.style) ? Object.assign({}, ...tile.props.style) : tile.props.style;
    expect(flatStyle.backgroundColor).toBe('#3a7bfd');
  });

  it('calls onPress with the button when tapped', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <GridAppearanceProvider>
        <StreamDeckButtonTile button={sampleButton} width={100} onPress={onPress} />
      </GridAppearanceProvider>,
    );
    await fireEvent.press(getByTestId('streamdeck-button-btn-scene-1'));
    expect(onPress).toHaveBeenCalledWith(sampleButton);
  });

  it('renders an image background when the button uses an image background', async () => {
    const imageButton = {
      ...sampleButton,
      background: { type: 'image' as const, uri: 'file:///picked.jpg' },
    };
    const { getByTestId, queryByTestId } = await render(
      <GridAppearanceProvider>
        <StreamDeckButtonTile button={imageButton} width={100} onPress={() => {}} />
      </GridAppearanceProvider>,
    );

    const image = getByTestId('streamdeck-button-btn-scene-1-image');
    expect(image.props.source).toEqual({ uri: 'file:///picked.jpg' });

    const tile = getByTestId('streamdeck-button-btn-scene-1');
    const flatStyle = Array.isArray(tile.props.style) ? Object.assign({}, ...tile.props.style) : tile.props.style;
    expect(flatStyle.backgroundColor).toBeUndefined();
    expect(flatStyle.overflow).toBe('hidden');
  });

  it('does not render an image element when the button uses a color background', async () => {
    const { queryByTestId } = await render(
      <GridAppearanceProvider>
        <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />
      </GridAppearanceProvider>,
    );
    expect(queryByTestId('streamdeck-button-btn-scene-1-image')).toBeNull();
  });

  describe('hideIcon / hideLabel', () => {
    it('renders both icon and label by default', async () => {
      const { getByText, getByTestId } = await render(
        <GridAppearanceProvider>
          <StreamDeckButtonTile button={sampleButton} width={100} onPress={() => {}} />
        </GridAppearanceProvider>,
      );
      expect(getByText('Escena 1')).toBeTruthy();
      const tile = getByTestId('streamdeck-button-btn-scene-1');
      const children = Array.isArray(tile.children) ? tile.children : [];
      // Icon + label = 2 children when neither flag hides anything.
      expect(children.length).toBe(2);
    });

    it('does not render the icon when hideIcon is true', async () => {
      const iconlessButton = { ...sampleButton, hideIcon: true };
      const { getByText, getByTestId } = await render(
        <GridAppearanceProvider>
          <StreamDeckButtonTile button={iconlessButton} width={100} onPress={() => {}} />
        </GridAppearanceProvider>,
      );
      expect(getByText('Escena 1')).toBeTruthy();
      const tile = getByTestId('streamdeck-button-btn-scene-1');
      const children = Array.isArray(tile.children) ? tile.children : [];
      // Only the label remains.
      expect(children.length).toBe(1);
    });

    it('does not render the label when hideLabel is true', async () => {
      const labellessButton = { ...sampleButton, hideLabel: true };
      const { queryByText } = await render(
        <GridAppearanceProvider>
          <StreamDeckButtonTile button={labellessButton} width={100} onPress={() => {}} />
        </GridAppearanceProvider>,
      );
      expect(queryByText('Escena 1')).toBeNull();
    });

    it('renders nothing but the background when both hideIcon and hideLabel are true', async () => {
      const bareButton = { ...sampleButton, hideIcon: true, hideLabel: true };
      const { queryByText, toJSON } = await render(
        <GridAppearanceProvider>
          <StreamDeckButtonTile button={bareButton} width={100} onPress={() => {}} />
        </GridAppearanceProvider>,
      );
      expect(queryByText('Escena 1')).toBeNull();
      const tree = toJSON();
      expect(tree).toBeTruthy();
    });

    it('renders the label without the icon-spacing margin when the icon is hidden', async () => {
      const iconlessButton = { ...sampleButton, hideIcon: true };
      const { getByText } = await render(
        <GridAppearanceProvider>
          <StreamDeckButtonTile button={iconlessButton} width={100} onPress={() => {}} />
        </GridAppearanceProvider>,
      );
      const label = getByText('Escena 1');
      const flatStyle = Array.isArray(label.props.style) ? Object.assign({}, ...label.props.style) : label.props.style;
      expect(flatStyle.marginTop).toBe(0);
    });
  });

  it('renders without crashing when the button uses a brand: icon name', async () => {
    const brandButton = { ...sampleButton, icon: 'brand:discord' };
    const { getByTestId, getByText } = await render(
      <GridAppearanceProvider>
        <StreamDeckButtonTile button={brandButton} width={100} onPress={() => {}} />
      </GridAppearanceProvider>,
    );
    expect(getByTestId('streamdeck-button-btn-scene-1')).toBeTruthy();
    expect(getByText('Escena 1')).toBeTruthy();
  });
});
