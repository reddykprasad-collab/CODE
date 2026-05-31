import { getJournalEntries } from './storage';

export const EVENTS = {
  JOURNAL_SAVED:             'journal_saved',
  DOSE_CONFIRMED:            'dose_confirmed',
  DOSE_SKIPPED:              'dose_skipped',
  PA_STATUS_CHANGED:         'pa_status_changed',
  MIDAS_COMPLETED:           'midas_completed',   // payload: { total, label, delta }
  APP_OPENED:                'app_opened',         // payload: { daysSinceLast }
  TREATMENT_START_SET:       'treatment_start_set',
  TREATMENT_DISCONTINUED:    'treatment_discontinued',
  REFILL_COMPLETED:          'refill_completed',
  CHAT_SIGNAL_DETECTED:      'chat_signal_detected', // detected from AI response, NOT user input
  INTERVENTION_DISMISSED:    'intervention_dismissed',
  INTERVENTION_ACKNOWLEDGED: 'intervention_acknowledged',
  ESCALATION_DETECTED:       'escalation_detected',
};

// 72-hour suppression TTL in ms
const SUPPRESSION_TTL = 72 * 60 * 60 * 1000;

function isWithinDays(dateStr, days) {
  return Date.now() - new Date(dateStr).getTime() < days * 86400000;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function computeHistoryStats() {
  const entries = await getJournalEntries();
  const last7 = entries.filter(e => isWithinDays(e.date, 7));
  const prev180 = entries.filter(e => isWithinDays(e.date, 180) && !isWithinDays(e.date, 7));
  return {
    avgSeverityLast7: avg(last7.filter(e => e.hadMigraine && e.severity).map(e => e.severity)),
    avgSeverityPrev180: avg(prev180.filter(e => e.hadMigraine && e.severity).map(e => e.severity)),
    migraineDays30: entries.filter(e => isWithinDays(e.date, 30) && e.hadMigraine).length,
    entriesLast7: last7.length,
    lastEntryDate: entries[0]?.date ?? null,
  };
}

// Pure function — no side effects. All async work lives in OrchestrationContext.
export function evaluateRules(state, event, historyStats) {
  const now = Date.now();
  let nextPhase = state.journeyPhase;
  const newInterventions = [];
  const suppress = new Set();

  for (const rule of RULES) {
    if (rule.event !== event.type) continue;
    let conditionMet = false;
    try {
      conditionMet = rule.condition(state, event, historyStats);
    } catch {
      continue;
    }
    if (!conditionMet) continue;

    // Phase transition
    if (rule.nextPhase) {
      const resolved = rule.nextPhase(nextPhase);
      if (resolved) nextPhase = resolved;
    }

    // Queue interventions (skip suppressed types)
    for (const intervention of rule.interventions) {
      const isSuppressed = state.suppressionMap?.[intervention.type]
        ? now < state.suppressionMap[intervention.type]
        : false;
      if (!isSuppressed) {
        newInterventions.push({ ...intervention, id: `${intervention.type}_${now}`, queuedAt: now });
      }
    }

    // Collect suppress targets
    for (const type of (rule.suppress || [])) {
      suppress.add(type);
    }
  }

  // Merge new interventions into queue, removing suppressed types
  const existingQueue = (state.interventionQueue || []).filter(
    i => !suppress.has(i.type)
  );
  const interventionQueue = [...newInterventions, ...existingQueue];

  // Extend suppression map with new suppress entries (72h from now)
  const suppressionMap = { ...(state.suppressionMap || {}) };
  for (const type of suppress) {
    suppressionMap[type] = now + SUPPRESSION_TTL;
  }

  return {
    ...state,
    journeyPhase: nextPhase,
    interventionQueue,
    suppressionMap,
    lastEvaluatedAt: now,
    // earlyUsageBehavior promotion: set 'good' once streak reaches 5 in new_start
    earlyUsageBehavior:
      event.type === EVENTS.DOSE_CONFIRMED &&
      state.journeyPhase === 'new_start' &&
      (event.payload?.streak ?? 0) >= 5
        ? 'good'
        : state.earlyUsageBehavior,
  };
}

export const RULES = [
  {
    // P0: escalation detected in chat — suppress all other interventions immediately
    id: 'escalation-safety',
    event: EVENTS.ESCALATION_DETECTED,
    condition: () => true,
    nextPhase: null,
    interventions: [{ type: 'escalation_safety', priority: 0, channel: ['banner'] }],
    suppress: [
      'pa_denial_support', 'access_blocked_support', 'positive_reinforcement',
      'hcp_prep_prompt', 'expectation_reset', 'diary_prompt',
      'first_dose_coaching', 'refill_nudge',
    ],
  },
  {
    id: 'pa-denial-overrides-all',
    event: EVENTS.PA_STATUS_CHANGED,
    condition: (state, event) => event.payload?.status === 'denied',
    nextPhase: null,
    interventions: [{ type: 'pa_denial_support', priority: 1, channel: ['banner', 'notification'] }],
    suppress: ['first_dose_coaching', 'refill_nudge', 'diary_prompt'],
  },
  {
    // TR-16 fix: require minimum 4 entries in last 7 days before "best week" can fire
    id: 'best-week-reinforcement',
    event: EVENTS.JOURNAL_SAVED,
    condition: (state, event, stats) =>
      stats.entriesLast7 >= 4 &&
      stats.avgSeverityPrev180 > 0 &&
      stats.avgSeverityLast7 < stats.avgSeverityPrev180 * 0.6,
    nextPhase: (current) => current === 'early_adherence' ? 'stable' : current,
    interventions: [{ type: 'positive_reinforcement', priority: 2, channel: ['banner'] }],
    suppress: ['refill_nudge'],
  },
  {
    id: 'diary-gap-prompt',
    event: EVENTS.APP_OPENED,
    condition: (state, event) =>
      (event.payload?.daysSinceLast ?? 0) >= 7 && state.journeyPhase !== 'awareness',
    nextPhase: (current) =>
      ['stable', 'early_adherence'].includes(current) ? 'at_risk' : current,
    interventions: [{ type: 'diary_prompt', priority: 3, channel: ['banner'] }],
    suppress: ['refill_nudge'],
  },
  {
    // BUG-1 fix: delta may be null on first completion — null > 0 is false (correct)
    id: 'midas-worsened-hcp-prompt',
    event: EVENTS.MIDAS_COMPLETED,
    condition: (state, event) =>
      (event.payload?.delta !== null && event.payload?.delta > 0) ||
      event.payload?.total >= 21,
    interventions: [{ type: 'hcp_prep_prompt', priority: 2, channel: ['banner', 'notification'] }],
    suppress: [],
  },
  {
    // BUG-2 fix: earlyUsageBehavior is now in schema; only fires when not yet 'good'
    id: 'early-dose-coaching',
    event: EVENTS.DOSE_CONFIRMED,
    condition: (state) =>
      state.journeyPhase === 'new_start' && state.earlyUsageBehavior !== 'good',
    interventions: [{ type: 'first_dose_coaching', priority: 4, channel: ['banner'] }],
    suppress: [],
  },
  {
    id: 'chat-doubt-expectation-reset',
    event: EVENTS.CHAT_SIGNAL_DETECTED,
    condition: (state, event) =>
      event.payload?.signal === 'doubt' && state.journeyPhase === 'early_adherence',
    interventions: [{ type: 'expectation_reset', priority: 3, channel: ['chat_context'] }],
    suppress: [],
  },
  {
    id: 'treatment-start-phase-transition',
    event: EVENTS.TREATMENT_START_SET,
    condition: (state) => state.journeyPhase === 'awareness',
    nextPhase: () => 'new_start',
    interventions: [],
    suppress: [],
  },
  {
    // BUG-3 fix: treatment discontinued resets to awareness and suppresses adherence interventions
    id: 'treatment-discontinued-reset',
    event: EVENTS.TREATMENT_DISCONTINUED,
    condition: () => true,
    nextPhase: () => 'awareness',
    interventions: [],
    suppress: ['first_dose_coaching', 'refill_nudge', 'diary_prompt', 'hcp_prep_prompt', 'positive_reinforcement'],
  },
];

// Intervention context strings injected as synthetic assistant turns in chat (Phase 4).
// These are hardcoded constants — never user-controlled.
export const INTERVENTION_CONTEXTS = {
  expectation_reset: 'Patient may be expressing doubt about treatment progress. Proactively normalize the timeline and emphasize consistency over early symptom changes.',
  pa_denial_support: 'Patient recently received a prior authorization denial. If cost or access comes up, proactively surface that appeals are common and often successful.',
};
