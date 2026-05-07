import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, Alert, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { scheduleReminder, cancelAllReminders } from '../services/notifications';
import { saveReminderConfig, getReminderConfig } from '../services/storage';
import { colors, fonts, spacing, radius } from '../theme';

const FREQUENCIES = [
  { value: 'daily', icon: '☀️', label: 'Daily', desc: 'Once every day at the same time' },
  { value: 'every-other-day', icon: '📆', label: 'Every other day', desc: 'Alternating days' },
  { value: 'monthly', icon: '💉', label: 'Monthly', desc: 'Injectable or infusion' },
];

const TIME_SLOTS = [
  { value: 'morning', icon: '🌅', label: 'Morning', sub: '7–9 AM' },
  { value: 'midday', icon: '☀️', label: 'Midday', sub: '11AM–1PM' },
  { value: 'evening', icon: '🌙', label: 'Evening', sub: '7–9 PM' },
];

const SLOT_LABELS = { morning: '8:00 AM', midday: '12:00 PM', evening: '8:00 PM' };

export default function RemindersScreen() {
  const [frequency, setFrequency] = useState('daily');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getReminderConfig().then(config => {
        if (config) {
          setFrequency(config.frequency || 'daily');
          setTimeSlot(config.timeSlot || 'morning');
        }
      });
    }, [])
  );

  async function handleSave() {
    setSaving(true);
    const config = { frequency, timeSlot };
    await saveReminderConfig(config);
    const success = await scheduleReminder(config);
    setSaving(false);
    if (success) {
      setSaved(true);
      Alert.alert('Reminders set ✓', `You will be reminded at ${SLOT_LABELS[timeSlot]} (${FREQUENCIES.find(f => f.value === frequency)?.label.toLowerCase()}).`);
    } else {
      Alert.alert(
        'Permission required',
        'Migraine Companion needs notification permission to send reminders. Open Settings, tap Notifications, and enable them for this app.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }

  async function handleCancel() {
    Alert.alert('Turn off reminders?', 'This will cancel all scheduled notifications.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: async () => {
          await cancelAllReminders();
          await saveReminderConfig({ frequency: null, timeSlot: null });
          setSaved(false);
          Alert.alert('Reminders turned off');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Set up reminders</Text>
        <Text style={styles.subtitle}>Choose what fits your treatment schedule.</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>How often do you dose?</Text>
        <View style={styles.freqOptions}>
          {FREQUENCIES.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[styles.freqOpt, frequency === f.value && styles.freqOptSel]}
              onPress={() => { setFrequency(f.value); setSaved(false); }}
              activeOpacity={0.85}
            >
              <View style={styles.freqLeft}>
                <View style={[styles.freqIcon, frequency === f.value && styles.freqIconSel]}>
                  <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                </View>
                <View>
                  <Text style={styles.freqName}>{f.label}</Text>
                  <Text style={styles.freqDesc}>{f.desc}</Text>
                </View>
              </View>
              <View style={[styles.freqCheck, frequency === f.value && styles.freqCheckSel]}>
                {frequency === f.value && <Text style={{ color: 'white', fontSize: 16 }}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>When would you like to be reminded?</Text>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.timeOpt, timeSlot === t.value && styles.timeOptSel]}
              onPress={() => { setTimeSlot(t.value); setSaved(false); }}
              activeOpacity={0.85}
            >
              <Text style={styles.timeIcon}>{t.icon}</Text>
              <Text style={styles.timeLabel}>{t.label}</Text>
              <Text style={styles.timeSub}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Preview</Text>
        <View style={styles.previewCard}>
          <Text style={styles.previewLbl}>How it will look on your phone</Text>
          <View style={styles.previewNotif}>
            <View style={styles.previewIcon}>
              <Text style={{ fontSize: 18 }}>💊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewName}>Migraine Companion</Text>
              <Text style={styles.previewBody}>Time for your medication. Tap to confirm.</Text>
            </View>
            <Text style={styles.previewTime}>now</Text>
          </View>
        </View>

        {saved && (
          <View style={styles.savedBadge}>
            <Text style={styles.savedText}>✓ Reminders active: {SLOT_LABELS[timeSlot]}, {FREQUENCIES.find(f => f.value === frequency)?.label.toLowerCase()}</Text>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save reminders'}</Text>
        </TouchableOpacity>
        {saved && (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Turn off reminders</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.slate, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.5,
    textTransform: 'uppercase', color: colors.slateLight, marginBottom: 10, marginTop: 4,
  },
  freqOptions: { gap: 10, marginBottom: spacing.lg },
  freqOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderWidth: 1.5, borderColor: colors.border, borderRadius: 16, backgroundColor: 'white',
  },
  freqOptSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  freqLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  freqIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.creamMid,
    alignItems: 'center', justifyContent: 'center',
  },
  freqIconSel: { backgroundColor: 'rgba(142,125,196,0.15)' },
  freqName: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate },
  freqDesc: { fontFamily: fonts.body, fontSize: 16, color: colors.slateLight, marginTop: 2 },
  freqCheck: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  freqCheckSel: { borderColor: colors.lav, backgroundColor: colors.lav },
  timeGrid: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  timeOpt: {
    flex: 1, padding: 14, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, alignItems: 'center', backgroundColor: 'white',
  },
  timeOptSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  timeIcon: { fontSize: 22, marginBottom: 6 },
  timeLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate },
  timeSub: { fontFamily: fonts.body, fontSize: 14, color: colors.slateLight, marginTop: 2 },
  previewCard: { backgroundColor: colors.slate, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg },
  previewLbl: {
    fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10,
  },
  previewNotif: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  previewIcon: {
    width: 36, height: 36, backgroundColor: colors.lav, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  previewName: { fontFamily: fonts.bodyMedium, fontSize: 17, color: 'white', marginBottom: 2 },
  previewBody: { fontFamily: fonts.body, fontSize: 16, color: 'rgba(255,255,255,0.58)' },
  previewTime: { fontFamily: fonts.body, fontSize: 17, color: 'rgba(255,255,255,0.35)' },
  savedBadge: {
    backgroundColor: colors.sagePale, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: 12, padding: 12, marginBottom: spacing.sm,
  },
  savedText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.sage, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm, gap: 8 },
  saveBtn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: 'white' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontFamily: fonts.body, fontSize: 16, color: colors.terra },
});
