const MS_PER_DAY = 864e5;

export function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

// Midnight-aligned so timezone offset doesn't bleed into day counts.
export function daysUntilDate(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / MS_PER_DAY);
}

export function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function daysSinceDate(dateStrOrISO) {
  return Math.floor((Date.now() - new Date(dateStrOrISO).getTime()) / MS_PER_DAY);
}
