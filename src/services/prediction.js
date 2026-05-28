const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Returns null if not enough data, or { level, label, score, reasons[] }.
export function predictMigraineRisk(entries, weatherData = []) {
  if (!entries || entries.length < 7) return null;

  let score = 0;
  const reasons = [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDow = tomorrow.getDay();

  // Factor 1: Day-of-week pattern (max 25 pts)
  const dowTotal = Array(7).fill(0);
  const dowMigraine = Array(7).fill(0);
  entries.forEach(e => {
    const d = new Date(e.date).getDay();
    dowTotal[d]++;
    if (e.hadMigraine) dowMigraine[d]++;
  });

  const globalRate = entries.filter(e => e.hadMigraine).length / entries.length;
  if (globalRate > 0 && dowTotal[tomorrowDow] >= 3) {
    const dowRate = dowMigraine[tomorrowDow] / dowTotal[tomorrowDow];
    if (dowRate > 0 && dowRate >= globalRate * 1.4) {
      score += 25;
      const pct = Math.round(dowRate * 100);
      reasons.push(`${DAY_NAMES[tomorrowDow]}s have been high-risk for you (${pct}% of entries)`);
    }
  }

  // Factor 2: Recent trigger load (max 35 pts)
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const recent = entries.filter(e => new Date(e.date) >= fiveDaysAgo);

  const trigCounts = {};
  recent.forEach(e => (e.triggers || []).forEach(t => { trigCounts[t] = (trigCounts[t] || 0) + 1; }));
  const topTrigger = Object.entries(trigCounts).sort((a, b) => b[1] - a[1])[0];

  if (topTrigger?.[1] >= 3) {
    score += 35;
    reasons.push(`${topTrigger[0]} has appeared ${topTrigger[1]} times in the past 5 days`);
  } else if (topTrigger?.[1] === 2) {
    score += 20;
    reasons.push(`${topTrigger[0]} appeared twice in the past 5 days`);
  } else if (Object.keys(trigCounts).length >= 4) {
    score += 15;
    reasons.push('Multiple triggers logged in the past 5 days');
  }

  // Factor 3: Migraine cycle proximity (max 30 pts)
  const migraineEntries = entries
    .filter(e => e.hadMigraine)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (migraineEntries.length >= 4) {
    const dates = migraineEntries.slice(0, 8).map(e => new Date(e.date));
    const gaps = [];
    for (let i = 0; i < dates.length - 1; i++) {
      const gap = (dates[i] - dates[i + 1]) / 864e5;
      if (gap >= 3 && gap <= 45) gaps.push(gap);
    }

    if (gaps.length >= 2) {
      const avgCycle = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const daysSinceLast = (Date.now() - dates[0]) / 864e5;
      const progress = daysSinceLast / avgCycle;

      if (progress >= 0.85 && progress <= 1.2) {
        score += 30;
        reasons.push(`You're approaching your typical ${Math.round(avgCycle)}-day migraine cycle`);
      } else if (progress >= 0.7) {
        score += 12;
      }
    }
  }

  // Factor 4: Recent barometric pressure drop (max 20 pts)
  if (weatherData.length >= 7) {
    const sorted = [...weatherData].sort((a, b) => a.date.localeCompare(b.date));
    const tail = sorted.slice(-3);

    if (tail.length >= 2) {
      const recentDrop = tail[tail.length - 2].pressure - tail[tail.length - 1].pressure;

      // Determine if this user is pressure-sensitive based on their history
      const pressureMap = {};
      sorted.forEach(d => { pressureMap[d.date] = d.pressure; });
      const migrainePressures = [];
      const clearPressures = [];
      entries.forEach(e => {
        const dateStr = new Date(e.date).toISOString().slice(0, 10);
        if (pressureMap[dateStr] !== undefined) {
          if (e.hadMigraine) migrainePressures.push(pressureMap[dateStr]);
          else clearPressures.push(pressureMap[dateStr]);
        }
      });

      const pressureSensitive = migrainePressures.length >= 3 && clearPressures.length >= 2 &&
        (migrainePressures.reduce((a, b) => a + b, 0) / migrainePressures.length) <
        (clearPressures.reduce((a, b) => a + b, 0) / clearPressures.length) - 2.5;

      if (pressureSensitive && recentDrop >= 5) {
        score += 20;
        reasons.push(`Pressure dropped ${recentDrop.toFixed(0)} hPa recently — a pattern that precedes your migraines`);
      } else if (recentDrop >= 8) {
        score += 10;
        reasons.push(`Significant pressure drop of ${recentDrop.toFixed(0)} hPa in recent weather`);
      }
    }
  }

  let level, label;
  if (score >= 45) { level = 'elevated'; label = 'Elevated'; }
  else if (score >= 22) { level = 'moderate'; label = 'Moderate'; }
  else { level = 'low'; label = 'Low'; }

  return { level, label, score, reasons: reasons.slice(0, 3) };
}
