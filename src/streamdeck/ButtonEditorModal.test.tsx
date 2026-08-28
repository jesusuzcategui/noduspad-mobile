import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ButtonEditorModal } from './ButtonEditorModal';
import type { StreamDeckButton } from './types';
import { SEED_STATE } from './seedData';
import { fetchOBSScenes } from '../obs/obsCommands';
import * as commandServerClient from '../commandServer/commandServerClient';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';

jest.mock('../obs/obsCommands', () => {
  const actual = jest.requireActual('../obs/obsCommands');
  return { ...actual, fetchOBSScenes: jest.fn() };
});

// react-native-image-picker's native module isn't linked in the test
// environment (no real build here), and even if it were, we need
// deterministic pick/cancel/error responses without a real OS picker UI —
// so the whole module is mocked, mirroring the fetchOBSScenes/listCommands
// mocking convention above.
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

// react-native-fs is auto-mocked project-wide via __mocks__/react-native-fs.js
// (its native module isn't linked in the test environment either).

// Without this mock, pressing the "Comando" segment (or, since finding 1's
// fix, simply opening the editor on a button whose action is already
// 'command') triggers a REAL `new WebSocket('ws://localhost:7070')` —
// non-deterministic in CI and would actually talk to a real noduspad-pc
// server if one happens to be running during test runs. Mirrors the module
// mock convention in StreamDeckGrid.test.tsx.
jest.mock('../commandServer/commandServerClient', () => {
  const actual = jest.requireActual('../commandServer/commandServerClient');
  return { ...actual, listCommands: jest.fn() };
});

const mockFetchOBSScenes = fetchOBSScenes as jest.MockedFunction<typeof fetchOBSScenes>;
const mockListCommands = commandServerClient.listCommands as jest.MockedFunction<
  typeof commandServerClient.listCommands
>;
const mockLaunchImageLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockCopyFile = RNFS.copyFile as jest.MockedFunction<typeof RNFS.copyFile>;
const mockUnlink = RNFS.unlink as jest.MockedFunction<typeof RNFS.unlink>;
const mockMkdir = RNFS.mkdir as jest.MockedFunction<typeof RNFS.mkdir>;
const PERSISTED_URI_PATTERN = /^file:\/\/\/mock\/documents\/button-images\/btn-scene-1-\d+-\d+\.jpg$/;

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
  mockListCommands.mockReset();
  mockListCommands.mockResolvedValue([]);
  mockLaunchImageLibrary.mockReset();
  mockCopyFile.mockReset().mockResolvedValue(undefined);
  mockUnlink.mockReset().mockResolvedValue(undefined);
  mockMkdir.mockReset().mockResolvedValue(undefined);
  (RNFS.exists as jest.Mock).mockReset().mockResolvedValue(true);
});

describe('ButtonEditorModal', () => {
  it('renders nothing when no button is given', async () => {
    const { queryByTestId } = await renderModal({ button: null, onClose: jest.fn(), onSave: jest.fn() });
    expect(queryByTestId('editor-label')).toBeNull();
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
        iconColor: '#ffffff',
        background: { type: 'color', color: '#2f9e6f' },
        hideIcon: false,
        hideLabel: false,
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

  it('lists existing commands and selects one, saving its commandId', async () => {
    mockListCommands.mockResolvedValue([
      { id: 'cmd-1', label: 'Play/Pause', kind: 'media_key', target: 'play_pause' },
    ]);

    const onSave = jest.fn();
    const commandButton: StreamDeckButton = {
      ...button,
      action: { type: 'command', label: '' },
    };
    const { getByTestId } = await renderModal({ button: commandButton, onClose: jest.fn(), onSave });

    await fireEvent.press(getByTestId('editor-action-command'));
    await waitFor(() => getByTestId('editor-existing-command-cmd-1'));
    await fireEvent.press(getByTestId('editor-existing-command-cmd-1'));
    await fireEvent.press(getByTestId('editor-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        commandButton.id,
        expect.objectContaining({
          action: expect.objectContaining({ type: 'command', commandId: 'cmd-1' }),
        }),
      );
    });
  });

  it('fetches and renders the command list on open when the button is already a command button', async () => {
    mockListCommands.mockResolvedValue([
      { id: 'cmd-1', label: 'Play/Pause', kind: 'media_key', target: 'play_pause' },
    ]);

    const commandButton: StreamDeckButton = {
      ...button,
      action: { type: 'command', label: 'Play/Pause', commandId: 'cmd-1' },
    };
    const { getByTestId } = await renderModal({ button: commandButton, onClose: jest.fn(), onSave: jest.fn() });

    // Deliberately does NOT press "editor-action-command" — the button
    // already opens with action.type === 'command', so the fetch must be
    // triggered by the editor opening, not by pressing the segment.
    await waitFor(() => {
      expect(getByTestId('editor-existing-command-cmd-1')).toBeTruthy();
    });
    expect(mockListCommands).toHaveBeenCalledTimes(1);
  });

  it('closes without saving when Cancelar is pressed', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = await renderModal({ button, onClose, onSave });

    await fireEvent.press(getByTestId('editor-cancel'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  const categories = [
    { id: 'cat-obs', name: 'OBS' },
    { id: 'cat-system', name: 'Sistema' },
  ];

  it('renders a category chip for each passed category', async () => {
    const { getByTestId } = await renderModal({
      button,
      onClose: jest.fn(),
      onSave: jest.fn(),
      categories,
      currentCategoryId: 'cat-obs',
    } as any);

    expect(getByTestId('category-chip-cat-obs')).toBeTruthy();
    expect(getByTestId('category-chip-cat-system')).toBeTruthy();
  });

  it('marks the current category chip as selected', async () => {
    const { getByTestId } = await renderModal({
      button,
      onClose: jest.fn(),
      onSave: jest.fn(),
      categories,
      currentCategoryId: 'cat-obs',
    } as any);

    const activeChip = getByTestId('category-chip-cat-obs');
    const inactiveChip = getByTestId('category-chip-cat-system');

    const activeStyle = [activeChip.props.style].flat();
    const inactiveStyle = [inactiveChip.props.style].flat();

    expect(activeStyle).toEqual(expect.arrayContaining([expect.objectContaining({ borderColor: expect.anything() })]));
    expect(activeStyle).not.toEqual(inactiveStyle);
  });

  it('calls onMoveCategory with the id of a different category chip when tapped', async () => {
    const onMoveCategory = jest.fn();
    const { getByTestId } = await renderModal({
      button,
      onClose: jest.fn(),
      onSave: jest.fn(),
      categories,
      currentCategoryId: 'cat-obs',
      onMoveCategory,
    } as any);

    await fireEvent.press(getByTestId('category-chip-cat-system'));

    expect(onMoveCategory).toHaveBeenCalledWith('cat-system');
  });

  describe('background: color vs image', () => {
    it('toggles between the Color and Imagen sections', async () => {
      const { getByTestId, queryByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

      expect(getByTestId('editor-color-#3a7bfd')).toBeTruthy();
      expect(queryByTestId('editor-pick-image')).toBeNull();

      await fireEvent.press(getByTestId('editor-background-image'));

      expect(getByTestId('editor-pick-image')).toBeTruthy();
      expect(queryByTestId('editor-color-#3a7bfd')).toBeNull();

      await fireEvent.press(getByTestId('editor-background-color'));

      expect(getByTestId('editor-color-#3a7bfd')).toBeTruthy();
      expect(queryByTestId('editor-pick-image')).toBeNull();
    });

    it('picks an image, shows a preview, and saves it as an image background', async () => {
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback?.({ didCancel: false, assets: [{ uri: 'file:///picked.jpg' }] });
        return Promise.resolve({ didCancel: false, assets: [{ uri: 'file:///picked.jpg' }] });
      });

      const onSave = jest.fn();
      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave });

      await fireEvent.press(getByTestId('editor-background-image'));
      await fireEvent.press(getByTestId('editor-pick-image'));

      await waitFor(() => {
        expect(mockCopyFile).toHaveBeenCalledWith('file:///picked.jpg', expect.stringMatching(/button-images/));
      });
      // The persisted local path is used, NOT the raw picker uri — this is
      // the actual bug fix: content:// picker uris aren't guaranteed to
      // survive an app restart at full resolution.
      await waitFor(() => {
        expect(getByTestId('editor-image-preview').props.source.uri).toMatch(PERSISTED_URI_PATTERN);
      });

      await fireEvent.press(getByTestId('editor-save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          button.id,
          expect.objectContaining({
            background: { type: 'image', uri: expect.stringMatching(PERSISTED_URI_PATTERN) },
          }),
        );
      });
    });

    it('cleans up the previously persisted image when a new one is picked and saved', async () => {
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback?.({ didCancel: false, assets: [{ uri: 'content://picker/new.jpg' }] });
        return Promise.resolve({ didCancel: false, assets: [{ uri: 'content://picker/new.jpg' }] });
      });

      const onSave = jest.fn();
      const buttonWithImage: StreamDeckButton = {
        ...button,
        background: { type: 'image', uri: 'file:///mock/documents/button-images/btn-scene-1-old.jpg' },
      };
      const { getByTestId } = await renderModal({ button: buttonWithImage, onClose: jest.fn(), onSave });

      await fireEvent.press(getByTestId('editor-background-image'));
      await fireEvent.press(getByTestId('editor-pick-image'));
      await waitFor(() => {
        expect(getByTestId('editor-image-preview').props.source.uri).toMatch(PERSISTED_URI_PATTERN);
      });

      await fireEvent.press(getByTestId('editor-save'));

      await waitFor(() => {
        expect(mockUnlink).toHaveBeenCalledWith('/mock/documents/button-images/btn-scene-1-old.jpg');
      });
    });

    it('does not show an error when the user cancels the image picker', async () => {
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback?.({ didCancel: true });
        return Promise.resolve({ didCancel: true });
      });

      const { getByTestId, queryByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

      await fireEvent.press(getByTestId('editor-background-image'));
      await fireEvent.press(getByTestId('editor-pick-image'));

      await waitFor(() => {
        expect(mockLaunchImageLibrary).toHaveBeenCalled();
      });
      expect(queryByTestId('editor-image-error')).toBeNull();
      expect(queryByTestId('editor-image-preview')).toBeNull();
    });

    it('shows an inline error when the image picker fails', async () => {
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback?.({ didCancel: false, errorCode: 'others', errorMessage: 'No se pudo abrir la galería' });
        return Promise.resolve({ didCancel: false, errorCode: 'others', errorMessage: 'No se pudo abrir la galería' });
      });

      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

      await fireEvent.press(getByTestId('editor-background-image'));
      await fireEvent.press(getByTestId('editor-pick-image'));

      await waitFor(() => {
        expect(getByTestId('editor-image-error').props.children).toBe('No se pudo abrir la galería');
      });
    });

    it('falls back to saving as color when "Imagen" mode is selected but no image was ever picked', async () => {
      const onSave = jest.fn();
      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave });

      await fireEvent.press(getByTestId('editor-background-image'));
      await fireEvent.press(getByTestId('editor-save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          button.id,
          expect.objectContaining({ background: { type: 'color', color: '#3a7bfd' } }),
        );
      });
    });
  });

  describe('hide icon / hide label switches', () => {
    it('only shows the switches in Imagen mode, not Color mode', async () => {
      const { getByTestId, queryByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

      expect(queryByTestId('editor-hide-icon')).toBeNull();
      expect(queryByTestId('editor-hide-label')).toBeNull();

      await fireEvent.press(getByTestId('editor-background-image'));

      expect(getByTestId('editor-hide-icon')).toBeTruthy();
      expect(getByTestId('editor-hide-label')).toBeTruthy();

      await fireEvent.press(getByTestId('editor-background-color'));

      expect(queryByTestId('editor-hide-icon')).toBeNull();
      expect(queryByTestId('editor-hide-label')).toBeNull();
    });

    it('toggling and saving persists hideIcon and hideLabel', async () => {
      mockLaunchImageLibrary.mockImplementation((_options, callback) => {
        callback?.({ didCancel: false, assets: [{ uri: 'file:///picked.jpg' }] });
        return Promise.resolve({ didCancel: false, assets: [{ uri: 'file:///picked.jpg' }] });
      });

      const onSave = jest.fn();
      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave });

      await fireEvent.press(getByTestId('editor-background-image'));
      await fireEvent.press(getByTestId('editor-pick-image'));
      await waitFor(() => expect(getByTestId('editor-image-preview')).toBeTruthy());

      await fireEvent(getByTestId('editor-hide-icon'), 'valueChange', true);
      await fireEvent(getByTestId('editor-hide-label'), 'valueChange', true);

      await fireEvent.press(getByTestId('editor-save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          button.id,
          expect.objectContaining({ hideIcon: true, hideLabel: true }),
        );
      });
    });

    it('resets the switches from the button when reopening the modal', async () => {
      const buttonWithHidden: StreamDeckButton = {
        ...button,
        background: { type: 'image', uri: 'file:///existing.jpg' },
        hideIcon: true,
        hideLabel: false,
      };

      const { getByTestId } = await renderModal({ button: buttonWithHidden, onClose: jest.fn(), onSave: jest.fn() });

      expect(getByTestId('editor-hide-icon').props.value).toBe(true);
      expect(getByTestId('editor-hide-label').props.value).toBe(false);
    });

    it('does not save hideIcon/hideLabel as true when background is color', async () => {
      const onSave = jest.fn();
      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave });

      await fireEvent.press(getByTestId('editor-save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          button.id,
          expect.objectContaining({ hideIcon: false, hideLabel: false }),
        );
      });
    });
  });

  describe('icon/label color picker', () => {
    it('renders a color picker for the icon/label color, pre-filled from the button', async () => {
      const buttonWithIconColor: StreamDeckButton = { ...button, iconColor: '#123abc' };
      const { getByTestId } = await renderModal({ button: buttonWithIconColor, onClose: jest.fn(), onSave: jest.fn() });

      expect(getByTestId('editor-icon-color-picker')).toBeTruthy();
      expect(getByTestId('editor-icon-color-picker-hex-input').props.value).toBe('#123abc');
    });

    it('saves the edited icon color via the hex input', async () => {
      const onSave = jest.fn();
      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave });

      await fireEvent.changeText(getByTestId('editor-icon-color-picker-hex-input'), '#ff00aa');
      await fireEvent.press(getByTestId('editor-save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(button.id, expect.objectContaining({ iconColor: '#ff00aa' }));
      });
    });

    it('also renders the free-color picker for the background', async () => {
      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave: jest.fn() });

      expect(getByTestId('editor-background-color-picker')).toBeTruthy();
    });

    it('saves the background color edited via the free-color picker hex input', async () => {
      const onSave = jest.fn();
      const { getByTestId } = await renderModal({ button, onClose: jest.fn(), onSave });

      await fireEvent.changeText(getByTestId('editor-background-color-picker-hex-input'), '#00ff88');
      await fireEvent.press(getByTestId('editor-save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          button.id,
          expect.objectContaining({ background: { type: 'color', color: '#00ff88' } }),
        );
      });
    });
  });
});
