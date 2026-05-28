import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { evaluateRules, computeHistoryStats } from '../services/orchestration';
import { getOrchestrationState, saveOrchestrationState, DEFAULT_ORCHESTRATION_STATE } from '../services/storage';
import { scheduleOrchestrationNotification } from '../services/notifications';

const OrchestrationContext = createContext(null);

const SUPPRESSION_TTL = 72 * 60 * 60 * 1000;

export function OrchestrationProvider({ children }) {
  const [orchState, setOrchState] = useState(DEFAULT_ORCHESTRATION_STATE);
  const dispatchChainRef = useRef(Promise.resolve());

  // Load persisted state on mount
  useEffect(() => {
    getOrchestrationState().then(setOrchState).catch(() => {});
  }, []);

  const emitEvent = useCallback((eventType, payload = {}) => {
    const event = { type: eventType, payload };
    const p = dispatchChainRef.current.then(() => _processEvent(event, setOrchState));
    dispatchChainRef.current = p.catch(() => {});
    return p;
  }, []);

  // Direct state mutation — bypasses rules engine (UI action, not behavioral trigger)
  const dismissIntervention = useCallback((interventionId, suppress = true) => {
    setOrchState(prev => {
      const dismissed = prev.interventionQueue.find(i => i.id === interventionId);
      const queue = prev.interventionQueue.filter(i => i.id !== interventionId);
      const suppressionMap = suppress && dismissed
        ? { ...prev.suppressionMap, [dismissed.type]: Date.now() + SUPPRESSION_TTL }
        : prev.suppressionMap;
      const next = { ...prev, interventionQueue: queue, suppressionMap };
      saveOrchestrationState(next).catch(() => {});
      return next;
    });
  }, []);

  const derivedUserPath = orchState.journeyPhase === 'awareness' ? 'awareness' : 'adherence';

  return (
    <OrchestrationContext.Provider value={{
      emitEvent,
      dismissIntervention,
      interventionQueue: orchState.interventionQueue,
      journeyPhase: orchState.journeyPhase,
      derivedUserPath,
      orchestrationState: orchState,
    }}>
      {children}
    </OrchestrationContext.Provider>
  );
}

export function useOrchestration() {
  const ctx = useContext(OrchestrationContext);
  if (!ctx) throw new Error('useOrchestration must be used inside OrchestrationProvider');
  return ctx;
}

async function _processEvent(event, setOrchState) {
  let state;
  try {
    state = await getOrchestrationState();
  } catch (err) {
    if (__DEV__) console.error('[Orchestration] State read failed — resetting to defaults', err);
    state = { ...DEFAULT_ORCHESTRATION_STATE };
  }

  // TR-5: separate try for stats — a transient journal read error gets empty stats,
  // not a full abort. Rules that don't use stats still run.
  let historyStats;
  try {
    historyStats = await computeHistoryStats();
  } catch (err) {
    if (__DEV__) console.error('[Orchestration] History stats unavailable — using empty stats', err);
    historyStats = { avgSeverityLast7: 0, avgSeverityPrev180: 0, migraineDays30: 0, entriesLast7: 0, lastEntryDate: null };
  }

  let nextState;
  try {
    nextState = evaluateRules(state, event, historyStats);
  } catch (err) {
    if (__DEV__) console.error('[Orchestration] Rule evaluation failed', err);
    // TR-15: surface a visible degraded state rather than silent nothing.
    // guidance_unavailable renders a neutral "couldn't refresh" banner.
    const degraded = { ...state, interventionQueue: [
      { type: 'guidance_unavailable', priority: 99, channel: ['banner'], id: `guidance_unavailable_${Date.now()}`, queuedAt: Date.now() },
    ]};
    setOrchState(degraded);
    return;
  }

  // Phase 3: schedule notifications for new notification-channel interventions
  const existingIds = new Set(state.interventionQueue.map(i => i.id));
  const newNotifInterventions = nextState.interventionQueue.filter(
    i => !existingIds.has(i.id) && i.channel?.includes('notification')
  );
  for (const intervention of newNotifInterventions) {
    scheduleOrchestrationNotification(intervention).catch(() => {});
  }

  try {
    await saveOrchestrationState(nextState);
  } catch (err) {
    if (__DEV__) console.error('[Orchestration] State write failed — using in-memory state', err);
  }
  setOrchState(nextState);
}
