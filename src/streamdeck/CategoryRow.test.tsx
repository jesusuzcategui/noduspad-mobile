import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CategoryRow } from './CategoryRow';
import { SEED_STATE } from './seedData';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

const category = SEED_STATE.categories['cat-obs'];

async function fireLayout(element: any) {
  await fireEvent(element, 'layout', { nativeEvent: { layout: { width: 320, height: 100, x: 0, y: 0 } } });
}

describe('CategoryRow', () => {
  it('renders the category name', async () => {
    const { getByTestId } = await render(
      <AllThemeProviders>
        <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />
      </AllThemeProviders>,
    );
    expect(getByTestId('category-name-cat-obs').props.children).toBe('OBS');
  });

  it('renders every button in the category', async () => {
    const { getByTestId } = await render(
      <AllThemeProviders>
        <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />
      </AllThemeProviders>,
    );
    for (const buttonId of category.buttonIds) {
      expect(getByTestId(`streamdeck-button-${buttonId}`)).toBeTruthy();
    }
  });

  it('does not render the add-button tile outside edit mode', async () => {
    const { getByTestId, queryByTestId } = await render(
      <AllThemeProviders>
        <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />
      </AllThemeProviders>,
    );
    await fireLayout(getByTestId('category-row-layout-cat-obs'));
    expect(queryByTestId('add-button-cat-obs')).toBeNull();
  });

  it('renders the add-button tile in edit mode and calls onAddButton when pressed', async () => {
    const onAddButton = jest.fn();
    const { getByTestId } = await render(
      <AllThemeProviders>
        <CategoryRow
          category={category}
          buttons={SEED_STATE.buttons}
          onReorder={() => {}}
          onButtonPress={() => {}}
          isEditMode
          onAddButton={onAddButton}
        />
      </AllThemeProviders>,
    );
    await fireLayout(getByTestId('category-row-layout-cat-obs'));
    await waitFor(() => {
      expect(getByTestId('add-button-cat-obs')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('add-button-cat-obs'));

    expect(onAddButton).toHaveBeenCalledWith('cat-obs');
  });

  it('calls onNamePress when the category name is pressed in edit mode', async () => {
    const onNamePress = jest.fn();
    const { getByTestId } = await render(
      <AllThemeProviders>
        <CategoryRow
          category={category}
          buttons={SEED_STATE.buttons}
          onReorder={() => {}}
          onButtonPress={() => {}}
          isEditMode
          onNamePress={onNamePress}
        />
      </AllThemeProviders>,
    );

    await fireEvent.press(getByTestId('category-name-cat-obs'));

    expect(onNamePress).toHaveBeenCalled();
  });

  it('does not call onNamePress outside edit mode', async () => {
    const onNamePress = jest.fn();
    const { getByTestId } = await render(
      <AllThemeProviders>
        <CategoryRow
          category={category}
          buttons={SEED_STATE.buttons}
          onReorder={() => {}}
          onButtonPress={() => {}}
          onNamePress={onNamePress}
        />
      </AllThemeProviders>,
    );

    await fireEvent.press(getByTestId('category-name-cat-obs'));

    expect(onNamePress).not.toHaveBeenCalled();
  });
});
