import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AboutScreen } from './AboutScreen';
import { EditModeProvider } from '../streamdeck/EditModeContext';
import { AllThemeProviders } from '../testUtils/AllThemeProviders';
import packageInfo from '../../package.json';

// AboutScreen renders ScreenWithAppBar, which needs a real navigator screen.
const Stack = createNativeStackNavigator();

describe('AboutScreen', () => {
  it('renders the app name, version, and logo', async () => {
    const { getByText, getByTestId } = await render(
      <AllThemeProviders>
        <EditModeProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="About">{() => <AboutScreen />}</Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </EditModeProvider>
      </AllThemeProviders>,
    );

    expect(getByText('Native Stream Deck')).toBeTruthy();
    expect(getByText(`Versión ${packageInfo.version}`)).toBeTruthy();
    expect(getByTestId('about-logo')).toBeTruthy();
  });
});
