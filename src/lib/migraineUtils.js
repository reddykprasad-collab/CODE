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
