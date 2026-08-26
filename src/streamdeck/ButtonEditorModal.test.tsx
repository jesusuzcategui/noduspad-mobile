import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ButtonEditorModal } from './ButtonEditorModal';
import { SEED_STATE } from './seedData';

const button = SEED_STATE.buttons['btn-scene-1'];

describe('ButtonEditorModal', () => {
  it('renders nothing when no button is given', async () => {
    const { toJSON } = await render(
      <ButtonEditorModal button={null} onClose={jest.fn()} onSave={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('pre-fills the form with the given button', async () => {
    const { getByTestId } = await render(
      <ButtonEditorModal button={button} onClose={jest.fn()} onSave={jest.fn()} />,
    );

    expect(getByTestId('editor-label').props.value).toBe('Escena 1');
    expect(getByTestId('editor-action-label').props.value).toBe('Cambiar a Escena 1');
  });

  it('calls onSave with the edited fields and closes', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <ButtonEditorModal button={button} onClose={onClose} onSave={onSave} />,
    );

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

  it('closes without saving when Cancelar is pressed', async () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <ButtonEditorModal button={button} onClose={onClose} onSave={onSave} />,
    );

    await fireEvent.press(getByTestId('editor-cancel'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
