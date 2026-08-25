import { SEED_STATE } from './seedData';

describe('SEED_STATE', () => {
  it('includes the spec-mandated default "OBS" category', () => {
    const obsCategory = SEED_STATE.categoryOrder
      .map(id => SEED_STATE.categories[id])
      .find(category => category.name === 'OBS');
    expect(obsCategory).toBeDefined();
  });

  it('has at least two categories', () => {
    expect(SEED_STATE.categoryOrder.length).toBeGreaterThanOrEqual(2);
  });

  it('every category.buttonIds entry resolves to a real button', () => {
    for (const categoryId of SEED_STATE.categoryOrder) {
      const category = SEED_STATE.categories[categoryId];
      for (const buttonId of category.buttonIds) {
        expect(SEED_STATE.buttons[buttonId]).toBeDefined();
      }
    }
  });

  it('every category in categoryOrder exists in categories', () => {
    for (const categoryId of SEED_STATE.categoryOrder) {
      expect(SEED_STATE.categories[categoryId]).toBeDefined();
    }
  });

  it('has at least 4 buttons total, split across categories', () => {
    expect(Object.keys(SEED_STATE.buttons).length).toBeGreaterThanOrEqual(4);
  });
});
