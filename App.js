import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Jost_300Light,
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
} from '@expo-google-fonts/jost';

import AppNavigator, { navigationRef } from './src/navigation';
import { UserPathProvider } from './src/contexts/UserPathContext';
import { OrchestrationProvider } from './src/contexts/OrchestrationContext';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
  });

  const notifListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    notifListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const type = response.notification.request.content.data?.type;
      if (type === 'dose_reminder' && navigationRef.isReady()) {
        navigationRef.navigate('Main');
      }
    });
    return () => {
      Notifications.removeNotificationSubscription(notifListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) await SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UserPathProvider>
          <OrchestrationProvider>
            <View style={{ flex: 1 }} onLayout={onLayout}>
              <AppNavigator />
            </View>
          </OrchestrationProvider>
        </UserPathProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
