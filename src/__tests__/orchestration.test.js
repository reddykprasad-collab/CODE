import { evaluateRules, EVENTS, RULES } from '../services/orchestration';
import { DEFAULT_ORCHESTRATION_STATE } from '../services/storage';

// Base state helpers
function makeState(overrides = {}) {
  return { ...DEFAULT_ORCHESTRATION_STATE, ...overrides };
}

function makeEvent(type, payload = {}) {
  return { type, payload };
}

function makeStats(overrides = {}) {
  return {
    avgSeverityLast7: 0,
    avgSeverityPrev180: 0,
    migraineDays30: 0,
    entriesLast7: 0,
    lastEntryDate: null,
    ...overrides,
  };
}

const EMPTY_STATS = makeStats();

describe('evaluateRules — escalation-safety (P0)', () => {
  it('queues escalation_safety intervention and suppresses all other types', () => {
    const state = makeState({
      journeyPhase: 'early_adherence',
      interventionQueue: [{ type: 'refill_nudge', priority: 5, id: 'rn_1', queuedAt: 1 }],
    });
    const next = evaluateRules(state, makeEvent(EVENTS.ESCALATION_DETECTED), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'escalation_safety')).toBe(true);
    expect(next.interventionQueue.some(i => i.type === 'refill_nudge')).toBe(false);
  });

  it('does NOT fire on non-escalation events', () => {
    const state = makeState();
    const next = evaluateRules(state, makeEvent(EVENTS.APP_OPENED, { daysSinceLast: 1 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'escalation_safety')).toBe(false);
  });
});

describe('evaluateRules — pa-denial-overrides-all (P1)', () => {
  it('queues pa_denial_support and suppresses first_dose_coaching and refill_nudge on denial', () => {
    const state = makeState({
      interventionQueue: [
        { type: 'first_dose_coaching', priority: 4, id: 'fdc_1', queuedAt: 1 },
        { type: 'refill_nudge', priority: 5, id: 'rn_1', queuedAt: 1 },
      ],
    });
    const next = evaluateRules(state, makeEvent(EVENTS.PA_STATUS_CHANGED, { status: 'denied' }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'pa_denial_support')).toBe(true);
    expect(next.interventionQueue.some(i => i.type === 'first_dose_coaching')).toBe(false);
    expect(next.interventionQueue.some(i => i.type === 'refill_nudge')).toBe(false);
  });

  it('does NOT fire on approved status', () => {
    const state = makeState();
    const next = evaluateRules(state, makeEvent(EVENTS.PA_STATUS_CHANGED, { status: 'approved' }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'pa_denial_support')).toBe(false);
  });
});

describe('evaluateRules — best-week-reinforcement (P2)', () => {
  it('queues positive_reinforcement and suppresses refill_nudge when best week detected', () => {
    const state = makeState({ interventionQueue: [{ type: 'refill_nudge', priority: 5, id: 'rn', queuedAt: 1 }] });
    const stats = makeStats({ avgSeverityLast7: 2, avgSeverityPrev180: 7, entriesLast7: 5 });
    const next = evaluateRules(state, makeEvent(EVENTS.JOURNAL_SAVED), stats);
    expect(next.interventionQueue.some(i => i.type === 'positive_reinforcement')).toBe(true);
    expect(next.interventionQueue.some(i => i.type === 'refill_nudge')).toBe(false);
  });

  it('does NOT fire when fewer than 4 entries in last 7 days (TR-16 guard)', () => {
    const state = makeState();
    const stats = makeStats({ avgSeverityLast7: 2, avgSeverityPrev180: 7, entriesLast7: 3 });
    const next = evaluateRules(state, makeEvent(EVENTS.JOURNAL_SAVED), stats);
    expect(next.interventionQueue.some(i => i.type === 'positive_reinforcement')).toBe(false);
  });

  it('does NOT fire when severity reduction is less than 40%', () => {
    const state = makeState();
    const stats = makeStats({ avgSeverityLast7: 5, avgSeverityPrev180: 7, entriesLast7: 5 });
    const next = evaluateRules(state, makeEvent(EVENTS.JOURNAL_SAVED), stats);
    expect(next.interventionQueue.some(i => i.type === 'positive_reinforcement')).toBe(false);
  });

  it('transitions early_adherence → stable on best week', () => {
    const state = makeState({ journeyPhase: 'early_adherence' });
    const stats = makeStats({ avgSeverityLast7: 2, avgSeverityPrev180: 7, entriesLast7: 5 });
    const next = evaluateRules(state, makeEvent(EVENTS.JOURNAL_SAVED), stats);
    expect(next.journeyPhase).toBe('stable');
  });
});

describe('evaluateRules — diary-gap-prompt (P3)', () => {
  it('queues diary_prompt and transitions to at_risk when gap >= 7 days in early_adherence', () => {
    const state = makeState({ journeyPhase: 'early_adherence' });
    const next = evaluateRules(state, makeEvent(EVENTS.APP_OPENED, { daysSinceLast: 8 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'diary_prompt')).toBe(true);
    expect(next.journeyPhase).toBe('at_risk');
  });

  it('does NOT fire when gap is less than 7 days', () => {
    const state = makeState({ journeyPhase: 'early_adherence' });
    const next = evaluateRules(state, makeEvent(EVENTS.APP_OPENED, { daysSinceLast: 3 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'diary_prompt')).toBe(false);
  });

  it('does NOT fire when in awareness phase', () => {
    const state = makeState({ journeyPhase: 'awareness' });
    const next = evaluateRules(state, makeEvent(EVENTS.APP_OPENED, { daysSinceLast: 10 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'diary_prompt')).toBe(false);
  });
});

describe('evaluateRules — midas-worsened-hcp-prompt (P2, BUG-1)', () => {
  it('fires when total >= 21 (first completion, delta = null)', () => {
    const state = makeState();
    const next = evaluateRules(state, makeEvent(EVENTS.MIDAS_COMPLETED, { total: 22, label: 'Severe', delta: null }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'hcp_prep_prompt')).toBe(true);
  });

  it('fires when delta > 0 (worsened)', () => {
    const state = makeState();
    const next = evaluateRules(state, makeEvent(EVENTS.MIDAS_COMPLETED, { total: 15, label: 'Moderate', delta: 4 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'hcp_prep_prompt')).toBe(true);
  });

  it('does NOT fire when delta is negative and total < 21', () => {
    const state = makeState();
    const next = evaluateRules(state, makeEvent(EVENTS.MIDAS_COMPLETED, { total: 14, label: 'Moderate', delta: -4 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'hcp_prep_prompt')).toBe(false);
  });

  it('does NOT fire when total < 21 and delta = null (first completion, low score)', () => {
    const state = makeState();
    const next = evaluateRules(state, makeEvent(EVENTS.MIDAS_COMPLETED, { total: 8, label: 'Mild', delta: null }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'hcp_prep_prompt')).toBe(false);
  });
});

describe('evaluateRules — early-dose-coaching (P4, BUG-2)', () => {
  it('fires in new_start when earlyUsageBehavior is null', () => {
    const state = makeState({ journeyPhase: 'new_start', earlyUsageBehavior: null });
    const next = evaluateRules(state, makeEvent(EVENTS.DOSE_CONFIRMED, { streak: 2 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'first_dose_coaching')).toBe(true);
  });

  it('does NOT fire when earlyUsageBehavior is good (BUG-2)', () => {
    const state = makeState({ journeyPhase: 'new_start', earlyUsageBehavior: 'good' });
    const next = evaluateRules(state, makeEvent(EVENTS.DOSE_CONFIRMED, { streak: 6 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'first_dose_coaching')).toBe(false);
  });

  it('does NOT fire outside new_start phase', () => {
    const state = makeState({ journeyPhase: 'early_adherence', earlyUsageBehavior: null });
    const next = evaluateRules(state, makeEvent(EVENTS.DOSE_CONFIRMED, { streak: 2 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'first_dose_coaching')).toBe(false);
  });

  it('promotes earlyUsageBehavior to good when streak reaches 5 in new_start', () => {
    const state = makeState({ journeyPhase: 'new_start', earlyUsageBehavior: null });
    const next = evaluateRules(state, makeEvent(EVENTS.DOSE_CONFIRMED, { streak: 5 }), EMPTY_STATS);
    expect(next.earlyUsageBehavior).toBe('good');
  });
});

describe('evaluateRules — chat-doubt-expectation-reset (P3)', () => {
  it('queues expectation_reset when doubt signal in early_adherence', () => {
    const state = makeState({ journeyPhase: 'early_adherence' });
    const next = evaluateRules(state, makeEvent(EVENTS.CHAT_SIGNAL_DETECTED, { signal: 'doubt' }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'expectation_reset')).toBe(true);
  });

  it('does NOT fire on non-doubt signals', () => {
    const state = makeState({ journeyPhase: 'early_adherence' });
    const next = evaluateRules(state, makeEvent(EVENTS.CHAT_SIGNAL_DETECTED, { signal: 'cost' }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'expectation_reset')).toBe(false);
  });

  it('does NOT fire outside early_adherence phase', () => {
    const state = makeState({ journeyPhase: 'stable' });
    const next = evaluateRules(state, makeEvent(EVENTS.CHAT_SIGNAL_DETECTED, { signal: 'doubt' }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'expectation_reset')).toBe(false);
  });
});

describe('evaluateRules — treatment-discontinued-reset (BUG-3)', () => {
  it('resets journeyPhase to awareness and suppresses adherence interventions', () => {
    const state = makeState({
      journeyPhase: 'early_adherence',
      interventionQueue: [
        { type: 'refill_nudge', priority: 5, id: 'rn', queuedAt: 1 },
        { type: 'first_dose_coaching', priority: 4, id: 'fdc', queuedAt: 1 },
      ],
    });
    const next = evaluateRules(state, makeEvent(EVENTS.TREATMENT_DISCONTINUED), EMPTY_STATS);
    expect(next.journeyPhase).toBe('awareness');
    expect(next.interventionQueue.some(i => i.type === 'refill_nudge')).toBe(false);
    expect(next.interventionQueue.some(i => i.type === 'first_dose_coaching')).toBe(false);
  });
});

describe('evaluateRules — suppression map', () => {
  it('does NOT queue a suppressed intervention type before expiry', () => {
    const futureExpiry = Date.now() + 60 * 60 * 1000; // 1h from now
    const state = makeState({
      journeyPhase: 'early_adherence',
      suppressionMap: { diary_prompt: futureExpiry },
    });
    const next = evaluateRules(state, makeEvent(EVENTS.APP_OPENED, { daysSinceLast: 8 }), EMPTY_STATS);
    expect(next.interventionQueue.some(i => i.type === 'diary_prompt')).toBe(false);
  });

  it('DOES queue if suppression entry is past expiry', () => {
    const pastExpiry = Date.now() - 60 * 60 * 1000; // 1h ago
    const state = makeState({
      journeyPhase: 'early_adherence',
      suppressionMap: { diary_prompt: pastExpiry },
    });
    const next = evaluateRules(state, makeEvent(EVENTS.APP_OPENED, { daysSinceLast: 8 }), EMPTY_STATS);
    // getOrchestrationState prunes expired entries before passing to evaluateRules,
    // so suppressionMap here has the stale entry — rule should still queue if expiry passed
    expect(next.interventionQueue.some(i => i.type === 'diary_prompt')).toBe(true);
  });
});

describe('evaluateRules — treatment-start-phase-transition', () => {
  it('transitions journeyPhase from awareness to new_start on TREATMENT_START_SET', () => {
    const state = makeState({ journeyPhase: 'awareness' });
    const next = evaluateRules(state, makeEvent(EVENTS.TREATMENT_START_SET), EMPTY_STATS);
    expect(next.journeyPhase).toBe('new_start');
  });

  it('does not fire when journeyPhase is already beyond awareness', () => {
    const state = makeState({ journeyPhase: 'early_adherence' });
    const next = evaluateRules(state, makeEvent(EVENTS.TREATMENT_START_SET), EMPTY_STATS);
    expect(next.journeyPhase).toBe('early_adherence');
  });

  it('queues no interventions (transition only)', () => {
    const state = makeState({ journeyPhase: 'awareness' });
    const next = evaluateRules(state, makeEvent(EVENTS.TREATMENT_START_SET), EMPTY_STATS);
    expect(next.interventionQueue).toHaveLength(0);
  });
});

describe('evaluateRules — all rules cover EVENTS constants', () => {
  it('each rule references a valid EVENTS value', () => {
    const validEvents = new Set(Object.values(EVENTS));
    // intervention_dismissed is handled by context, not rules — exclude
    const ruleEvents = RULES.map(r => r.event).filter(e => e !== 'intervention_dismissed');
    for (const e of ruleEvents) {
      expect(validEvents.has(e)).toBe(true);
    }
  });
});
