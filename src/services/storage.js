import AsyncStorage from '@react-native-async-storage/async-storage';

// MED-4: safe JSON.parse for every AsyncStorage read.
// Returns fallback on null input OR on corrupt JSON — prevents a single bad write
// from permanently disabling a feature.
function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const KEYS = {
  HAS_ONBOARDED: '@migraine/hasOnboarded',
  USER_PATH: '@migraine/userPath',
  JOURNAL_ENTRIES: '@migraine/journalEntries',
  REMINDER_CONFIG: '@migraine/reminderConfig',
  STREAK: '@migraine/streak',
  CHAT_MESSAGES: '@migraine/chatMessages',
  TREATMENT_START_DATE: '@migraine/treatmentStartDate',
  CUSTOM_TRIGGERS: '@migraine/customTriggers',
  ASSESSMENT_RESULT: '@migraine/assessmentResult',
  HCP_ANSWERS: '@migraine/hcpAnswers',
  TREATMENT_STATUS: '@migraine/treatmentStatus',
  MIDAS_SCORES: '@migraine/midasScores',
  WEATHER_DATA: '@migraine/weatherData',
  ORCHESTRATION_STATE: '@migraine/orchestrationState',
  SIDE_EFFECTS: '@migraine/sideEffects',
};

export const DEFAULT_ORCHESTRATION_STATE = {
  journeyPhase: 'awareness',
  activeEvent: null,
  interventionQueue: [],
  suppressionMap: {},    // { [interventionType]: expiryTimestamp } — checked on every read
  lastEvaluatedAt: null,
  earlyUsageBehavior: null,
  version: 1,
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
  return safeParse(raw, []);
}

export async function saveJournalEntry(entry) {
  const entries = await getJournalEntries();
  const entryDay = new Date(entry.date).toDateString();
  const filtered = entries.filter(e => new Date(e.date).toDateString() !== entryDay);
  const newEntries = [entry, ...filtered].slice(0, 730);
  await AsyncStorage.setItem(KEYS.JOURNAL_ENTRIES, JSON.stringify(newEntries));
  return newEntries;
}

export async function getReminderConfig() {
  const raw = await AsyncStorage.getItem(KEYS.REMINDER_CONFIG);
  return safeParse(raw, { frequency: 'daily', timeSlot: 'morning' });
}

export async function saveReminderConfig(config) {
  await AsyncStorage.setItem(KEYS.REMINDER_CONFIG, JSON.stringify(config));
}

export async function getStreak() {
  const raw = await AsyncStorage.getItem(KEYS.STREAK);
  return safeParse(raw, { count: 0, lastConfirmed: null });
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

  const existing = Array.isArray(streak.confirmedDates) ? streak.confirmedDates : [];
  const confirmedDates = existing.includes(todayStr)
    ? existing
    : [...existing, todayStr].slice(-30);

  const newStreak = { count: newCount, lastConfirmed: now.toISOString(), confirmedDates };
  await AsyncStorage.setItem(KEYS.STREAK, JSON.stringify(newStreak));
  return newStreak;
}

export async function getChatMessages() {
  const raw = await AsyncStorage.getItem(KEYS.CHAT_MESSAGES);
  return safeParse(raw, null);
}

export async function saveChatMessages(messages) {
  await AsyncStorage.setItem(KEYS.CHAT_MESSAGES, JSON.stringify(messages.slice(-100)));
}

export async function getTreatmentStartDate() {
  return await AsyncStorage.getItem(KEYS.TREATMENT_START_DATE);
}

export async function setTreatmentStartDate(isoString) {
  await AsyncStorage.setItem(KEYS.TREATMENT_START_DATE, isoString);
}

export async function deleteJournalEntry(id) {
  const entries = await getJournalEntries();
  const filtered = entries.filter(e => e.id !== id);
  await AsyncStorage.setItem(KEYS.JOURNAL_ENTRIES, JSON.stringify(filtered));
  return filtered;
}

export async function hasSeenCoachmark(name) {
  const val = await AsyncStorage.getItem(`@migraine/coachmark_${name}`);
  return val === 'true';
}

export async function markCoachmarkSeen(name) {
  await AsyncStorage.setItem(`@migraine/coachmark_${name}`, 'true');
}

export async function getCustomTriggers() {
  const raw = await AsyncStorage.getItem(KEYS.CUSTOM_TRIGGERS);
  return safeParse(raw, []);
}

export async function saveCustomTrigger(trigger) {
  const existing = await getCustomTriggers();
  if (existing.includes(trigger)) return existing;
  const updated = [...existing, trigger];
  await AsyncStorage.setItem(KEYS.CUSTOM_TRIGGERS, JSON.stringify(updated));
  return updated;
}

export async function getAssessmentResult() {
  const raw = await AsyncStorage.getItem(KEYS.ASSESSMENT_RESULT);
  return safeParse(raw, null);
}

export async function saveAssessmentResult(result) {
  const payload = { ...result, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEYS.ASSESSMENT_RESULT, JSON.stringify(payload));
  return payload;
}

export async function getHCPAnswers() {
  const raw = await AsyncStorage.getItem(KEYS.HCP_ANSWERS);
  return safeParse(raw, null);
}

export async function saveHCPAnswers(answers) {
  const payload = { answers, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEYS.HCP_ANSWERS, JSON.stringify(payload));
}

export async function clearAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export async function getTreatmentStatus() {
  const raw = await AsyncStorage.getItem(KEYS.TREATMENT_STATUS);
  return safeParse(raw, { paStatus: 'not_submitted', paExpiryDate: null, refillDate: null });
}

export async function saveTreatmentStatus(status) {
  await AsyncStorage.setItem(KEYS.TREATMENT_STATUS, JSON.stringify(status));
}

export async function getMidasScores() {
  const raw = await AsyncStorage.getItem(KEYS.MIDAS_SCORES);
  return safeParse(raw, []);
}

export async function saveMidasScore(score) {
  const existing = await getMidasScores();
  const updated = [score, ...existing].slice(0, 24);
  await AsyncStorage.setItem(KEYS.MIDAS_SCORES, JSON.stringify(updated));
  return updated;
}

export async function getWeatherData() {
  const raw = await AsyncStorage.getItem(KEYS.WEATHER_DATA);
  return safeParse(raw, []);
}

export async function saveWeatherData(entries) {
  await AsyncStorage.setItem(KEYS.WEATHER_DATA, JSON.stringify(entries));
}

export async function getOrchestrationState() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ORCHESTRATION_STATE);
    if (!raw) return { ...DEFAULT_ORCHESTRATION_STATE };
    const parsed = JSON.parse(raw);
    // Prune suppression entries whose expiry timestamp has passed
    const now = Date.now();
    const suppressionMap = Object.fromEntries(
      Object.entries(parsed.suppressionMap || {}).filter(([, expiry]) => now < expiry)
    );
    return { ...DEFAULT_ORCHESTRATION_STATE, ...parsed, suppressionMap };
  } catch {
    return { ...DEFAULT_ORCHESTRATION_STATE };
  }
}

// MED-3: allowlist of valid intervention types. Unknown types are stripped before
// persisting so a crafted AsyncStorage write cannot inject a P0 suppressor.
const VALID_INTERVENTION_TYPES = new Set([
  'escalation_safety', 'pa_denial_support', 'access_blocked_support',
  'positive_reinforcement', 'hcp_prep_prompt', 'expectation_reset',
  'diary_prompt', 'first_dose_coaching', 'refill_nudge', 'guidance_unavailable',
]);

export async function getSideEffects() {
  const raw = await AsyncStorage.getItem(KEYS.SIDE_EFFECTS);
  return safeParse(raw, []);
}

export async function saveSideEffect(entry) {
  // entry shape: { id, date, symptoms: string[], note: string }
  const existing = await getSideEffects();
  const dayStr = new Date(entry.date).toDateString();
  // One entry per day, same as journal
  const filtered = existing.filter(e => new Date(e.date).toDateString() !== dayStr);
  const updated = [entry, ...filtered].slice(0, 365);
  await AsyncStorage.setItem(KEYS.SIDE_EFFECTS, JSON.stringify(updated));
  return updated;
}

export async function saveOrchestrationState(state) {
  // Enforce max queue depth and type allowlist
  const queue = (state.interventionQueue || [])
    .filter(i => VALID_INTERVENTION_TYPES.has(i.type))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
  await AsyncStorage.setItem(
    KEYS.ORCHESTRATION_STATE,
    JSON.stringify({ ...state, interventionQueue: queue })
  );
}
