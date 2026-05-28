import { getWeatherData, saveWeatherData } from './storage';

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const IP_GEO_URL = 'https://ipapi.co/json/';

async function getApproxLocation() {
  try {
    const res = await fetch(IP_GEO_URL, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.latitude && data.longitude) {
      return { lat: data.latitude, lon: data.longitude, city: data.city || 'your area' };
    }
  } catch {}
  return null;
}

async function fetchPressureHistory(lat, lon) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 32);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = today.toISOString().slice(0, 10);

  const url = `${ARCHIVE_URL}?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&daily=pressure_msl_mean&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  const times = data.daily?.time || [];
  const pressures = data.daily?.pressure_msl_mean || [];
  return times.map((date, i) => ({ date, pressure: pressures[i] })).filter(d => d.pressure !== null);
}

export async function syncWeatherData() {
  try {
    const existing = await getWeatherData();
    const today = new Date().toISOString().slice(0, 10);
    if (existing.length > 0 && existing[existing.length - 1]?.date >= today) return existing;

    const location = await getApproxLocation();
    if (!location) return existing;

    const pressureData = await fetchPressureHistory(location.lat, location.lon);
    if (pressureData.length > 0) {
      await saveWeatherData(pressureData);
      return { data: pressureData, city: location.city };
    }
    return { data: existing, city: null };
  } catch {
    return { data: [], city: null };
  }
}

export function computeWeatherCorrelation(journalEntries, weatherData) {
  if (!weatherData || weatherData.length < 7) return null;

  const pressureMap = {};
  weatherData.forEach(d => { pressureMap[d.date] = d.pressure; });

  const migrainePressures = [];
  const clearPressures = [];

  journalEntries.forEach(entry => {
    const date = new Date(entry.date).toISOString().slice(0, 10);
    const pressure = pressureMap[date];
    if (pressure === undefined || pressure === null) return;
    if (entry.hadMigraine) migrainePressures.push(pressure);
    else clearPressures.push(pressure);
  });

  if (migrainePressures.length < 3) return null;

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const migraineAvg = avg(migrainePressures);
  const clearAvg = clearPressures.length >= 2 ? avg(clearPressures) : null;
  const diff = clearAvg !== null ? (clearAvg - migraineAvg) : 0;

  // Count pressure drops (>=5 hPa day-over-day) that preceded a migraine
  const sorted = [...weatherData].sort((a, b) => a.date.localeCompare(b.date));
  let pressureDropMigraines = 0;
  let pressureDropTotal = 0;
  for (let i = 1; i < sorted.length; i++) {
    const drop = sorted[i - 1].pressure - sorted[i].pressure;
    if (drop >= 5) {
      pressureDropTotal++;
      const entry = journalEntries.find(e => new Date(e.date).toISOString().slice(0, 10) === sorted[i].date);
      if (entry?.hadMigraine) pressureDropMigraines++;
    }
  }

  return {
    migraineAvg: migraineAvg.toFixed(1),
    clearAvg: clearAvg ? clearAvg.toFixed(1) : null,
    diff: diff.toFixed(1),
    pressureDropMigraines,
    pressureDropTotal,
    migraineDaysAnalyzed: migrainePressures.length,
    sensitive: Math.abs(diff) > 2.5 && migrainePressures.length >= 4,
  };
}
