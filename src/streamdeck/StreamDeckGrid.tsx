import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Plus } from 'lucide-react-native';
import { useStreamDeckState } from './useStreamDeckState';
import { useEditMode } from './EditModeContext';
import { CategoryRow } from './CategoryRow';
import { CategoryNameModal } from './CategoryNameModal';
import { TapFeedbackBanner } from './TapFeedbackBanner';
import { ButtonEditorModal } from './ButtonEditorModal';
import { executeOBSCommand } from '../obs/obsCommands';
import { executeCommand } from '../commandServer/commandServerClient';
import { useThemeColors } from '../theme/ThemeContext';
import { useGridAppearance } from '../theme/GridAppearanceContext';
import { useProfileContext } from '../profiles/ProfileContext';
import type { StreamDeckButton } from './types';
import { space } from '../theme/glass';

const FEEDBACK_DURATION_MS = 1500;

export function StreamDeckGrid() {
  const { activeProfileId } = useProfileContext();
  const {
    state,
    isLoading,
    reorderCategories,
    reorderButtonsInCategory,
    addButton,
    updateButton,
    deleteButton,
    createCategory,
    renameCategory,
    moveButtonToCategory,
  } = useStreamDeckState(activeProfileId);
  const { isEditMode } = useEditMode();
  const color = useThemeColors();
  const { borderRadius } = useGridAppearance();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingButton, setEditingButton] = useState<StreamDeckButton | null>(null);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

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

      if (button.action.type === 'command' && button.action.commandId) {
        showFeedback(`Ejecutando: ${button.action.label}`);
        executeCommand(button.action.commandId).catch(err => {
          const message = err instanceof Error ? err.message : 'No se pudo conectar al server';
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

  const handleCancelCategoryModal = useCallback(() => {
    setRenamingCategoryId(null);
    setCreatingCategory(false);
  }, []);

  const handleSaveCategoryModal = useCallback(
    (name: string) => {
      if (renamingCategoryId) {
        renameCategory(renamingCategoryId, name);
      } else {
        createCategory(name);
      }
      setRenamingCategoryId(null);
      setCreatingCategory(false);
    },
    [renamingCategoryId, renameCategory, createCategory],
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

  const categories = state.categoryOrder.map(id => state.categories[id]);
  const currentCategoryId = editingButton
    ? categories.find(cat => cat.buttonIds.includes(editingButton.id))?.id ?? null
    : null;

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
            onNamePress={() => setRenamingCategoryId(categoryId)}
            isEditMode={isEditMode}
            onAddButton={handleAddButton}
          />
        )}
        ListFooterComponent={
          isEditMode ? (
            <Pressable
              testID="add-category"
              onPress={() => setCreatingCategory(true)}
              style={[styles.addCategoryTile, { borderRadius, borderColor: color.inputBorder }]}>
              <Plus color={color.textSecondary} size={28} />
            </Pressable>
          ) : undefined
        }
      />
      <TapFeedbackBanner message={feedbackMessage} />
      <ButtonEditorModal
        button={editingButton}
        categories={categories.map(cat => ({ id: cat.id, name: cat.name }))}
        currentCategoryId={currentCategoryId}
        onMoveCategory={newCategoryId => {
          if (editingButton && currentCategoryId) {
            moveButtonToCategory(editingButton.id, currentCategoryId, newCategoryId);
          }
        }}
        onClose={() => setEditingButton(null)}
        onSave={(buttonId, updates) => updateButton(buttonId, updates)}
        onDelete={buttonId => deleteButton(buttonId)}
      />
      <CategoryNameModal
        visible={renamingCategoryId !== null || creatingCategory}
        title={renamingCategoryId ? 'Renombrar categoría' : 'Nueva categoría'}
        initialValue={renamingCategoryId ? state.categories[renamingCategoryId]?.name : undefined}
        onCancel={handleCancelCategoryModal}
        onSave={handleSaveCategoryModal}
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
  addCategoryTile: {
    marginHorizontal: space.lg,
    paddingVertical: space.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
