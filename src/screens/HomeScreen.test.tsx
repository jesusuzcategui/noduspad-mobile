import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from './HomeScreen';

const Stack = createNativeStackNavigator();

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('HomeScreen', () => {
  it('renders the Stream Deck grid with seeded categories', async () => {
    await render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home">{() => <HomeScreen />}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-name-cat-obs')).toBeTruthy();
    });
  });
});
