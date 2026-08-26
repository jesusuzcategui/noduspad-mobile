import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ALL_ICON_NAMES, StreamDeckIcon, type StreamDeckIconName } from './StreamDeckIcon';
import { color, radius, space, type } from '../theme/glass';

// PascalCase icon name -> spaced label, e.g. "AlarmClock" -> "Alarm Clock".
function toLabel(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

type IconPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: StreamDeckIconName) => void;
};

export function IconPickerModal({ visible, onClose, onSelect }: IconPickerModalProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ICON_NAMES;
    return ALL_ICON_NAMES.filter(name => name.toLowerCase().includes(q));
  }, [query]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Elegir ícono</Text>
          <TextInput
            testID="icon-picker-search"
            style={styles.search}
            placeholder="Buscar ícono..."
            placeholderTextColor={color.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <Text style={styles.resultCount}>{results.length} resultados</Text>
          <FlatList
            testID="icon-picker-list"
            data={results}
            keyExtractor={item => item}
            numColumns={4}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <Pressable
                testID={`icon-picker-option-${item}`}
                style={styles.option}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}>
                <StreamDeckIcon name={item} size={24} color={color.textPrimary} />
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {toLabel(item)}
                </Text>
              </Pressable>
            )}
          />
          <Pressable testID="icon-picker-close" style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '80%',
    backgroundColor: color.voidBottom,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    borderWidth: 1,
    borderColor: color.panelBorder,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  title: {
    ...type.title,
    fontSize: 18,
    color: color.textPrimary,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  search: {
    borderWidth: 1,
    borderColor: color.inputBorder,
    borderRadius: radius.input,
    backgroundColor: color.inputFill,
    color: color.textPrimary,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    ...type.body,
  },
  resultCount: {
    ...type.caption,
    color: color.textMuted,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  row: {
    gap: space.sm,
    marginBottom: space.sm,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: color.inputBorder,
    backgroundColor: color.inputFill,
  },
  optionLabel: {
    ...type.caption,
    fontSize: 10,
    color: color.textSecondary,
    marginTop: space.xs,
  },
  closeButton: {
    marginTop: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: color.inputBorder,
    alignItems: 'center',
  },
  closeButtonText: {
    ...type.label,
    color: color.textSecondary,
  },
});
