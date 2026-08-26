import React from 'react';
import { render } from '@testing-library/react-native';
import { TapFeedbackBanner } from './TapFeedbackBanner';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

describe('TapFeedbackBanner', () => {
  it('renders nothing when message is null', async () => {
    const { queryByTestId } = await render(
      <AllThemeProviders>
        <TapFeedbackBanner message={null} />
      </AllThemeProviders>,
    );
    expect(queryByTestId('tap-feedback-banner')).toBeNull();
  });

  it('renders the message when present', async () => {
    const { getByTestId } = await render(
      <AllThemeProviders>
        <TapFeedbackBanner message="Ejecutaría: Cambiar a Escena 1" />
      </AllThemeProviders>,
    );
    expect(getByTestId('tap-feedback-banner').props.children).toBe('Ejecutaría: Cambiar a Escena 1');
  });
});
