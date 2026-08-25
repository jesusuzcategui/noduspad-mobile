import React from 'react';
import { render } from '@testing-library/react-native';
import { TapFeedbackBanner } from './TapFeedbackBanner';

describe('TapFeedbackBanner', () => {
  it('renders nothing when message is null', async () => {
    const { queryByTestId } = await render(<TapFeedbackBanner message={null} />);
    expect(queryByTestId('tap-feedback-banner')).toBeNull();
  });

  it('renders the message when present', async () => {
    const { getByTestId } = await render(<TapFeedbackBanner message="Ejecutaría: Cambiar a Escena 1" />);
    expect(getByTestId('tap-feedback-banner').props.children).toBe('Ejecutaría: Cambiar a Escena 1');
  });
});
