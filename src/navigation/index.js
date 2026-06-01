import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { getHasOnboarded } from '../services/storage';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { colors, fonts } from '../theme';

import OnboardingScreen from '../screens/OnboardingScreen';
import QuizScreen from '../screens/QuizScreen';
import AwarenessHomeScreen from '../screens/AwarenessHomeScreen';
import AdherenceHomeScreen from '../screens/AdherenceHomeScreen';
import ChatScreen from '../screens/ChatScreen';
import JournalScreen from '../screens/JournalScreen';
import RemindersScreen from '../screens/RemindersScreen';
import AssessmentScreen from '../screens/AssessmentScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import HCPPrepScreen from '../screens/HCPPrepScreen';
import TrendsScreen from '../screens/TrendsScreen';
import ToolsScreen from '../screens/ToolsScreen';
import SignInScreen from '../screens/SignInScreen';
import NotificationPermissionScreen from '../screens/NotificationPermissionScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import MidasScreen from '../screens/MidasScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SideEffectsScreen from '../screens/SideEffectsScreen';
import AppealLetterScreen from '../screens/AppealLetterScreen';
import MedicationHistoryScreen from '../screens/MedicationHistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Trends: 'bar-chart-2',
  Reminders: 'bell',
  Chat: 'message-circle',
  Journal: 'book-open',
};

function TabIcon({ name, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Feather
        name={TAB_ICONS[name]}
        size={22}
        color={focused ? colors.lav : colors.slateLight}
      />
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lav }} />}
    </View>
  );
}

const TAB_SCREEN_OPTIONS = ({ route }) => ({
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 90,
    paddingTop: 8,
  },
  tabBarLabelStyle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  tabBarActiveTintColor: colors.lav,
  tabBarInactiveTintColor: colors.slateLight,
  tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
});

function AwarenessTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
      <Tab.Screen name="Home" component={AwarenessHomeScreen} options={{ tabBarAccessibilityLabel: 'Home' }} />
      <Tab.Screen name="Trends" component={TrendsScreen} options={{ tabBarAccessibilityLabel: 'Trends' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarAccessibilityLabel: 'Chat with companion' }} />
      <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarAccessibilityLabel: 'Journal' }} />
    </Tab.Navigator>
  );
}

function AdherenceTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
      <Tab.Screen name="Home" component={AdherenceHomeScreen} options={{ tabBarAccessibilityLabel: 'Home' }} />
      <Tab.Screen name="Reminders" component={RemindersScreen} options={{ tabBarAccessibilityLabel: 'Reminders' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarAccessibilityLabel: 'Chat with companion' }} />
      <Tab.Screen name="Journal" component={JournalScreen} options={{ tabBarAccessibilityLabel: 'Journal' }} />
      <Tab.Screen name="Trends" component={TrendsScreen} options={{ tabBarAccessibilityLabel: 'Trends' }} />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const { derivedUserPath } = useOrchestration();
  if (derivedUserPath === 'adherence') return <AdherenceTabs />;
  return <AwarenessTabs />;
}

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    getHasOnboarded().then(onboarded => {
      setInitialRoute(onboarded ? 'Main' : 'Onboarding');
    });
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Assessment"
          component={AssessmentScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="ArticleDetail"
          component={ArticleDetailScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="HCPPrep"
          component={HCPPrepScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Midas"
          component={MidasScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="SideEffects"
          component={SideEffectsScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="AppealLetter"
          component={AppealLetterScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="MedicationHistory"
          component={MedicationHistoryScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
