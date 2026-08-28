import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ALL_ICON_NAMES, StreamDeckIcon, type StreamDeckIconName } from './StreamDeckIcon';
import { BRAND_ICONS } from './brandIcons';
import { useThemeColors } from '../theme/ThemeContext';
import { radius, space, type } from '../theme/glass';

type IconTab = 'icons' | 'brands';

// PascalCase icon name -> spaced label, e.g. "AlarmClock" -> "Alarm Clock".
function toLabel(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

// Brand entries carry their own human-readable `title`, so the picker
// grid item just needs a name/label pair — for the Lucide tab that's
// derived from the raw name, for the brand tab it comes straight from
// simple-icons' `title` field.
type IconGridItem = { name: StreamDeckIconName; label: string };

type IconPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: StreamDeckIconName) => void;
};

const LUCIDE_ITEMS: IconGridItem[] = ALL_ICON_NAMES.map(name => ({ name, label: toLabel(name) }));
const BRAND_ITEMS: IconGridItem[] = BRAND_ICONS.map(icon => ({ name: `brand:${icon.slug}`, label: icon.title }));

export function IconPickerModal({ visible, onClose, onSelect }: IconPickerModalProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<IconTab>('icons');
  const color = useThemeColors();
  const styles = createStyles(color);

  const items = tab === 'icons' ? LUCIDE_ITEMS : BRAND_ITEMS;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => item.label.toLowerCase().includes(q));
  }, [items, query]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Elegir ícono</Text>
          <View style={styles.segmentRow}>
            <Pressable
              testID="icon-picker-tab-icons"
              onPress={() => setTab('icons')}
              style={[styles.segment, tab === 'icons' && styles.segmentActive]}>
              <Text style={tab === 'icons' ? styles.segmentTextActive : styles.segmentText}>Íconos</Text>
            </Pressable>
            <Pressable
              testID="icon-picker-tab-brands"
              onPress={() => setTab('brands')}
              style={[styles.segment, tab === 'brands' && styles.segmentActive]}>
              <Text style={tab === 'brands' ? styles.segmentTextActive : styles.segmentText}>Marcas</Text>
            </Pressable>
          </View>
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
            keyExtractor={item => item.name}
            numColumns={4}
            keyboardShouldPersistTaps="handled"
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <Pressable
                testID={`icon-picker-option-${item.name}`}
                style={styles.option}
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                }}>
                <StreamDeckIcon name={item.name} size={24} color={color.textPrimary} />
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {item.label}
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

function createStyles(color: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
  segmentRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: space.sm + 2,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: color.inputBorder,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  segmentText: {
    ...type.label,
    color: color.textSecondary,
  },
  segmentTextActive: {
    ...type.label,
    color: '#ffffff',
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
}
