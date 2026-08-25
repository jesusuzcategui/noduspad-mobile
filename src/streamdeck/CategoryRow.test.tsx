import React from 'react';
import { render } from '@testing-library/react-native';
import { CategoryRow } from './CategoryRow';
import { SEED_STATE } from './seedData';

const category = SEED_STATE.categories['cat-obs'];

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
});
