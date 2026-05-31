import { buildCSV } from '../lib/journal';

// ─── buildCSV ─────────────────────────────────────────────────────────────────

describe('buildCSV', () => {
  const baseEntry = {
    id: '1',
    date: '2024-06-15T09:00:00.000Z',
    hadMigraine: true,
    severity: 7,
    treatments: 'Nurtec ODT',
    triggers: ['Stress', 'Poor sleep'],
    functionalImpact: ['Missed work', 'Stayed home'],
  };

  it('includes the correct header row as the first line', () => {
    const csv = buildCSV([baseEntry]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('Date,Had Migraine,Severity,Treatments,Triggers,Functional Impact');
  });

  it('formats a migraine entry row correctly', () => {
    const csv = buildCSV([baseEntry]);
    const lines = csv.split('\n');
    const row = lines[1];
    expect(row).toContain('Yes');
    expect(row).toContain('7');
    expect(row).toContain('"Nurtec ODT"');
    expect(row).toContain('"Stress; Poor sleep"');
    expect(row).toContain('"Missed work; Stayed home"');
  });

  it('uses "No" for clear days and leaves severity blank', () => {
    const clearEntry = { ...baseEntry, id: '2', hadMigraine: false, severity: null, date: '2024-06-16T09:00:00.000Z' };
    const csv = buildCSV([clearEntry]);
    const row = csv.split('\n')[1];
    expect(row).toContain('No');
    // severity field should be empty — two adjacent commas
    const fields = row.split(',');
    const severityIndex = 2; // Date, Had Migraine, Severity
    expect(fields[severityIndex]).toBe('');
  });

  it('wraps treatments in double quotes and escapes internal quotes', () => {
    const entry = { ...baseEntry, treatments: 'She said "take it" immediately' };
    const csv = buildCSV([entry]);
    // Internal double quotes should become ""
    expect(csv).toContain('"She said ""take it"" immediately"');
  });

  it('produces empty quoted strings for missing triggers and impact', () => {
    const entry = { ...baseEntry, triggers: [], functionalImpact: [] };
    const csv = buildCSV([entry]);
    const row = csv.split('\n')[1];
    // Should contain two empty quoted fields: ""
    const quotedEmpties = (row.match(/""/g) || []).length;
    expect(quotedEmpties).toBeGreaterThanOrEqual(2);
  });

  it('handles undefined treatments gracefully', () => {
    const entry = { ...baseEntry, treatments: undefined };
    expect(() => buildCSV([entry])).not.toThrow();
    const row = buildCSV([entry]).split('\n')[1];
    expect(row).toContain('""');
  });

  it('returns only the header for an empty entries array', () => {
    const csv = buildCSV([]);
    expect(csv).toBe('Date,Had Migraine,Severity,Treatments,Triggers,Functional Impact');
  });

  it('produces n+1 lines for n entries (header + one row per entry)', () => {
    const entries = [
      { ...baseEntry, id: '1', date: '2024-06-15T09:00:00.000Z' },
      { ...baseEntry, id: '2', date: '2024-06-16T09:00:00.000Z', hadMigraine: false, severity: null },
      { ...baseEntry, id: '3', date: '2024-06-17T09:00:00.000Z', severity: 3 },
    ];
    const lines = buildCSV(entries).split('\n');
    expect(lines).toHaveLength(4);
  });

  it('uses semicolons to join multiple triggers and impacts within a cell', () => {
    const entry = { ...baseEntry, triggers: ['A', 'B', 'C'], functionalImpact: ['X', 'Y'] };
    const csv = buildCSV([entry]);
    expect(csv).toContain('"A; B; C"');
    expect(csv).toContain('"X; Y"');
  });
});
