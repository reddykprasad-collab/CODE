import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeHistoryStats } from '../services/orchestration';

// Seed AsyncStorage with journal entries directly (bypassing saveJournalEntry
// to avoid its dedup logic interfering with date placement).
async function seedEntries(entries) {
  await AsyncStorage.setItem('@migraine/journalEntries', JSON.stringify(entries));
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ─── computeHistoryStats ──────────────────────────────────────────────────────

describe('computeHistoryStats', () => {
  it('returns all-zero stats when no journal entries exist', async () => {
    const stats = await computeHistoryStats();
    expect(stats.avgSeverityLast7).toBe(0);
    expect(stats.avgSeverityPrev180).toBe(0);
    expect(stats.migraineDays30).toBe(0);
    expect(stats.entriesLast7).toBe(0);
    expect(stats.lastEntryDate).toBeNull();
  });

  it('reports entriesLast7 correctly — only counts entries within the last 7 days', async () => {
    await seedEntries([
      { id: '1', date: daysAgo(1), hadMigraine: false, severity: null },
      { id: '2', date: daysAgo(3), hadMigraine: false, severity: null },
      { id: '3', date: daysAgo(8), hadMigraine: false, severity: null }, // outside window
    ]);
    const stats = await computeHistoryStats();
    expect(stats.entriesLast7).toBe(2);
  });

  it('computes avgSeverityLast7 only from migraine entries in the last 7 days', async () => {
    await seedEntries([
      { id: '1', date: daysAgo(1), hadMigraine: true, severity: 8 },
      { id: '2', date: daysAgo(2), hadMigraine: true, severity: 6 },
      { id: '3', date: daysAgo(3), hadMigraine: false, severity: null }, // clear day — excluded from avg
      { id: '4', date: daysAgo(10), hadMigraine: true, severity: 9 },  // outside 7-day window
    ]);
    const stats = await computeHistoryStats();
    expect(stats.avgSeverityLast7).toBeCloseTo(7, 1); // (8+6)/2 = 7
  });

  it('computes avgSeverityPrev180 from entries 7–180 days ago, excluding last 7', async () => {
    await seedEntries([
      { id: '1', date: daysAgo(1), hadMigraine: true, severity: 10 },   // in last 7 — excluded from prev180
      { id: '2', date: daysAgo(30), hadMigraine: true, severity: 4 },
      { id: '3', date: daysAgo(60), hadMigraine: true, severity: 6 },
      { id: '4', date: daysAgo(200), hadMigraine: true, severity: 9 },  // outside 180-day window
    ]);
    const stats = await computeHistoryStats();
    expect(stats.avgSeverityPrev180).toBeCloseTo(5, 1); // (4+6)/2 = 5
  });

  it('returns 0 for avgSeverityLast7 when no migraine entries in last 7 days', async () => {
    await seedEntries([
      { id: '1', date: daysAgo(2), hadMigraine: false, severity: null },
      { id: '2', date: daysAgo(5), hadMigraine: false, severity: null },
    ]);
    const stats = await computeHistoryStats();
    expect(stats.avgSeverityLast7).toBe(0);
  });

  it('counts migraineDays30 correctly — only migraine entries in last 30 days', async () => {
    await seedEntries([
      { id: '1', date: daysAgo(1),  hadMigraine: true,  severity: 7 },
      { id: '2', date: daysAgo(10), hadMigraine: true,  severity: 5 },
      { id: '3', date: daysAgo(20), hadMigraine: false, severity: null },
      { id: '4', date: daysAgo(31), hadMigraine: true,  severity: 6 },  // outside 30-day window
    ]);
    const stats = await computeHistoryStats();
    expect(stats.migraineDays30).toBe(2);
  });

  it('sets lastEntryDate to the date of entries[0] (newest entry in the array)', async () => {
    const recentDate = daysAgo(1);
    await seedEntries([
      { id: '1', date: recentDate, hadMigraine: false, severity: null },
      { id: '2', date: daysAgo(5), hadMigraine: false, severity: null },
    ]);
    const stats = await computeHistoryStats();
    expect(stats.lastEntryDate).toBe(recentDate);
  });

  it('excludes entries with null severity from the severity averages', async () => {
    await seedEntries([
      { id: '1', date: daysAgo(1), hadMigraine: true, severity: 8 },
      { id: '2', date: daysAgo(2), hadMigraine: true, severity: null }, // missing severity — excluded
    ]);
    const stats = await computeHistoryStats();
    // Only the entry with severity 8 should count
    expect(stats.avgSeverityLast7).toBeCloseTo(8, 1);
  });

  it('handles a single entry older than 180 days without throwing', async () => {
    await seedEntries([
      { id: '1', date: daysAgo(200), hadMigraine: true, severity: 5 },
    ]);
    const stats = await computeHistoryStats();
    expect(stats.avgSeverityLast7).toBe(0);
    expect(stats.avgSeverityPrev180).toBe(0);
    expect(stats.migraineDays30).toBe(0);
    expect(stats.entriesLast7).toBe(0);
  });
});
