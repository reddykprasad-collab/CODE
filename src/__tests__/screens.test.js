import React from 'react';
import { render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...p }) => <View {...p}>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
}));

jest.mock('expo-device', () => ({ isDevice: false }));

jest.mock('../services/weather', () => ({
  syncWeatherData: jest.fn().mockResolvedValue([]),
  computeWeatherCorrelation: jest.fn().mockReturnValue(null),
}));

jest.mock('../services/notifications', () => ({
  scheduleReminder: jest.fn().mockResolvedValue(undefined),
  cancelAllReminders: jest.fn().mockResolvedValue(undefined),
}));

// useFocusEffect is a no-op in smoke tests — we're testing initial render, not data loading
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockOrchestration = {
  interventionQueue: [],
  dismissIntervention: jest.fn(),
  emitEvent: jest.fn().mockResolvedValue(undefined),
  derivedUserPath: 'awareness',
  orchState: {
    journeyPhase: 'awareness',
    interventionQueue: [],
    suppressionMap: {},
  },
};

jest.mock('../contexts/OrchestrationContext', () => ({
  useOrchestration: () => mockOrchestration,
  OrchestrationProvider: ({ children }) => children,
}));

// navigation prop passed to every screen
const nav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  setOptions: jest.fn(),
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockOrchestration.interventionQueue = [];
});

// ─── Lazy imports (after mocks are registered) ────────────────────────────────

import AwarenessHomeScreen from '../screens/AwarenessHomeScreen';
import AdherenceHomeScreen from '../screens/AdherenceHomeScreen';
import TrendsScreen from '../screens/TrendsScreen';
import RemindersScreen from '../screens/RemindersScreen';
import JournalScreen from '../screens/JournalScreen';

// ─── Smoke tests ──────────────────────────────────────────────────────────────

describe('AwarenessHomeScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<AwarenessHomeScreen navigation={nav} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders a greeting text', () => {
    const { getByText } = render(<AwarenessHomeScreen navigation={nav} />);
    const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
    const found = greetings.some(g => {
      try { getByText(new RegExp(g)); return true; } catch { return false; }
    });
    expect(found).toBe(true);
  });
});

describe('AdherenceHomeScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<AdherenceHomeScreen navigation={nav} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the dose confirmation button', () => {
    const { getByLabelText } = render(<AdherenceHomeScreen navigation={nav} />);
    expect(getByLabelText('Confirm today\'s dose')).toBeTruthy();
  });
});

describe('TrendsScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<TrendsScreen navigation={nav} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the Trends heading', () => {
    const { getByText } = render(<TrendsScreen navigation={nav} />);
    expect(getByText('My trends')).toBeTruthy();
  });
});

describe('RemindersScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<RemindersScreen navigation={nav} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders frequency options', () => {
    const { getByText } = render(<RemindersScreen navigation={nav} />);
    expect(getByText('Daily')).toBeTruthy();
  });
});

describe('JournalScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<JournalScreen navigation={nav} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the Journal heading', () => {
    const { getByText } = render(<JournalScreen navigation={nav} />);
    expect(getByText("Today's log")).toBeTruthy();
  });
});
