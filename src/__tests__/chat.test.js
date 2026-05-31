// Tests for ChatScreen — renders in demo mode (no API key set)

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: {} } },
  expoConfig: { extra: {} },
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

const mockOrchestration = {
  interventionQueue: [],
  dismissIntervention: jest.fn(),
  emitEvent: jest.fn().mockResolvedValue(undefined),
  derivedUserPath: 'awareness',
  orchState: { journeyPhase: 'awareness', interventionQueue: [], suppressionMap: {} },
};

jest.mock('../contexts/OrchestrationContext', () => ({
  useOrchestration: () => mockOrchestration,
  OrchestrationProvider: ({ children }) => children,
}));

import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockOrchestration.interventionQueue = [];
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

import ChatScreen from '../screens/ChatScreen';

// ─── Initial render ───────────────────────────────────────────────────────────

describe('ChatScreen initial render', () => {
  it('renders the header name', async () => {
    const { getByText } = render(<ChatScreen />);
    await waitFor(() => expect(getByText('Migraine Companion')).toBeTruthy());
  });

  it('shows demo mode status indicator', async () => {
    const { getByText } = render(<ChatScreen />);
    await waitFor(() => expect(getByText('◎ Demo mode')).toBeTruthy());
  });

  it('renders the message input', async () => {
    const { getByLabelText } = render(<ChatScreen />);
    await waitFor(() => expect(getByLabelText('Message input')).toBeTruthy());
  });

  it('renders the send button', async () => {
    const { getByLabelText } = render(<ChatScreen />);
    await waitFor(() => expect(getByLabelText('Send message')).toBeTruthy());
  });

  it('renders the new chat button', async () => {
    const { getByLabelText } = render(<ChatScreen />);
    await waitFor(() => expect(getByLabelText('Start new chat')).toBeTruthy());
  });

  it('renders a welcome message', async () => {
    const { getByText } = render(<ChatScreen />);
    await waitFor(() =>
      expect(getByText(/Hello!/)).toBeTruthy()
    );
  });

  it('shows prompt chips after welcome message', async () => {
    const { getByLabelText } = render(<ChatScreen />);
    await waitFor(() =>
      expect(getByLabelText('What triggers should I be aware of?')).toBeTruthy()
    );
  });
});

// ─── Demo mode send flow ──────────────────────────────────────────────────────

describe('ChatScreen demo send', () => {
  it('shows user message immediately after typing and sending', async () => {
    const { getByLabelText, getByText } = render(<ChatScreen />);
    await waitFor(() => getByLabelText('Message input'));

    const input = getByLabelText('Message input');
    fireEvent.changeText(input, 'What triggers should I be aware of?');
    fireEvent.press(getByLabelText('Send message'));

    await waitFor(() =>
      expect(getByText('What triggers should I be aware of?')).toBeTruthy()
    );
  });

  it('shows AI response after 750ms timeout', async () => {
    const { getByLabelText, getByText } = render(<ChatScreen />);
    await waitFor(() => getByLabelText('Message input'));

    fireEvent.changeText(getByLabelText('Message input'), 'What triggers should I be aware of?');
    fireEvent.press(getByLabelText('Send message'));

    await act(async () => { jest.advanceTimersByTime(750); });

    await waitFor(() =>
      expect(getByText(/Common triggers include/)).toBeTruthy()
    );
  });

  it('clears input after sending', async () => {
    const { getByLabelText } = render(<ChatScreen />);
    await waitFor(() => getByLabelText('Message input'));

    const input = getByLabelText('Message input');
    fireEvent.changeText(input, 'Some message');
    fireEvent.press(getByLabelText('Send message'));

    await waitFor(() => expect(input.props.value).toBe(''));
  });

  it('does not send when input is empty', async () => {
    const { getByLabelText, getAllByText } = render(<ChatScreen />);
    await waitFor(() => getByLabelText('Send message'));

    const countBefore = getAllByText(/Hello!/).length;
    fireEvent.press(getByLabelText('Send message'));

    await act(async () => { jest.advanceTimersByTime(750); });

    expect(getAllByText(/Hello!/).length).toBe(countBefore);
  });
});

// ─── Escalation state from seeded storage ────────────────────────────────────

describe('ChatScreen with seeded escalation in storage', () => {
  it('disables input when escalation message is in history', async () => {
    const savedMessages = [
      { role: 'assistant', content: 'Hello!', timestamp: Date.now() - 1000 },
      { role: 'user', content: 'I feel terrible', timestamp: Date.now() - 500 },
      { role: 'assistant', content: 'ESCALATION_UI', timestamp: Date.now() },
    ];
    await AsyncStorage.setItem('@migraine/chatMessages', JSON.stringify(savedMessages));

    const { getByLabelText } = render(<ChatScreen />);
    // Wait for storage load then check editable is false due to escalation
    await waitFor(() => {
      const input = getByLabelText('Message input');
      expect(input.props.editable).toBe(false);
    });
  });
});

// ─── Retry bubble from seeded storage ─────────────────────────────────────────

describe('ChatScreen with seeded retry in storage', () => {
  it('shows retry button when RETRY_UI message is in history', async () => {
    const savedMessages = [
      { role: 'assistant', content: 'Hello!', timestamp: Date.now() - 1000 },
      { role: 'user', content: 'A question', timestamp: Date.now() - 500 },
      { role: 'assistant', content: 'RETRY_UI', timestamp: Date.now() },
    ];
    await AsyncStorage.setItem('@migraine/chatMessages', JSON.stringify(savedMessages));

    const { getByLabelText } = render(<ChatScreen />);
    await waitFor(() =>
      expect(getByLabelText('Retry sending message')).toBeTruthy()
    );
  });
});
