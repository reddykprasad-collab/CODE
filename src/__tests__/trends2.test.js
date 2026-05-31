// TrendsScreen integration tests — heading, empty state, export accessibility

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...p }) => <View {...p}>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { cb(); },
}));

jest.mock('../services/weather', () => ({
  syncWeatherData: jest.fn().mockResolvedValue([]),
  computeWeatherCorrelation: jest.fn().mockReturnValue(null),
}));

jest.mock('../lib/journal', () => ({
  buildCSV: jest.fn().mockReturnValue('date,severity\n'),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

import TrendsScreen from '../screens/TrendsScreen';

const nav = { navigate: jest.fn(), goBack: jest.fn() };

// ─── Heading ──────────────────────────────────────────────────────────────────

describe('TrendsScreen heading', () => {
  it('renders the My trends heading', () => {
    const { getByText } = render(<TrendsScreen navigation={nav} />);
    expect(getByText('My trends')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    const { getByText } = render(<TrendsScreen navigation={nav} />);
    expect(getByText(/28-day|pattern/i)).toBeTruthy();
  });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('TrendsScreen empty state', () => {
  it('shows empty state message when no journal entries', async () => {
    const { getByText } = render(<TrendsScreen navigation={nav} />);
    await waitFor(() =>
      expect(getByText('No data yet')).toBeTruthy()
    );
  });
});

// ─── With journal data ────────────────────────────────────────────────────────

describe('TrendsScreen with journal data', () => {
  beforeEach(async () => {
    const entries = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      entries.push({
        date: d.toISOString(),
        hadMigraine: i % 3 === 0,
        severity: 6,
        triggers: ['stress'],
      });
    }
    await AsyncStorage.setItem('@journal_entries', JSON.stringify(entries));
  });

  it('renders without crashing when entries are present', async () => {
    const { toJSON } = render(<TrendsScreen navigation={nav} />);
    await waitFor(() => expect(toJSON()).not.toBeNull());
  });
});

// ─── Export button accessibility ──────────────────────────────────────────────

describe('TrendsScreen export button', () => {
  it('export button has accessible label when entries are present', async () => {
    const entries = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      entries.push({ date: d.toISOString(), hadMigraine: true, severity: 5, triggers: [] });
    }
    await AsyncStorage.setItem('@migraine/journalEntries', JSON.stringify(entries));

    const { getByLabelText } = render(<TrendsScreen navigation={nav} />);
    await waitFor(() =>
      expect(getByLabelText('Export journal as CSV')).toBeTruthy()
    );
  });
});
