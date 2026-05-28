export function groupByPeriod(entries) {
  const now = new Date();
  entries = entries.slice(0, 60);

  const thisWeekStart = new Date(now);
  const daysSinceMonday = (now.getDay() + 6) % 7;
  thisWeekStart.setDate(now.getDate() - daysSinceMonday);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const buckets = {};
  const bucketOrder = [];

  entries.forEach(entry => {
    const d = new Date(entry.date);
    let key;
    if (d >= thisWeekStart) key = 'This week';
    else if (d >= lastWeekStart) key = 'Last week';
    else key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!buckets[key]) {
      buckets[key] = [];
      bucketOrder.push(key);
    }
    buckets[key].push(entry);
  });

  return bucketOrder.map(k => ({ title: k, entries: buckets[k] }));
}

export function buildCSV(entries) {
  const header = 'Date,Had Migraine,Severity,Treatments,Triggers,Functional Impact';
  const rows = entries.map(e => {
    const d = new Date(e.date).toLocaleDateString('en-US');
    const migraine = e.hadMigraine ? 'Yes' : 'No';
    const severity = e.severity ?? '';
    const treatments = `"${(e.treatments || '').replace(/"/g, '""')}"`;
    const triggers = `"${(e.triggers || []).join('; ')}"`;
    const impact = `"${(e.functionalImpact || []).join('; ')}"`;
    return [d, migraine, severity, treatments, triggers, impact].join(',');
  });
  return [header, ...rows].join('\n');
}
