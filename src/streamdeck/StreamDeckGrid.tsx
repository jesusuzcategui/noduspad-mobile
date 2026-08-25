import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useStreamDeckState } from './useStreamDeckState';
import { CategoryRow } from './CategoryRow';
import { TapFeedbackBanner } from './TapFeedbackBanner';
import type { StreamDeckButton } from './types';
import { color, space } from '../theme/glass';

const FEEDBACK_DURATION_MS = 1500;

export function StreamDeckGrid() {
  const { state, isLoading, reorderCategories, reorderButtonsInCategory } = useStreamDeckState();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleButtonPress = useCallback((button: StreamDeckButton) => {
    const message = `Ejecutaría: ${button.action.label}`;
    setFeedbackMessage(message);

    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
    }
    feedbackTimeout.current = setTimeout(() => setFeedbackMessage(null), FEEDBACK_DURATION_MS);
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
        data={state.categoryOrder}
        keyExtractor={id => id}
        onDragEnd={({ data }) => reorderCategories(data)}
        contentContainerStyle={styles.list}
        renderItem={({ item: categoryId, drag, isActive }: RenderItemParams<string>) => (
          <Pressable onLongPress={drag} disabled={isActive}>
            <CategoryRow
              category={state.categories[categoryId]}
              buttons={state.buttons}
              onReorder={newButtonIds => reorderButtonsInCategory(categoryId, newButtonIds)}
              onButtonPress={handleButtonPress}
            />
          </Pressable>
        )}
      />
      <TapFeedbackBanner message={feedbackMessage} />
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
