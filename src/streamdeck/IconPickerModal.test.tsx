import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IconPickerModal } from './IconPickerModal';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

describe('IconPickerModal', () => {
  it('defaults to the Íconos (Lucide) tab', async () => {
    const { getByTestId, queryByTestId } = await render(
      <IconPickerModal visible onClose={() => {}} onSelect={() => {}} />,
      { wrapper: AllThemeProviders },
    );
    expect(getByTestId('icon-picker-search')).toBeTruthy();
    expect(getByTestId('icon-picker-list')).toBeTruthy();
    expect(queryByTestId('icon-picker-option-brand:discord')).toBeNull();
  });

  it('switches to the Marcas (brand) tab and shows brand options', async () => {
    const { getByTestId, queryByTestId } = await render(
      <IconPickerModal visible onClose={() => {}} onSelect={() => {}} />,
      { wrapper: AllThemeProviders },
    );
    await fireEvent.press(getByTestId('icon-picker-tab-brands'));
    expect(getByTestId('icon-picker-option-brand:discord')).toBeTruthy();
    expect(queryByTestId('icon-picker-option-Camera')).toBeNull();
  });

  it('filters brand results by title when searching', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <IconPickerModal visible onClose={() => {}} onSelect={() => {}} />,
      { wrapper: AllThemeProviders },
    );
    await fireEvent.press(getByTestId('icon-picker-tab-brands'));
    await fireEvent.changeText(getByTestId('icon-picker-search'), 'chrome');
    expect(getByTestId('icon-picker-option-brand:googlechrome')).toBeTruthy();
    expect(getByText('Google Chrome')).toBeTruthy();
    expect(queryByTestId('icon-picker-option-brand:discord')).toBeNull();
  });

  it('calls onSelect with the prefixed brand name when a brand icon is chosen', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = await render(<IconPickerModal visible onClose={onClose} onSelect={onSelect} />, {
      wrapper: AllThemeProviders,
    });
    await fireEvent.press(getByTestId('icon-picker-tab-brands'));
    await fireEvent.press(getByTestId('icon-picker-option-brand:discord'));
    expect(onSelect).toHaveBeenCalledWith('brand:discord');
    expect(onClose).toHaveBeenCalled();
  });

  it('still selects plain Lucide names on the Íconos tab', async () => {
    const onSelect = jest.fn();
    const { getByTestId } = await render(<IconPickerModal visible onClose={() => {}} onSelect={onSelect} />, {
      wrapper: AllThemeProviders,
    });
    // The Lucide list is long and virtualized, so filter down first to
    // guarantee the target item is actually rendered.
    await fireEvent.changeText(getByTestId('icon-picker-search'), 'Camera');
    await fireEvent.press(getByTestId('icon-picker-option-Camera'));
    expect(onSelect).toHaveBeenCalledWith('Camera');
  });
});
