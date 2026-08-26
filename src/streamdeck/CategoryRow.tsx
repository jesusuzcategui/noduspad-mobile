import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Plus } from 'lucide-react-native';
import type { StreamDeckButton, StreamDeckCategory } from './types';
import { StreamDeckButtonTile } from './StreamDeckButtonTile';
import { computeItemWidth } from './useCarouselItemWidth';
import { color, radius, space, type } from '../theme/glass';

const ITEM_GAP = space.md;

const ItemSeparator = () => <View style={styles.separator} />;

type CategoryRowProps = {
  category: StreamDeckCategory;
  buttons: Record<string, StreamDeckButton>;
  onReorder: (newButtonIds: string[]) => void;
  onButtonPress: (button: StreamDeckButton) => void;
  onNameLongPress?: () => void;
  isEditMode?: boolean;
  onAddButton?: (categoryId: string) => void;
};

export function CategoryRow({
  category,
  buttons,
  onReorder,
  onButtonPress,
  onNameLongPress,
  isEditMode = false,
  onAddButton,
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
      <View testID={`category-row-layout-${category.id}`} onLayout={handleLayout}>
        <DraggableFlatList
          // react-native-draggable-flatlist v4 caches each cell's drag-end position
          // (`heldTanslate`) until that cell's onLayout fires again — but RN only
          // fires onLayout when a cell's measured size changes, not just its position.
          // Our buttons all share the same computed width, so after a reorder most
          // cells never re-fire onLayout, and they render at their stale mid-drag
          // position (often overlapping a neighbor or off the visible strip) until
          // touched again. Keying the list on the button order forces a full remount
          // on every reorder, which resets that cache cleanly. The lists are tiny
          // (a handful of buttons), so a remount is cheap.
          key={category.buttonIds.join(',')}
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
          ListFooterComponent={
            isEditMode && itemWidth > 0 && onAddButton ? (
              <Pressable
                testID={`add-button-${category.id}`}
                onPress={() => onAddButton(category.id)}
                style={[styles.addTile, { width: itemWidth, height: itemWidth }]}>
                <Plus color={color.textSecondary} size={28} />
              </Pressable>
            ) : undefined
          }
          ListFooterComponentStyle={styles.footer}
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
  footer: {
    marginLeft: ITEM_GAP,
  },
  addTile: {
    borderRadius: radius.chip,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: color.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
