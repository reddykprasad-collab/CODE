import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteJournalEntry,
  getJournalEntries,
  saveJournalEntry,
  getChatMessages,
  saveChatMessages,
  getCustomTriggers,
  saveCustomTrigger,
  getAssessmentResult,
  saveAssessmentResult,
  getHCPAnswers,
  saveHCPAnswers,
  getTreatmentStatus,
  saveTreatmentStatus,
  getMidasScores,
  saveMidasScore,
  getOrchestrationState,
  saveOrchestrationState,
  confirmDose,
  DEFAULT_ORCHESTRATION_STATE,
} from '../services/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// ─── deleteJournalEntry ────────────────────────────────────────────────────────

describe('deleteJournalEntry', () => {
  it('removes the entry with the given id', async () => {
    await saveJournalEntry({ id: 'a', date: '2024-01-01T10:00:00.000Z', hadMigraine: true, severity: 5, treatments: '', functionalImpact: [], triggers: [] });
    await saveJournalEntry({ id: 'b', date: '2024-01-02T10:00:00.000Z', hadMigraine: false, severity: null, treatments: '', functionalImpact: [], triggers: [] });
    const result = await deleteJournalEntry('a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('returns all entries unchanged when id does not exist', async () => {
    await saveJournalEntry({ id: 'x', date: '2024-01-01T10:00:00.000Z', hadMigraine: false, severity: null, treatments: '', functionalImpact: [], triggers: [] });
    const result = await deleteJournalEntry('nonexistent');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('x');
  });

  it('returns empty array when deleting the only entry', async () => {
    await saveJournalEntry({ id: 'only', date: '2024-01-01T10:00:00.000Z', hadMigraine: false, severity: null, treatments: '', functionalImpact: [], triggers: [] });
    const result = await deleteJournalEntry('only');
    expect(result).toEqual([]);
  });

  it('persists the deletion — subsequent reads also exclude the entry', async () => {
    await saveJournalEntry({ id: 'del', date: '2024-01-01T10:00:00.000Z', hadMigraine: true, severity: 4, treatments: '', functionalImpact: [], triggers: [] });
    await deleteJournalEntry('del');
    const entries = await getJournalEntries();
    expect(entries.find(e => e.id === 'del')).toBeUndefined();
  });
});

// ─── getChatMessages / saveChatMessages ────────────────────────────────────────

describe('chat messages', () => {
  it('returns null when no messages saved', async () => {
    const msgs = await getChatMessages();
    expect(msgs).toBeNull();
  });

  it('saves and retrieves messages', async () => {
    const msgs = [{ id: '1', role: 'user', text: 'hello' }, { id: '2', role: 'assistant', text: 'hi' }];
    await saveChatMessages(msgs);
    const result = await getChatMessages();
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('hello');
  });

  it('caps stored messages at 100 (keeps newest)', async () => {
    const msgs = Array.from({ length: 110 }, (_, i) => ({ id: String(i), role: 'user', text: `msg ${i}` }));
    await saveChatMessages(msgs);
    const result = await getChatMessages();
    expect(result).toHaveLength(100);
    // slice(-100) keeps the last 100
    expect(result[0].id).toBe('10');
    expect(result[99].id).toBe('109');
  });

  it('overwrites previous messages on resave', async () => {
    await saveChatMessages([{ id: '1', role: 'user', text: 'old' }]);
    await saveChatMessages([{ id: '2', role: 'user', text: 'new' }]);
    const result = await getChatMessages();
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('new');
  });
});

// ─── getCustomTriggers / saveCustomTrigger ─────────────────────────────────────

describe('custom triggers', () => {
  it('returns empty array when no triggers saved', async () => {
    expect(await getCustomTriggers()).toEqual([]);
  });

  it('adds a new trigger', async () => {
    const result = await saveCustomTrigger('Altitude');
    expect(result).toContain('Altitude');
  });

  it('does not duplicate a trigger that already exists', async () => {
    await saveCustomTrigger('Screen time');
    const result = await saveCustomTrigger('Screen time');
    expect(result.filter(t => t === 'Screen time')).toHaveLength(1);
  });

  it('accumulates multiple distinct triggers', async () => {
    await saveCustomTrigger('Perfume');
    await saveCustomTrigger('Heat');
    const triggers = await getCustomTriggers();
    expect(triggers).toContain('Perfume');
    expect(triggers).toContain('Heat');
    expect(triggers).toHaveLength(2);
  });

  it('persists across calls', async () => {
    await saveCustomTrigger('Caffeine withdrawal');
    const triggers = await getCustomTriggers();
    expect(triggers).toContain('Caffeine withdrawal');
  });
});

// ─── getAssessmentResult / saveAssessmentResult ────────────────────────────────

describe('assessment result', () => {
  it('returns null when no result saved', async () => {
    expect(await getAssessmentResult()).toBeNull();
  });

  it('saves and retrieves the result', async () => {
    const payload = await saveAssessmentResult({ score: 14, label: 'Moderate' });
    expect(payload.score).toBe(14);
    expect(payload.label).toBe('Moderate');
    expect(await getAssessmentResult()).toMatchObject({ score: 14, label: 'Moderate' });
  });

  it('stamps a savedAt timestamp on save', async () => {
    const result = await saveAssessmentResult({ score: 5 });
    expect(result.savedAt).toBeDefined();
    expect(new Date(result.savedAt).getFullYear()).toBeGreaterThanOrEqual(2024);
  });

  it('overwrites on re-save', async () => {
    await saveAssessmentResult({ score: 10, label: 'Old' });
    await saveAssessmentResult({ score: 22, label: 'New' });
    expect((await getAssessmentResult()).label).toBe('New');
  });
});

// ─── getHCPAnswers / saveHCPAnswers ────────────────────────────────────────────

describe('HCP answers', () => {
  it('returns null when nothing saved', async () => {
    expect(await getHCPAnswers()).toBeNull();
  });

  it('saves and retrieves answers with a savedAt timestamp', async () => {
    await saveHCPAnswers({ mainSymptom: 'throbbing', frequency: '3-4 per month' });
    const result = await getHCPAnswers();
    expect(result.answers.mainSymptom).toBe('throbbing');
    expect(result.savedAt).toBeDefined();
  });

  it('overwrites previous answers on resave', async () => {
    await saveHCPAnswers({ mainSymptom: 'old' });
    await saveHCPAnswers({ mainSymptom: 'updated' });
    const result = await getHCPAnswers();
    expect(result.answers.mainSymptom).toBe('updated');
  });
});

// ─── getTreatmentStatus / saveTreatmentStatus ─────────────────────────────────

describe('treatment status', () => {
  it('returns default status when nothing saved', async () => {
    const status = await getTreatmentStatus();
    expect(status.paStatus).toBe('not_submitted');
    expect(status.paExpiryDate).toBeNull();
    expect(status.refillDate).toBeNull();
  });

  it('saves and retrieves treatment status', async () => {
    const saved = { paStatus: 'approved', paExpiryDate: '2025-12-01', refillDate: '2025-11-01' };
    await saveTreatmentStatus(saved);
    const result = await getTreatmentStatus();
    expect(result).toEqual(saved);
  });

  it('overwrites previous status on resave', async () => {
    await saveTreatmentStatus({ paStatus: 'pending', paExpiryDate: null, refillDate: null });
    await saveTreatmentStatus({ paStatus: 'denied', paExpiryDate: null, refillDate: null });
    const result = await getTreatmentStatus();
    expect(result.paStatus).toBe('denied');
  });
});

// ─── getMidasScores / saveMidasScore ──────────────────────────────────────────

describe('MIDAS scores', () => {
  it('returns empty array when no scores saved', async () => {
    expect(await getMidasScores()).toEqual([]);
  });

  it('saves a score and prepends it', async () => {
    const result = await saveMidasScore({ total: 14, label: 'Moderate', date: '2024-06-01' });
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(14);
  });

  it('prepends newer scores so newest is first', async () => {
    await saveMidasScore({ total: 10, label: 'Mild', date: '2024-01-01' });
    const result = await saveMidasScore({ total: 20, label: 'Moderate', date: '2024-06-01' });
    expect(result[0].total).toBe(20);
    expect(result[1].total).toBe(10);
  });

  it('caps stored scores at 24', async () => {
    for (let i = 0; i < 25; i++) {
      await saveMidasScore({ total: i, label: 'Test', date: `2024-01-${String(i + 1).padStart(2, '0')}` });
    }
    const scores = await getMidasScores();
    expect(scores).toHaveLength(24);
    // Most recent (24) should be first
    expect(scores[0].total).toBe(24);
  });
});

// ─── getOrchestrationState / saveOrchestrationState ──────────────────────────

describe('orchestration state', () => {
  it('returns DEFAULT_ORCHESTRATION_STATE when nothing saved', async () => {
    const state = await getOrchestrationState();
    expect(state).toMatchObject(DEFAULT_ORCHESTRATION_STATE);
  });

  it('saves and retrieves state', async () => {
    const toSave = {
      ...DEFAULT_ORCHESTRATION_STATE,
      journeyPhase: 'stable',
      interventionQueue: [{ type: 'diary_prompt', priority: 3, id: 'dp_1', queuedAt: Date.now() }],
    };
    await saveOrchestrationState(toSave);
    const result = await getOrchestrationState();
    expect(result.journeyPhase).toBe('stable');
    expect(result.interventionQueue).toHaveLength(1);
  });

  it('prunes expired suppression entries on read', async () => {
    const past = Date.now() - 1000; // already expired
    const future = Date.now() + 999999; // still valid
    const stateWithSuppression = {
      ...DEFAULT_ORCHESTRATION_STATE,
      suppressionMap: { diary_prompt: past, escalation_safety: future },
    };
    await AsyncStorage.setItem('@migraine/orchestrationState', JSON.stringify(stateWithSuppression));
    const result = await getOrchestrationState();
    expect(result.suppressionMap.diary_prompt).toBeUndefined();
    expect(result.suppressionMap.escalation_safety).toBeDefined();
  });

  it('returns DEFAULT_ORCHESTRATION_STATE on corrupt data', async () => {
    await AsyncStorage.setItem('@migraine/orchestrationState', 'NOT_JSON{{{');
    const result = await getOrchestrationState();
    expect(result).toMatchObject(DEFAULT_ORCHESTRATION_STATE);
  });

  it('merges saved state with defaults so new fields always have values', async () => {
    // Simulate a saved state that is missing the "version" field (older app version)
    await AsyncStorage.setItem('@migraine/orchestrationState', JSON.stringify({
      journeyPhase: 'early_adherence',
      interventionQueue: [],
      suppressionMap: {},
    }));
    const result = await getOrchestrationState();
    expect(result.journeyPhase).toBe('early_adherence');
    expect(result.version).toBe(DEFAULT_ORCHESTRATION_STATE.version);
  });

  it('strips unknown intervention types when saving (allowlist enforcement)', async () => {
    const state = {
      ...DEFAULT_ORCHESTRATION_STATE,
      interventionQueue: [
        { type: 'diary_prompt', priority: 3 },
        { type: 'INJECTED_EVIL_TYPE', priority: 0 },
      ],
    };
    await saveOrchestrationState(state);
    const result = await getOrchestrationState();
    expect(result.interventionQueue.map(i => i.type)).not.toContain('INJECTED_EVIL_TYPE');
    expect(result.interventionQueue.map(i => i.type)).toContain('diary_prompt');
  });

  it('caps intervention queue to 3 items (enforced by priority sort)', async () => {
    const state = {
      ...DEFAULT_ORCHESTRATION_STATE,
      interventionQueue: [
        { type: 'diary_prompt', priority: 3 },
        { type: 'escalation_safety', priority: 0 },
        { type: 'pa_denial_support', priority: 1 },
        { type: 'positive_reinforcement', priority: 2 },
      ],
    };
    await saveOrchestrationState(state);
    const result = await getOrchestrationState();
    expect(result.interventionQueue).toHaveLength(3);
    // After priority sort, lowest priority number (highest urgency) should be first
    expect(result.interventionQueue[0].type).toBe('escalation_safety');
  });
});

// ─── confirmDose confirmedDates tracking ─────────────────────────────────────

describe('confirmDose confirmedDates', () => {
  it('initialises confirmedDates with todays date on first confirmation', async () => {
    const streak = await confirmDose();
    const today = new Date().toDateString();
    expect(streak.confirmedDates).toContain(today);
  });

  it('does not add today twice if confirmed again the same day', async () => {
    await confirmDose();
    const streak = await confirmDose();
    const today = new Date().toDateString();
    const occurrences = streak.confirmedDates.filter(d => d === today);
    expect(occurrences).toHaveLength(1);
  });

  it('caps confirmedDates at 30 entries', async () => {
    // Seed 30 historical dates
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (30 - i));
      return d.toDateString();
    });
    await AsyncStorage.setItem('@migraine/streak', JSON.stringify({
      count: 30,
      lastConfirmed: new Date(Date.now() - 86400000).toISOString(),
      confirmedDates: dates,
    }));
    const streak = await confirmDose();
    expect(streak.confirmedDates.length).toBeLessThanOrEqual(30);
  });

  it('accumulates dates across separate days', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await AsyncStorage.setItem('@migraine/streak', JSON.stringify({
      count: 1,
      lastConfirmed: yesterday.toISOString(),
      confirmedDates: [yesterday.toDateString()],
    }));
    const streak = await confirmDose();
    expect(streak.confirmedDates).toContain(yesterday.toDateString());
    expect(streak.confirmedDates).toContain(new Date().toDateString());
  });
});
