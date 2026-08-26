import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ButtonEditorModal } from './ButtonEditorModal';
import type { StreamDeckButton } from './types';
import { SEED_STATE } from './seedData';
import { fetchOBSScenes } from '../obs/obsCommands';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

jest.mock('../obs/obsCommands', () => {
  const actual = jest.requireActual('../obs/obsCommands');
  return { ...actual, fetchOBSScenes: jest.fn() };
});

const mockFetchOBSScenes = fetchOBSScenes as jest.MockedFunction<typeof fetchOBSScenes>;

const button = SEED_STATE.buttons['btn-scene-1'];

function renderModal(props: {
  button: StreamDeckButton | null;
  onClose: () => void;
  onSave: (buttonId: string, updates: Partial<StreamDeckButton>) => void;
}) {
  return render(
    <AllThemeProviders>
      <ButtonEditorModal {...props} />
    </AllThemeProviders>,
  );
}

beforeEach(() => {
  mockFetchOBSScenes.mockReset();
});

describe('ButtonEditorModal', () => {
  it('renders nothing when no button is given', async () => {
    const { toJSON } = await renderModal({ button: null, onClose: jest.fn(), onSave: jest.fn() });
    expect(toJSON()).toBeNull();
  });

  it('pre-fills the form with the given button', async () => {
    const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

    expect(getByTestId('editor-label').props.value).toBe('Escena 1');
    expect(getByTestId('editor-action-label').props.value).toBe('Cambiar a Escena 1');
  });

  it('calls onSave with the edited fields and closes', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = await renderModal({ button, onClose, onSave });

    await fireEvent.changeText(getByTestId('editor-label'), 'Nueva Escena');
    await fireEvent.press(getByTestId('editor-icon-camera'));
    await fireEvent.press(getByTestId('editor-color-#2f9e6f'));
    await fireEvent.press(getByTestId('editor-action-command'));
    await fireEvent.changeText(getByTestId('editor-action-label'), 'Abrir algo');

    await fireEvent.press(getByTestId('editor-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('btn-scene-1', {
        label: 'Nueva Escena',
        icon: 'camera',
        background: { type: 'color', color: '#2f9e6f' },
        action: { type: 'command', label: 'Abrir algo' },
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('fills the action label when a non-scene OBS command is picked', async () => {
    const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

    await fireEvent.press(getByTestId('editor-command-start-record'));

    expect(getByTestId('editor-action-label').props.value).toBe('Iniciar grabación');
  });

  it('fetches live scenes for "Cambiar de escena" and fills the label on pick', async () => {
    mockFetchOBSScenes.mockResolvedValue(['Escena A', 'Escena B']);

    const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

    await fireEvent.press(getByTestId('editor-command-change-scene'));

    await waitFor(() => {
      expect(getByTestId('editor-scene-Escena A')).toBeTruthy();
    });

    await fireEvent.press(getByTestId('editor-scene-Escena A'));

    expect(getByTestId('editor-action-label').props.value).toBe('Cambiar a Escena A');
  });

  it('shows an error with retry when fetching scenes fails', async () => {
    mockFetchOBSScenes.mockRejectedValue(new Error('No se pudo conectar a OBS'));

    const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

    await fireEvent.press(getByTestId('editor-command-change-scene'));

    await waitFor(() => {
      expect(getByTestId('editor-scenes-error').props.children).toBe('No se pudo conectar a OBS');
    });
    expect(getByTestId('editor-scenes-retry')).toBeTruthy();
  });

  it('closes without saving when Cancelar is pressed', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = await renderModal({ button, onClose, onSave });

    await fireEvent.press(getByTestId('editor-cancel'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
