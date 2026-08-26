import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useStreamDeckState } from './useStreamDeckState';
import { useEditMode } from './EditModeContext';
import { CategoryRow } from './CategoryRow';
import { TapFeedbackBanner } from './TapFeedbackBanner';
import { ButtonEditorModal } from './ButtonEditorModal';
import { executeOBSCommand } from '../obs/obsCommands';
import { useThemeColors } from '../theme/ThemeContext';
import type { StreamDeckButton } from './types';
import { space } from '../theme/glass';

const FEEDBACK_DURATION_MS = 1500;

export function StreamDeckGrid() {
  const { state, isLoading, reorderCategories, reorderButtonsInCategory, addButton, updateButton } =
    useStreamDeckState();
  const { isEditMode } = useEditMode();
  const color = useThemeColors();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingButton, setEditingButton] = useState<StreamDeckButton | null>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
    }
    feedbackTimeout.current = setTimeout(() => setFeedbackMessage(null), FEEDBACK_DURATION_MS);
  }, []);

  const handleButtonPress = useCallback(
    (button: StreamDeckButton) => {
      if (isEditMode) {
        setEditingButton(button);
        return;
      }

      if (button.action.type === 'obs' && button.action.command) {
        showFeedback(`Ejecutando: ${button.action.label}`);
        executeOBSCommand(button.action.command, button.action.sceneName).catch(err => {
          const message = err instanceof Error ? err.message : 'No se pudo conectar a OBS';
          showFeedback(`Error: ${message}`);
        });
        return;
      }

      showFeedback(`No configurado: ${button.action.label}`);
    },
    [isEditMode, showFeedback],
  );

  const handleAddButton = useCallback(
    (categoryId: string) => {
      setEditingButton(addButton(categoryId));
    },
    [addButton],
  );

  useEffect(() => {
    return () => {
      if (feedbackTimeout.current) {
        clearTimeout(feedbackTimeout.current);
      }
    };
  }, []);

  if (isLoading || !state) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DraggableFlatList
        testID="category-order-list"
        data={state.categoryOrder}
        keyExtractor={id => id}
        onDragEnd={({ data }) => reorderCategories(data)}
        contentContainerStyle={styles.list}
        renderItem={({ item: categoryId, drag }: RenderItemParams<string>) => (
          <CategoryRow
            category={state.categories[categoryId]}
            buttons={state.buttons}
            onReorder={newButtonIds => reorderButtonsInCategory(categoryId, newButtonIds)}
            onButtonPress={handleButtonPress}
            onNameLongPress={drag}
            isEditMode={isEditMode}
            onAddButton={handleAddButton}
          />
        )}
      />
      <TapFeedbackBanner message={feedbackMessage} />
      <ButtonEditorModal
        button={editingButton}
        onClose={() => setEditingButton(null)}
        onSave={(buttonId, updates) => updateButton(buttonId, updates)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingVertical: space.lg,
  },
});
