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

const FREQUENCY_LABELS = {
  daily: 'day',
  'every-other-day': 'twoDay',
  monthly: 'month',
};

export async function scheduleReminder(config) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestPermissions();
  if (!granted) return false;

  const { hour, minute } = TIME_SLOTS[config.timeSlot] || TIME_SLOTS.morning;

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
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Migraine Companion',
        body: 'Your monthly medication may be due. Tap to confirm.',
        data: { type: 'dose_reminder' },
      },
      trigger: { type: 'timeInterval', seconds: 30 * 24 * 60 * 60, repeats: true },
    });
  } else {
    // every-other-day: schedule weekly on alternating days as an approximation
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Migraine Companion',
        body: 'Time for your medication. Tap to confirm.',
        data: { type: 'dose_reminder' },
      },
      trigger: { type: 'weekly', weekday: 2, hour, minute },
    });
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Migraine Companion',
        body: 'Time for your medication. Tap to confirm.',
        data: { type: 'dose_reminder' },
      },
      trigger: { type: 'weekly', weekday: 4, hour, minute },
    });
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Migraine Companion',
        body: 'Time for your medication. Tap to confirm.',
        data: { type: 'dose_reminder' },
      },
      trigger: { type: 'weekly', weekday: 6, hour, minute },
    });
  }

  return true;
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function useNotificationListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
