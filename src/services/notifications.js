import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  if (!Device.isDevice) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const TIME_SLOTS = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

export async function scheduleReminder(config) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestPermissions();
  if (!granted) return false;

  const slotDefault = TIME_SLOTS[config.timeSlot] || TIME_SLOTS.morning;
  const hour = config.customHour !== undefined ? config.customHour : slotDefault.hour;
  const minute = config.customMinute !== undefined ? config.customMinute : slotDefault.minute;

  if (config.frequency === 'daily') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Migraine Companion',
        body: 'Time for your medication. Tap to confirm.',
        data: { type: 'dose_reminder' },
      },
      trigger: { type: 'daily', hour, minute },
    });
  } else if (config.frequency === 'monthly') {
    // Schedule 12 monthly occurrences (one per month for a year)
    const base = new Date();
    for (let i = 1; i <= 12; i++) {
      const fireDate = new Date(base);
      fireDate.setMonth(fireDate.getMonth() + i);
      fireDate.setHours(hour, minute, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Migraine Companion',
          body: 'Your monthly medication may be due. Tap to confirm.',
          data: { type: 'dose_reminder' },
        },
        trigger: fireDate,
      });
    }
  } else {
    // every-other-day: schedule 30 explicit occurrences (60 days ahead)
    const base = new Date();
    for (let i = 1; i <= 30; i++) {
      const fireDate = new Date(base);
      fireDate.setDate(fireDate.getDate() + i * 2);
      fireDate.setHours(hour, minute, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Migraine Companion',
          body: 'Time for your medication. Tap to confirm.',
          data: { type: 'dose_reminder' },
        },
        trigger: fireDate,
      });
    }
  }

  return true;
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Non-revealing copy for each intervention type.
// No health details are shown on the lock screen.
const ORCHESTRATION_COPY = {
  escalation_safety: {
    title: 'Migraine Companion',
    body: 'There is something important in the app for you.',
  },
  pa_denial_support: {
    title: 'Migraine Companion',
    body: 'There is an update in the app worth reviewing.',
  },
  positive_reinforcement: {
    title: 'Migraine Companion',
    body: 'Something worth checking in the app today.',
  },
  hcp_prep_prompt: {
    title: 'Migraine Companion',
    body: 'A reminder in the app may be helpful before your next visit.',
  },
  diary_prompt: {
    title: 'Migraine Companion',
    body: 'A quick check-in is ready for you in the app.',
  },
  first_dose_coaching: {
    title: 'Migraine Companion',
    body: 'There is a note in the app worth a moment of your time.',
  },
  refill_nudge: {
    title: 'Migraine Companion',
    body: 'A heads-up is waiting for you in the app.',
  },
};

export async function scheduleOrchestrationNotification(intervention) {
  const granted = await requestPermissions();
  if (!granted) return;

  const copy = ORCHESTRATION_COPY[intervention.type];
  if (!copy) return;

  // Fire in 60 seconds so the user has time to navigate to the app naturally.
  const fireDate = new Date(Date.now() + 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      data: { type: 'orchestration', interventionType: intervention.type },
    },
    trigger: fireDate,
  });
}

export function useNotificationListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
