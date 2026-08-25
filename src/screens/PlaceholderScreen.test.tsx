import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlaceholderScreen } from './PlaceholderScreen';

// PlaceholderScreen renders ScreenWithAppBar, which calls useRoute()/useNavigation()
// and therefore must be mounted inside an actual navigator screen (not just a bare
// NavigationContainer) or React Navigation throws "Couldn't find a route object."
const Stack = createNativeStackNavigator();

describe('PlaceholderScreen', () => {
  it('renders the given title', async () => {
    const { getByTestId } = await render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home">{() => <PlaceholderScreen title="Home" />}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>,
    );
    expect(getByTestId('placeholder-title').props.children).toBe('Home');
  });
});
