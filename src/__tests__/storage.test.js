import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getHasOnboarded,
  setHasOnboarded,
  getUserPath,
  setUserPath,
  getJournalEntries,
  saveJournalEntry,
  getStreak,
  confirmDose,
  getReminderConfig,
  saveReminderConfig,
  clearAll,
} from '../services/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// ─── Onboarding ───────────────────────────────────────────────────────────────

describe('onboarding', () => {
  it('returns false when not yet onboarded', async () => {
    const result = await getHasOnboarded();
    expect(result).toBe(false);
  });

  it('returns true after setHasOnboarded', async () => {
    await setHasOnboarded();
    const result = await getHasOnboarded();
    expect(result).toBe(true);
  });
});

// ─── User path ────────────────────────────────────────────────────────────────

describe('user path', () => {
  it('returns null when no path set', async () => {
    const path = await getUserPath();
    expect(path).toBeNull();
  });

  it('saves and retrieves awareness path', async () => {
    await setUserPath('awareness');
    expect(await getUserPath()).toBe('awareness');
  });

  it('saves and retrieves adherence path', async () => {
    await setUserPath('adherence');
    expect(await getUserPath()).toBe('adherence');
  });
});

// ─── Journal ──────────────────────────────────────────────────────────────────

describe('journal entries', () => {
  it('returns empty array when no entries exist', async () => {
    const entries = await getJournalEntries();
    expect(entries).toEqual([]);
  });

  it('saves a journal entry and returns it', async () => {
    const entry = {
      id: '1',
      date: new Date().toISOString(),
      hadMigraine: true,
      severity: 7,
      treatments: 'My rescue medication',
      functionalImpact: ['Stayed home'],
    };
    const result = await saveJournalEntry(entry);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe(7);
    expect(result[0].hadMigraine).toBe(true);
  });

  it('prepends new entries so newest is first', async () => {
    await saveJournalEntry({ id: '1', date: '2024-01-01', hadMigraine: false, severity: null, treatments: '', functionalImpact: [] });
    await saveJournalEntry({ id: '2', date: '2024-01-02', hadMigraine: true, severity: 5, treatments: '', functionalImpact: [] });
    const entries = await getJournalEntries();
    expect(entries[0].id).toBe('2');
    expect(entries[1].id).toBe('1');
  });

  it('accumulates multiple entries', async () => {
    for (let i = 1; i <= 5; i++) {
      await saveJournalEntry({ id: String(i), date: new Date().toISOString(), hadMigraine: i % 2 === 0, severity: i, treatments: '', functionalImpact: [] });
    }
    const entries = await getJournalEntries();
    expect(entries).toHaveLength(5);
  });

  it('saves no-migraine entry with null severity', async () => {
    const entry = { id: '99', date: new Date().toISOString(), hadMigraine: false, severity: null, treatments: '', functionalImpact: [] };
    const result = await saveJournalEntry(entry);
    expect(result[0].severity).toBeNull();
    expect(result[0].hadMigraine).toBe(false);
  });
});

// ─── Streak ───────────────────────────────────────────────────────────────────

describe('streak', () => {
  it('returns count 0 and null lastConfirmed by default', async () => {
    const streak = await getStreak();
    expect(streak.count).toBe(0);
    expect(streak.lastConfirmed).toBeNull();
  });

  it('increments streak to 1 on first confirmation', async () => {
    const streak = await confirmDose();
    expect(streak.count).toBe(1);
    expect(streak.lastConfirmed).not.toBeNull();
  });

  it('does not double-count if confirmed twice on same day', async () => {
    await confirmDose();
    const streak = await confirmDose();
    expect(streak.count).toBe(1);
  });

  it('continues streak if last confirmation was exactly 2 days ago (grace period)', async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    await AsyncStorage.setItem('@migraine/streak', JSON.stringify({ count: 10, lastConfirmed: twoDaysAgo.toISOString() }));
    const streak = await confirmDose();
    expect(streak.count).toBe(11);
  });

  it('resets streak if last confirmation was more than 2 days ago', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    await AsyncStorage.setItem('@migraine/streak', JSON.stringify({ count: 10, lastConfirmed: threeDaysAgo.toISOString() }));
    const streak = await confirmDose();
    expect(streak.count).toBe(1);
  });
});

// ─── Reminders ────────────────────────────────────────────────────────────────

describe('reminder config', () => {
  it('returns default config when nothing saved', async () => {
    const config = await getReminderConfig();
    expect(config.frequency).toBe('daily');
    expect(config.timeSlot).toBe('morning');
  });

  it('saves and retrieves reminder config', async () => {
    await saveReminderConfig({ frequency: 'daily', timeSlot: 'morning' });
    const config = await getReminderConfig();
    expect(config.frequency).toBe('daily');
    expect(config.timeSlot).toBe('morning');
  });

  it('overwrites previous config on resave', async () => {
    await saveReminderConfig({ frequency: 'daily', timeSlot: 'morning' });
    await saveReminderConfig({ frequency: 'monthly', timeSlot: 'evening' });
    const config = await getReminderConfig();
    expect(config.frequency).toBe('monthly');
    expect(config.timeSlot).toBe('evening');
  });
});

// ─── clearAll ─────────────────────────────────────────────────────────────────

describe('clearAll', () => {
  it('wipes all stored data', async () => {
    await setHasOnboarded();
    await setUserPath('adherence');
    await saveJournalEntry({ id: '1', date: new Date().toISOString(), hadMigraine: true, severity: 5, treatments: '', functionalImpact: [] });
    await clearAll();
    expect(await getHasOnboarded()).toBe(false);
    expect(await getUserPath()).toBeNull();
    expect(await getJournalEntries()).toEqual([]);
  });
});
