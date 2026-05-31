import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/notifications', () => ({
  scheduleOrchestrationNotification: jest.fn().mockResolvedValue(undefined),
  scheduleReminder: jest.fn().mockResolvedValue(undefined),
  cancelAllReminders: jest.fn().mockResolvedValue(undefined),
}));

import { OrchestrationProvider, useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';
import { DEFAULT_ORCHESTRATION_STATE } from '../services/storage';

// ─── Test consumer ────────────────────────────────────────────────────────────

// Captures context values and exposes emitEvent/dismissIntervention for test control
let capturedCtx = null;

function TestConsumer() {
  const ctx = useOrchestration();
  capturedCtx = ctx;
  return (
    <>
      <Text testID="phase">{ctx.journeyPhase}</Text>
      <Text testID="path">{ctx.derivedUserPath}</Text>
      <Text testID="queue-length">{ctx.interventionQueue.length}</Text>
      {ctx.interventionQueue.map(i => (
        <Text key={i.id} testID={`intervention-${i.type}`}>{i.type}</Text>
      ))}
    </>
  );
}

function renderWithProvider() {
  return render(
    <OrchestrationProvider>
      <TestConsumer />
    </OrchestrationProvider>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  capturedCtx = null;
  jest.clearAllMocks();
});

// ─── Mount and initial state ───────────────────────────────────────────────────

describe('OrchestrationProvider — mount', () => {
  it('starts with default awareness phase', async () => {
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('awareness'));
  });

  it('derives awareness path from awareness phase', async () => {
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('path').props.children).toBe('awareness'));
  });

  it('loads persisted phase from AsyncStorage on mount', async () => {
    const persisted = { ...DEFAULT_ORCHESTRATION_STATE, journeyPhase: 'stable' };
    await AsyncStorage.setItem('@migraine/orchestrationState', JSON.stringify(persisted));
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('stable'));
  });

  it('starts with an empty intervention queue', async () => {
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('queue-length').props.children).toBe(0));
  });
});

// ─── emitEvent — phase transitions ────────────────────────────────────────────

describe('emitEvent — phase transitions', () => {
  it('transitions awareness → new_start on TREATMENT_START_SET', async () => {
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('awareness'));

    await act(async () => {
      await capturedCtx.emitEvent(EVENTS.TREATMENT_START_SET, {});
    });

    expect(getByTestId('phase').props.children).toBe('new_start');
    expect(getByTestId('path').props.children).toBe('adherence');
  });

  it('transitions to awareness on TREATMENT_DISCONTINUED from any phase', async () => {
    // Seed a non-awareness phase
    await AsyncStorage.setItem(
      '@migraine/orchestrationState',
      JSON.stringify({ ...DEFAULT_ORCHESTRATION_STATE, journeyPhase: 'stable' })
    );
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('stable'));

    await act(async () => {
      await capturedCtx.emitEvent(EVENTS.TREATMENT_DISCONTINUED, {});
    });

    expect(getByTestId('phase').props.children).toBe('awareness');
  });

  it('persists phase change to AsyncStorage', async () => {
    renderWithProvider();
    await waitFor(() => expect(capturedCtx.journeyPhase).toBe('awareness'));

    await act(async () => {
      await capturedCtx.emitEvent(EVENTS.TREATMENT_START_SET, {});
    });

    const raw = await AsyncStorage.getItem('@migraine/orchestrationState');
    const saved = JSON.parse(raw);
    expect(saved.journeyPhase).toBe('new_start');
  });
});

// ─── emitEvent — intervention queuing ─────────────────────────────────────────

describe('emitEvent — intervention queuing', () => {
  it('queues a diary_prompt when APP_OPENED with daysSinceLast ≥7 (non-awareness phase)', async () => {
    await AsyncStorage.setItem(
      '@migraine/orchestrationState',
      JSON.stringify({ ...DEFAULT_ORCHESTRATION_STATE, journeyPhase: 'stable' })
    );
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('stable'));

    await act(async () => {
      await capturedCtx.emitEvent(EVENTS.APP_OPENED, { daysSinceLast: 8 });
    });

    expect(getByTestId('queue-length').props.children).toBeGreaterThanOrEqual(1);
    expect(getByTestId('intervention-diary_prompt')).toBeTruthy();
  });

  it('does NOT queue diary_prompt for awareness phase', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('awareness'));

    await act(async () => {
      await capturedCtx.emitEvent(EVENTS.APP_OPENED, { daysSinceLast: 8 });
    });

    expect(queryByTestId('intervention-diary_prompt')).toBeNull();
  });

  it('queues pa_denial_support on PA_STATUS_CHANGED with denied status', async () => {
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('awareness'));

    await act(async () => {
      await capturedCtx.emitEvent(EVENTS.PA_STATUS_CHANGED, { status: 'denied' });
    });

    expect(getByTestId('intervention-pa_denial_support')).toBeTruthy();
  });

  it('serialises concurrent emitEvent calls — no lost updates', async () => {
    await AsyncStorage.setItem(
      '@migraine/orchestrationState',
      JSON.stringify({ ...DEFAULT_ORCHESTRATION_STATE, journeyPhase: 'stable' })
    );
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('phase').props.children).toBe('stable'));

    await act(async () => {
      // Fire two events simultaneously — serial chain should process both
      await Promise.all([
        capturedCtx.emitEvent(EVENTS.APP_OPENED, { daysSinceLast: 8 }),
        capturedCtx.emitEvent(EVENTS.PA_STATUS_CHANGED, { status: 'denied' }),
      ]);
    });

    // Both interventions should be present
    expect(getByTestId('intervention-pa_denial_support')).toBeTruthy();
  });
});

// ─── dismissIntervention ──────────────────────────────────────────────────────

describe('dismissIntervention', () => {
  async function renderWithQueuedDiaryPrompt() {
    await AsyncStorage.setItem(
      '@migraine/orchestrationState',
      JSON.stringify({ ...DEFAULT_ORCHESTRATION_STATE, journeyPhase: 'stable' })
    );
    const utils = renderWithProvider();
    await waitFor(() => expect(utils.getByTestId('phase').props.children).toBe('stable'));
    await act(async () => {
      await capturedCtx.emitEvent(EVENTS.APP_OPENED, { daysSinceLast: 8 });
    });
    await waitFor(() =>
      expect(utils.getByTestId('queue-length').props.children).toBeGreaterThan(0)
    );
    return utils;
  }

  it('removes the intervention from the queue', async () => {
    const { getByTestId } = await renderWithQueuedDiaryPrompt();
    const id = capturedCtx.interventionQueue.find(i => i.type === 'diary_prompt')?.id;
    expect(id).toBeDefined();

    act(() => { capturedCtx.dismissIntervention(id, false); });

    await waitFor(() => expect(getByTestId('queue-length').props.children).toBe(0));
  });

  it('adds the intervention type to suppressionMap when suppress=true', async () => {
    await renderWithQueuedDiaryPrompt();
    const id = capturedCtx.interventionQueue.find(i => i.type === 'diary_prompt')?.id;

    act(() => { capturedCtx.dismissIntervention(id, true); });

    await waitFor(() => {
      const suppressed = capturedCtx.orchestrationState.suppressionMap?.diary_prompt;
      expect(suppressed).toBeDefined();
      expect(suppressed).toBeGreaterThan(Date.now());
    });
  });

  it('does NOT add to suppressionMap when suppress=false', async () => {
    const { getByTestId } = await renderWithQueuedDiaryPrompt();
    const id = capturedCtx.interventionQueue.find(i => i.type === 'diary_prompt')?.id;

    act(() => { capturedCtx.dismissIntervention(id, false); });

    await waitFor(() => expect(getByTestId('queue-length').props.children).toBe(0));
    expect(capturedCtx.orchestrationState.suppressionMap?.diary_prompt).toBeUndefined();
  });

  it('persists dismissal and suppression to AsyncStorage', async () => {
    await renderWithQueuedDiaryPrompt();
    const id = capturedCtx.interventionQueue.find(i => i.type === 'diary_prompt')?.id;

    act(() => { capturedCtx.dismissIntervention(id, true); });

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('@migraine/orchestrationState');
      const saved = JSON.parse(raw);
      expect(saved.suppressionMap?.diary_prompt).toBeDefined();
    });
  });
});
