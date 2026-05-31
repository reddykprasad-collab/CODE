// Tests for HCPPrepScreen pure functions and first-step render

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
  useFocusEffect: jest.fn(),
}));

jest.mock('../styles/shared', () => ({
  sharedStyles: { backRow: { flexDirection: 'row' } },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  frequencyFromJournalDays,
  generateDoctorQuestions,
  generateSummary,
} from '../screens/HCPPrepScreen';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// ─── frequencyFromJournalDays ─────────────────────────────────────────────────

describe('frequencyFromJournalDays', () => {
  it('returns 15+ bucket for 15 days', () => {
    expect(frequencyFromJournalDays(15)).toBe('15+ days per month');
  });

  it('returns 15+ bucket for 20 days', () => {
    expect(frequencyFromJournalDays(20)).toBe('15+ days per month');
  });

  it('returns 8-14 bucket for 8 days', () => {
    expect(frequencyFromJournalDays(8)).toBe('8–14 days per month');
  });

  it('returns 8-14 bucket for 14 days', () => {
    expect(frequencyFromJournalDays(14)).toBe('8–14 days per month');
  });

  it('returns 4-7 bucket for 4 days', () => {
    expect(frequencyFromJournalDays(4)).toBe('4–7 days per month');
  });

  it('returns 4-7 bucket for 7 days', () => {
    expect(frequencyFromJournalDays(7)).toBe('4–7 days per month');
  });

  it('returns 1-3 bucket for 3 days', () => {
    expect(frequencyFromJournalDays(3)).toBe('1–3 days per month');
  });

  it('returns 1-3 bucket for 1 day', () => {
    expect(frequencyFromJournalDays(1)).toBe('1–3 days per month');
  });

  it('returns 1-3 bucket for 0 days', () => {
    expect(frequencyFromJournalDays(0)).toBe('1–3 days per month');
  });
});

// ─── generateDoctorQuestions ──────────────────────────────────────────────────

describe('generateDoctorQuestions', () => {
  it('returns an array of strings', () => {
    const q = generateDoctorQuestions({ frequency: '4–7 days per month', impact: [], goal: '' }, null);
    expect(Array.isArray(q)).toBe(true);
    q.forEach(item => expect(typeof item).toBe('string'));
  });

  it('returns at most 4 questions', () => {
    const answers = {
      frequency: '15+ days per month',
      impact: ['Miss work or school', "Can't care for family"],
      goal: 'Reducing how much rescue medication I use',
    };
    const q = generateDoctorQuestions(answers, { avgSeverity: '8', migraineDays: 15 });
    expect(q.length).toBeLessThanOrEqual(4);
  });

  it('asks about preventive candidacy when frequency is high (8-14)', () => {
    const q = generateDoctorQuestions({ frequency: '8–14 days per month', impact: [], goal: '' }, null);
    expect(q[0]).toMatch(/candidate for preventive therapy/i);
  });

  it('asks when threshold is reached when frequency is low', () => {
    const q = generateDoctorQuestions({ frequency: '4–7 days per month', impact: [], goal: '' }, null);
    expect(q[0]).toMatch(/what point/i);
  });

  it('includes work/family impact question when relevant', () => {
    const q = generateDoctorQuestions(
      { frequency: '4–7 days per month', impact: ['Miss work or school'], goal: '' },
      null
    );
    expect(q.some(s => /work/i.test(s))).toBe(true);
  });

  it('includes rescue medication question when goal matches', () => {
    const q = generateDoctorQuestions(
      { frequency: '4–7 days per month', impact: [], goal: 'Reducing how much rescue medication I use' },
      null
    );
    expect(q.some(s => /rescue medication/i.test(s))).toBe(true);
  });

  it('pads to at least 3 questions with a follow-up if not enough criteria', () => {
    const q = generateDoctorQuestions({ frequency: '1–3 days per month', impact: [], goal: '' }, null);
    expect(q.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── generateSummary ──────────────────────────────────────────────────────────

describe('generateSummary', () => {
  const baseAnswers = {
    frequency: '4–7 days per month',
    impact: ['Miss work or school'],
    treatments: 'Ibuprofen',
    goal: 'Fewer migraine days overall',
  };

  it('includes MIGRAINE SUMMARY header', () => {
    const result = generateSummary(baseAnswers, null, null);
    expect(result).toMatch(/MIGRAINE SUMMARY/);
  });

  it('includes self-reported frequency', () => {
    const result = generateSummary(baseAnswers, null, null);
    expect(result).toMatch(/4–7 days per month/);
  });

  it('includes treatments tried', () => {
    const result = generateSummary(baseAnswers, null, null);
    expect(result).toMatch(/Ibuprofen/);
  });

  it('includes journal stats when provided', () => {
    const stats = { daysLogged: 10, migraineDays: 4, avgSeverity: '6.5', topTriggers: ['stress'] };
    const result = generateSummary(baseAnswers, stats, null);
    expect(result).toMatch(/4 out of 10/);
    expect(result).toMatch(/6\.5 \/ 10/);
    expect(result).toMatch(/stress/);
  });

  it('includes PA denied status when txStatus.paStatus is denied', () => {
    const result = generateSummary(baseAnswers, null, { paStatus: 'denied' });
    expect(result).toMatch(/DENIED/);
  });

  it('includes expired PA status', () => {
    const result = generateSummary(baseAnswers, null, { paStatus: 'expired' });
    expect(result).toMatch(/EXPIRED/);
  });

  it('ends with disclaimer text', () => {
    const result = generateSummary(baseAnswers, null, null);
    expect(result).toMatch(/not a medical document/i);
  });
});

// ─── HCPPrepScreen first-step render ─────────────────────────────────────────

import HCPPrepScreen from '../screens/HCPPrepScreen';

const nav = { navigate: jest.fn(), goBack: jest.fn() };

describe('HCPPrepScreen render', () => {
  it('renders step 1 heading', () => {
    const { getByText } = render(<HCPPrepScreen navigation={nav} />);
    expect(getByText('How often do you get migraines?')).toBeTruthy();
  });

  it('renders the four frequency options', () => {
    const { getByText } = render(<HCPPrepScreen navigation={nav} />);
    expect(getByText('1–3 days per month')).toBeTruthy();
    expect(getByText('4–7 days per month')).toBeTruthy();
    expect(getByText('8–14 days per month')).toBeTruthy();
    expect(getByText('15+ days per month')).toBeTruthy();
  });

  it('renders the HCP Prep eyebrow label', () => {
    const { getByText } = render(<HCPPrepScreen navigation={nav} />);
    expect(getByText('HCP Prep')).toBeTruthy();
  });
});
