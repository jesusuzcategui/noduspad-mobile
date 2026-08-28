import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryNameModal } from './CategoryNameModal';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

function renderModal(props: Partial<React.ComponentProps<typeof CategoryNameModal>> = {}) {
  const defaultProps: React.ComponentProps<typeof CategoryNameModal> = {
    visible: true,
    title: 'Nueva categoría',
    onCancel: jest.fn(),
    onSave: jest.fn(),
  };
  return render(
    <AllThemeProviders>
      <CategoryNameModal {...defaultProps} {...props} />
    </AllThemeProviders>,
  );
}

describe('CategoryNameModal', () => {
  it('renders with initialValue prefilled', async () => {
    const { getByTestId } = await renderModal({ initialValue: 'OBS' });

    expect(getByTestId('category-name-input').props.value).toBe('OBS');
  });

  it('typing and saving calls onSave with the trimmed text', async () => {
    const onSave = jest.fn();
    const { getByTestId } = await renderModal({ onSave });

    await fireEvent.changeText(getByTestId('category-name-input'), '  Streaming  ');
    await fireEvent.press(getByTestId('category-name-save'));

    expect(onSave).toHaveBeenCalledWith('Streaming');
  });

  it('cancel calls onCancel', async () => {
    const onCancel = jest.fn();
    const { getByTestId } = await renderModal({ onCancel });

    await fireEvent.press(getByTestId('category-name-cancel'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('does not call onSave for empty text', async () => {
    const onSave = jest.fn();
    const { getByTestId } = await renderModal({ initialValue: '', onSave });

    await fireEvent.changeText(getByTestId('category-name-input'), '');
    await fireEvent.press(getByTestId('category-name-save'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not call onSave for whitespace-only text', async () => {
    const onSave = jest.fn();
    const { getByTestId } = await renderModal({ onSave });

    await fireEvent.changeText(getByTestId('category-name-input'), '    ');
    await fireEvent.press(getByTestId('category-name-save'));

    expect(onSave).not.toHaveBeenCalled();
  });
});
