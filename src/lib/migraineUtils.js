// Returns the number of distinct days in `entries` where any acute treatment was used.
// Pass pre-filtered entries (e.g. last 30 days) — this function doesn't filter by date.
export function countAcuteTreatmentDays(entries) {
  const days = new Set();
  entries.forEach(e => {
    const hasStructured = e.acuteTreatments?.length > 0 && !e.acuteTreatments.every(t => t === 'Nothing');
    const hasLegacy = e.treatments && e.treatments.trim().length > 0;
    if (hasStructured || hasLegacy) days.add(new Date(e.date).toDateString());
  });
  return days.size;
}

// Returns MOH status object for the given entries (should be pre-filtered to last 30 days).
// Triptan threshold: 10 days/month. Analgesic threshold: 15 days/month.
export function computeMOHStatus(entries) {
  const triptanDays = new Set();
  const analgesicDays = new Set();

  entries.forEach(e => {
    const treatments = e.acuteTreatments || [];
    const day = new Date(e.date).toDateString();
    if (treatments.some(t => t.toLowerCase().includes('triptan'))) {
      triptanDays.add(day);
    }
    if (treatments.some(t => t.toLowerCase().includes('nsaid') || t.toLowerCase().includes('otc'))) {
      analgesicDays.add(day);
    }
  });

  const td = triptanDays.size;
  const ad = analgesicDays.size;

  // Determine primary drug (whichever is closer to its threshold as a fraction)
  const triptanFraction = td / 10;
  const analgesicFraction = ad / 15;
  const primaryClass = triptanFraction >= analgesicFraction ? 'triptan' : 'analgesic';
  const primaryDays = primaryClass === 'triptan' ? td : ad;
  const primaryThreshold = primaryClass === 'triptan' ? 10 : 15;

  let mohRisk;
  if (primaryDays === 0) {
    mohRisk = 'none';
  } else if (primaryDays >= primaryThreshold) {
    mohRisk = 'exceeded';
  } else if (primaryDays >= primaryThreshold - 3) {
    mohRisk = 'approaching';
  } else {
    mohRisk = 'none';
  }

  return {
    triptanDays: td,
    analgesicDays: ad,
    triptanThreshold: 10,
    analgesicThreshold: 15,
    primaryClass: (td === 0 && ad === 0) ? null : primaryClass,
    primaryDays,
    primaryThreshold,
    mohRisk,
  };
}
