import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CategoryRow } from './CategoryRow';
import { SEED_STATE } from './seedData';

const category = SEED_STATE.categories['cat-obs'];

async function fireLayout(element: any) {
  await fireEvent(element, 'layout', { nativeEvent: { layout: { width: 320, height: 100, x: 0, y: 0 } } });
}

describe('CategoryRow', () => {
  it('renders the category name', async () => {
    const { getByTestId } = await render(
      <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />,
    );
    expect(getByTestId('category-name-cat-obs').props.children).toBe('OBS');
  });

  it('renders every button in the category', async () => {
    const { getByTestId } = await render(
      <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />,
    );
    for (const buttonId of category.buttonIds) {
      expect(getByTestId(`streamdeck-button-${buttonId}`)).toBeTruthy();
    }
  });

  it('does not render the add-button tile outside edit mode', async () => {
    const { getByTestId, queryByTestId } = await render(
      <CategoryRow category={category} buttons={SEED_STATE.buttons} onReorder={() => {}} onButtonPress={() => {}} />,
    );
    await fireLayout(getByTestId('category-row-layout-cat-obs'));
    expect(queryByTestId('add-button-cat-obs')).toBeNull();
  });

  it('renders the add-button tile in edit mode and calls onAddButton when pressed', async () => {
    const onAddButton = jest.fn();
    const { getByTestId } = await render(
      <CategoryRow
        category={category}
        buttons={SEED_STATE.buttons}
        onReorder={() => {}}
        onButtonPress={() => {}}
        isEditMode
        onAddButton={onAddButton}
      />,
    );
    await fireLayout(getByTestId('category-row-layout-cat-obs'));
    await waitFor(() => {
      expect(getByTestId('add-button-cat-obs')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('add-button-cat-obs'));

    expect(onAddButton).toHaveBeenCalledWith('cat-obs');
  });
});
