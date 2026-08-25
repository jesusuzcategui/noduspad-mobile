import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import type { StreamDeckButton, StreamDeckCategory } from './types';
import { StreamDeckButtonTile } from './StreamDeckButtonTile';
import { useCarouselItemWidth } from './useCarouselItemWidth';
import { color, space, type } from '../theme/glass';

const ITEM_GAP = space.md;

type CategoryRowProps = {
  category: StreamDeckCategory;
  buttons: Record<string, StreamDeckButton>;
  onReorder: (newButtonIds: string[]) => void;
  onButtonPress: (button: StreamDeckButton) => void;
};

export function CategoryRow({ category, buttons, onReorder, onButtonPress }: CategoryRowProps) {
  const itemWidth = useCarouselItemWidth(ITEM_GAP);

  return (
    <View style={styles.container}>
      <Text testID={`category-name-${category.id}`} style={styles.name}>
        {category.name}
      </Text>
      <DraggableFlatList
        horizontal
        data={category.buttonIds}
        keyExtractor={id => id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: ITEM_GAP }} />}
        onDragEnd={({ data }) => onReorder(data)}
        renderItem={({ item: buttonId, drag, isActive }: RenderItemParams<string>) => (
          <Pressable onLongPress={drag} disabled={isActive}>
            <StreamDeckButtonTile button={buttons[buttonId]} width={itemWidth} onPress={onButtonPress} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: space.lg,
  },
  name: {
    ...type.title,
    fontSize: 16,
    color: color.textSecondary,
    marginBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  list: {
    paddingHorizontal: space.lg,
  },
});
