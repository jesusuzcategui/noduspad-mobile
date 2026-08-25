import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenWithAppBar } from '../navigation/ScreenWithAppBar';
import { GlassPanel } from '../theme/GlassPanel';
import { color, space, type } from '../theme/glass';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <ScreenWithAppBar>
      <View style={styles.container}>
        <GlassPanel style={styles.card}>
          <Text testID="placeholder-title" style={styles.title}>
            {title}
          </Text>
        </GlassPanel>
      </View>
    </ScreenWithAppBar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  card: {
    paddingHorizontal: space.xxl,
    paddingVertical: space.xl,
    alignItems: 'center',
  },
  title: {
    ...type.title,
    fontSize: 22,
    color: color.textPrimary,
  },
});
