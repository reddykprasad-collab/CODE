import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  HAS_ONBOARDED: '@migraine/hasOnboarded',
  USER_PATH: '@migraine/userPath',
  JOURNAL_ENTRIES: '@migraine/journalEntries',
  REMINDER_CONFIG: '@migraine/reminderConfig',
  STREAK: '@migraine/streak',
};

export async function getHasOnboarded() {
  const val = await AsyncStorage.getItem(KEYS.HAS_ONBOARDED);
  return val === 'true';
}

export async function setHasOnboarded() {
  await AsyncStorage.setItem(KEYS.HAS_ONBOARDED, 'true');
}

export async function getUserPath() {
  return await AsyncStorage.getItem(KEYS.USER_PATH);
}

export async function setUserPath(path) {
  await AsyncStorage.setItem(KEYS.USER_PATH, path);
}

export async function getJournalEntries() {
  const raw = await AsyncStorage.getItem(KEYS.JOURNAL_ENTRIES);
  return raw ? JSON.parse(raw) : [];
}

export async function saveJournalEntry(entry) {
  const entries = await getJournalEntries();
  const newEntries = [entry, ...entries].slice(0, 120);
  await AsyncStorage.setItem(KEYS.JOURNAL_ENTRIES, JSON.stringify(newEntries));
  return newEntries;
}

export async function getReminderConfig() {
  const raw = await AsyncStorage.getItem(KEYS.REMINDER_CONFIG);
  return raw ? JSON.parse(raw) : { frequency: 'daily', timeSlot: 'morning' };
}

export async function saveReminderConfig(config) {
  await AsyncStorage.setItem(KEYS.REMINDER_CONFIG, JSON.stringify(config));
}

export async function getStreak() {
  const raw = await AsyncStorage.getItem(KEYS.STREAK);
  if (!raw) return { count: 0, lastConfirmed: null };
  return JSON.parse(raw);
}

export async function confirmDose() {
  const now = new Date();
  const todayStr = now.toDateString();
  const streak = await getStreak();
  const lastDate = streak.lastConfirmed ? new Date(streak.lastConfirmed).toDateString() : null;

  let newCount = streak.count;
  if (lastDate !== todayStr) {
    const daysSinceLast = streak.lastConfirmed
      ? Math.floor((now - new Date(streak.lastConfirmed)) / (1000 * 60 * 60 * 24))
      : Infinity;
    newCount = daysSinceLast <= 2 ? streak.count + 1 : 1;
  }

  const newStreak = { count: newCount, lastConfirmed: now.toISOString() };
  await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(newStreak));
  return newStreak;
}

export async function clearAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
