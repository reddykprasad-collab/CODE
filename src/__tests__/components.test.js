import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }) => <View {...props}>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium' },
}));

// OrchestrationContext mock — tests that need specific queue states set it before rendering
const mockOrchestration = {
  interventionQueue: [],
  dismissIntervention: jest.fn(),
  emitEvent: jest.fn(),
  derivedUserPath: 'awareness',
};

jest.mock('../contexts/OrchestrationContext', () => ({
  useOrchestration: () => mockOrchestration,
  OrchestrationProvider: ({ children }) => children,
}));

import QuickLogSection from '../components/QuickLogSection';
import TreatmentStatusSection from '../components/TreatmentStatusSection';
import InterventionBanner from '../components/InterventionBanner';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockOrchestration.interventionQueue = [];
  mockOrchestration.dismissIntervention.mockClear();
});

// ─── QuickLogSection ──────────────────────────────────────────────────────────

describe('QuickLogSection', () => {
  it('renders the Migraine and Clear day toggle buttons', () => {
    const { getByLabelText } = render(<QuickLogSection isLogged={false} />);
    expect(getByLabelText('Migraine today')).toBeTruthy();
    expect(getByLabelText('Clear day')).toBeTruthy();
  });

  it('renders a Save button', () => {
    const { getByLabelText } = render(<QuickLogSection isLogged={false} />);
    expect(getByLabelText("Save today's log")).toBeTruthy();
  });

  it('shows the severity grid after selecting Migraine', () => {
    const { getByLabelText, queryByLabelText } = render(<QuickLogSection isLogged={false} />);
    // Before selection — severity buttons should not exist
    expect(queryByLabelText('Severity 5')).toBeNull();
    fireEvent.press(getByLabelText('Migraine today'));
    // After selection — severity grid should appear
    expect(getByLabelText('Severity 5')).toBeTruthy();
  });

  it('does not show severity grid after selecting Clear day', () => {
    const { getByLabelText, queryByLabelText } = render(<QuickLogSection isLogged={false} />);
    fireEvent.press(getByLabelText('Clear day'));
    expect(queryByLabelText('Severity 5')).toBeNull();
  });

  it('calls onSaved after saving a migraine entry', async () => {
    const onSaved = jest.fn();
    const { getByLabelText } = render(<QuickLogSection isLogged={false} onSaved={onSaved} />);
    fireEvent.press(getByLabelText('Migraine today'));
    await act(async () => {
      fireEvent.press(getByLabelText("Save today's log"));
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('calls onSaved after saving a clear day entry', async () => {
    const onSaved = jest.fn();
    const { getByLabelText } = render(<QuickLogSection isLogged={false} onSaved={onSaved} />);
    fireEvent.press(getByLabelText('Clear day'));
    await act(async () => {
      fireEvent.press(getByLabelText("Save today's log"));
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('renders the logged-today variant when isLogged=true', () => {
    const { getByLabelText } = render(<QuickLogSection isLogged={true} onAddDetail={() => {}} />);
    expect(getByLabelText('Today logged. Tap to add more detail.')).toBeTruthy();
  });

  it('calls onAddDetail when the logged-today card is pressed', () => {
    const onAddDetail = jest.fn();
    const { getByLabelText } = render(<QuickLogSection isLogged={true} onAddDetail={onAddDetail} />);
    fireEvent.press(getByLabelText('Today logged. Tap to add more detail.'));
    expect(onAddDetail).toHaveBeenCalledTimes(1);
  });

  it('renders an optional header when headerText is supplied', () => {
    const { getByText } = render(
      <QuickLogSection isLogged={false} headerText="How are you feeling today?" />
    );
    expect(getByText('How are you feeling today?')).toBeTruthy();
  });
});

// ─── TreatmentStatusSection ───────────────────────────────────────────────────

const baseStatus = {
  paStatus: 'not_submitted',
  paExpiryDate: null,
  refillDate: null,
};

describe('TreatmentStatusSection', () => {
  it('renders without crashing with default status', () => {
    const { getByText } = render(
      <TreatmentStatusSection status={baseStatus} onUpdate={() => {}} />
    );
    expect(getByText('Treatment Access')).toBeTruthy();
  });

  it('renders the Edit button', () => {
    const { getByLabelText } = render(
      <TreatmentStatusSection status={baseStatus} onUpdate={() => {}} />
    );
    expect(getByLabelText('Edit treatment access details')).toBeTruthy();
  });

  it('shows Prior Auth and Next Refill labels', () => {
    const { getByText } = render(
      <TreatmentStatusSection status={baseStatus} onUpdate={() => {}} />
    );
    expect(getByText('Prior Auth')).toBeTruthy();
    expect(getByText('Next Refill')).toBeTruthy();
  });

  it('shows Not set when no refill date is configured', () => {
    const { getByText } = render(
      <TreatmentStatusSection status={baseStatus} onUpdate={() => {}} />
    );
    expect(getByText('Not set')).toBeTruthy();
  });

  it('shows the PA status pill label', () => {
    const { getByText } = render(
      <TreatmentStatusSection
        status={{ ...baseStatus, paStatus: 'approved' }}
        onUpdate={() => {}}
      />
    );
    expect(getByText('Approved')).toBeTruthy();
  });

  it('opens the edit panel when Edit is pressed', () => {
    const { getByLabelText, getByText } = render(
      <TreatmentStatusSection status={baseStatus} onUpdate={() => {}} />
    );
    fireEvent.press(getByLabelText('Edit treatment access details'));
    expect(getByLabelText('Save')).toBeTruthy();
    expect(getByLabelText('Cancel')).toBeTruthy();
  });

  it('closes the edit panel when Cancel is pressed', () => {
    const { getByLabelText, queryByLabelText } = render(
      <TreatmentStatusSection status={baseStatus} onUpdate={() => {}} />
    );
    fireEvent.press(getByLabelText('Edit treatment access details'));
    fireEvent.press(getByLabelText('Cancel'));
    expect(queryByLabelText('Save')).toBeNull();
  });

  it('calls onUpdate when Save is pressed', () => {
    const onUpdate = jest.fn();
    const { getByLabelText } = render(
      <TreatmentStatusSection status={baseStatus} onUpdate={onUpdate} />
    );
    fireEvent.press(getByLabelText('Edit treatment access details'));
    fireEvent.press(getByLabelText('Save'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows the urgency alert when PA is denied', () => {
    const { getByText } = render(
      <TreatmentStatusSection
        status={{ ...baseStatus, paStatus: 'denied' }}
        onUpdate={() => {}}
      />
    );
    expect(getByText(/Prior auth was denied/i)).toBeTruthy();
  });
});

// ─── InterventionBanner ───────────────────────────────────────────────────────

describe('InterventionBanner', () => {
  it('renders nothing when intervention queue is empty', () => {
    const { toJSON } = render(<InterventionBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when queue has items but none have a banner channel', () => {
    mockOrchestration.interventionQueue = [
      { id: 'dp1', type: 'diary_prompt', channel: ['chat'], priority: 3 },
    ];
    const { toJSON } = render(<InterventionBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders the banner title and body for a diary_prompt intervention', () => {
    mockOrchestration.interventionQueue = [
      { id: 'dp1', type: 'diary_prompt', channel: ['banner'], priority: 3 },
    ];
    const { getByText } = render(<InterventionBanner />);
    expect(getByText('Time to log')).toBeTruthy();
  });

  it('renders the CTA button when the intervention config includes a cta', () => {
    mockOrchestration.interventionQueue = [
      { id: 'pa1', type: 'pa_denial_support', channel: ['banner'], priority: 1 },
    ];
    const { getByLabelText } = render(<InterventionBanner />);
    expect(getByLabelText('What you can do')).toBeTruthy();
  });

  it('calls dismissIntervention when Dismiss is pressed', () => {
    mockOrchestration.interventionQueue = [
      { id: 'dp1', type: 'diary_prompt', channel: ['banner'], priority: 3 },
    ];
    const { getByLabelText } = render(<InterventionBanner />);
    fireEvent.press(getByLabelText('Dismiss'));
    expect(mockOrchestration.dismissIntervention).toHaveBeenCalledWith('dp1', true);
  });

  it('calls onCtaPress with intervention type when CTA is pressed', () => {
    mockOrchestration.interventionQueue = [
      { id: 'prs1', type: 'positive_reinforcement', channel: ['banner'], priority: 2 },
    ];
    const onCtaPress = jest.fn();
    const { getByLabelText } = render(<InterventionBanner onCtaPress={onCtaPress} />);
    fireEvent.press(getByLabelText('See your trends'));
    expect(onCtaPress).toHaveBeenCalledWith('positive_reinforcement');
  });

  it('calls dismissIntervention(id, false) when CTA is pressed', () => {
    mockOrchestration.interventionQueue = [
      { id: 'prs1', type: 'positive_reinforcement', channel: ['banner'], priority: 2 },
    ];
    const { getByLabelText } = render(<InterventionBanner onCtaPress={() => {}} />);
    fireEvent.press(getByLabelText('See your trends'));
    expect(mockOrchestration.dismissIntervention).toHaveBeenCalledWith('prs1', false);
  });

  it('sets accessibilityRole="alert" on the container for urgent interventions', () => {
    mockOrchestration.interventionQueue = [
      { id: 'esc1', type: 'escalation_safety', channel: ['banner'], priority: 0 },
    ];
    const { UNSAFE_getByProps } = render(<InterventionBanner />);
    expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
  });

  it('renders nothing when the intervention type has no matching config', () => {
    mockOrchestration.interventionQueue = [
      { id: 'x1', type: 'unknown_type_with_no_config', channel: ['banner'], priority: 3 },
    ];
    const { toJSON } = render(<InterventionBanner />);
    expect(toJSON()).toBeNull();
  });
});
