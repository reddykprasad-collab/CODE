import { groupByPeriod } from '../lib/journal';

function makeEntry(daysAgo, opts = {}) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return { id: String(daysAgo), date: d.toISOString(), hadMigraine: false, severity: null, triggers: [], ...opts };
}

// ─── Bucket assignment ────────────────────────────────────────────────────────

describe('groupByPeriod', () => {
  it('places today in "This week"', () => {
    const groups = groupByPeriod([makeEntry(0)]);
    expect(groups[0].title).toBe('This week');
    expect(groups[0].entries).toHaveLength(1);
  });

  it('returns empty array for no entries', () => {
    expect(groupByPeriod([])).toEqual([]);
  });

  it('orders groups newest first: This week → Last week → month', () => {
    const entries = [
      makeEntry(0),   // this week
      makeEntry(9),   // last week
      makeEntry(35),  // ~5 weeks ago
    ];
    const groups = groupByPeriod(entries);
    expect(groups[0].title).toBe('This week');
    expect(groups[1].title).toBe('Last week');
    expect(groups[2].title).toMatch(/\w+ \d{4}/);
  });

  it('caps entries at 60', () => {
    const entries = Array.from({ length: 80 }, (_, i) => makeEntry(i));
    const groups = groupByPeriod(entries);
    const total = groups.reduce((n, g) => n + g.entries.length, 0);
    expect(total).toBe(60);
  });

  // ─── Monday week start ─────────────────────────────────────────────────────

  it('week starts on Monday — Sunday belongs to "Last week" not "This week"', () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    if (dayOfWeek === 0) {
      // Today IS Sunday — it should be in "This week" (Mon-Sun)
      // but last Sunday (7 days ago) should be "Last week"
      const lastSunday = makeEntry(7);
      const groups = groupByPeriod([lastSunday]);
      expect(groups[0].title).toBe('Last week');
    } else {
      // Find the most recent Sunday that already passed this week
      // daysToLastSunday = current dow (since Mon=1, Sun=0 means Sun is 6 days from Mon)
      const daysToLastSunday = dayOfWeek; // e.g. if today=Tue(2), lastSunday=2 days ago
      const lastSunday = makeEntry(daysToLastSunday);
      const groups = groupByPeriod([lastSunday]);
      // With Monday start, the most recent Sunday should be "Last week"
      expect(groups[0].title).toBe('Last week');
    }
  });

  it('Monday is always in "This week" when it occurred this calendar Mon–Sun range', () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;

    if (daysSinceMonday > 0) {
      // This past Monday is within "This week"
      const thisMonday = makeEntry(daysSinceMonday);
      const groups = groupByPeriod([thisMonday]);
      expect(groups[0].title).toBe('This week');
    }
  });
});
