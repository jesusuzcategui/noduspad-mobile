import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenWithAppBar } from '../navigation/ScreenWithAppBar';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <ScreenWithAppBar>
      <View style={styles.container}>
        <Text testID="placeholder-title" style={styles.title}>
          {title}
        </Text>
      </View>
    </ScreenWithAppBar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d0d',
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
});
