import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { getHasOnboarded, getUserPath } from '../services/storage';
import { useUserPath } from '../contexts/UserPathContext';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: '⌂',
  Tools: '◈',
  Reminders: '🔔',
  Chat: '💬',
  Journal: '📓',
};

function TabIcon({ name, focused }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 24, color: focused ? colors.lav : colors.slateLight }}>
        {TAB_ICONS[name]}
      </Text>
      {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lav }} />}
    </View>
  );
}

const TAB_SCREEN_OPTIONS = ({ route }) => ({
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    height: 90,
    paddingTop: 8,
  },
  tabBarLabelStyle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.slateLight,
  },
  tabBarActiveTintColor: colors.lav,
  tabBarInactiveTintColor: colors.slateLight,
  tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
});

function AwarenessTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
      <Tab.Screen name="Home" component={AwarenessHomeScreen} />
      <Tab.Screen name="Tools" component={ToolsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} />
    </Tab.Navigator>
  );
}

function AdherenceTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
      <Tab.Screen name="Home" component={AdherenceHomeScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Tools" component={ToolsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { userPath, setUserPathState } = useUserPath();
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    (async () => {
      const onboarded = await getHasOnboarded();
      const path = await getUserPath();
      setUserPathState(path || 'awareness');
      setInitialRoute(onboarded ? 'Main' : 'Onboarding');
    })();
  }, []);

  if (!initialRoute) return null;

  const MainTabs = userPath === 'adherence' ? AdherenceTabs : AwarenessTabs;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
          name="Trends"
          component={TrendsScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
