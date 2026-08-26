import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import type { StreamDeckButton, StreamDeckCategory } from './types';
import { StreamDeckButtonTile } from './StreamDeckButtonTile';
import { computeItemWidth } from './useCarouselItemWidth';
import { color, space, type } from '../theme/glass';

const ITEM_GAP = space.md;

const ItemSeparator = () => <View style={styles.separator} />;

type CategoryRowProps = {
  category: StreamDeckCategory;
  buttons: Record<string, StreamDeckButton>;
  onReorder: (newButtonIds: string[]) => void;
  onButtonPress: (button: StreamDeckButton) => void;
  onNameLongPress?: () => void;
};

export function CategoryRow({
  category,
  buttons,
  onReorder,
  onButtonPress,
  onNameLongPress,
}: CategoryRowProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const itemWidth =
    measuredWidth > 0 ? computeItemWidth(windowWidth, windowHeight, measuredWidth, ITEM_GAP) : 0;

  const handleLayout = (event: LayoutChangeEvent) => {
    setMeasuredWidth(event.nativeEvent.layout.width);
  };

  const nameElement = (
    <Text testID={`category-name-${category.id}`} style={styles.name}>
      {category.name}
    </Text>
  );

  return (
    <View style={styles.container}>
      {onNameLongPress ? (
        <Pressable onLongPress={onNameLongPress}>{nameElement}</Pressable>
      ) : (
        nameElement
      )}
      <View onLayout={handleLayout}>
        <DraggableFlatList
          testID={`category-buttons-${category.id}`}
          horizontal
          data={category.buttonIds}
          keyExtractor={id => id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={ItemSeparator}
          onDragEnd={({ data }) => onReorder(data)}
          renderItem={({ item: buttonId, drag, isActive }: RenderItemParams<string>) => (
            <StreamDeckButtonTile
              button={buttons[buttonId]}
              width={itemWidth}
              onPress={onButtonPress}
              onLongPress={drag}
              disabled={isActive}
            />
          )}
        />
      </View>
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
  separator: {
    width: ITEM_GAP,
  },
});
