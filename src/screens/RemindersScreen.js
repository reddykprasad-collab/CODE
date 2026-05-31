import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { scheduleReminder, cancelAllReminders } from '../services/notifications';
import { saveReminderConfig, getReminderConfig } from '../services/storage';
import { colors, fonts, spacing, radius, textSize } from '../theme';

const FREQUENCIES = [
  { value: 'daily',           icon: 'sun',       label: 'Daily',           desc: 'Once every day at the same time' },
  { value: 'every-other-day', icon: 'calendar',  label: 'Every other day', desc: 'Alternating days' },
  { value: 'monthly',         icon: 'activity',  label: 'Monthly',         desc: 'Injectable or infusion' },
];

const TIME_SLOTS = [
  { value: 'morning', icon: 'sunrise', label: 'Morning', sub: '7–9 AM' },
  { value: 'midday',  icon: 'sun',     label: 'Midday',  sub: '11 AM–1 PM' },
  { value: 'evening', icon: 'moon',    label: 'Evening', sub: '7–9 PM' },
];

const SLOT_LABELS = { morning: '8:00 AM', midday: '12:00 PM', evening: '8:00 PM' };

function formatTime12h(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${period}`;
}

export default function RemindersScreen() {
  const [frequency, setFrequency] = useState('daily');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedConfig, setSavedConfig] = useState(null);
  const [customTime, setCustomTime] = useState(null);
  const [editingCustomTime, setEditingCustomTime] = useState(false);
  const [customTimeDraft, setCustomTimeDraft] = useState({ hour12: 8, minute: 0, period: 'AM' });

  const hasChanges = !savedConfig
    || savedConfig.frequency !== frequency
    || savedConfig.timeSlot !== timeSlot
    || (savedConfig.customHour !== undefined) !== (customTime !== null)
    || savedConfig.customHour !== customTime?.hour
    || savedConfig.customMinute !== customTime?.minute;

  const displayTime = customTime
    ? formatTime12h(customTime.hour, customTime.minute)
    : SLOT_LABELS[timeSlot];

  useFocusEffect(
    useCallback(() => {
      getReminderConfig().then(config => {
        if (config && config.frequency) {
          const freq = config.frequency || 'daily';
          const slot = config.timeSlot || 'morning';
          setFrequency(freq);
          setTimeSlot(slot);
          if (config.customHour !== undefined) {
            setCustomTime({ hour: config.customHour, minute: config.customMinute });
          }
          setSavedConfig(config);
          setSaved(true);
        }
      });
    }, [])
  );

  function openTimePicker() {
    const draft = customTime
      ? { hour12: customTime.hour % 12 || 12, minute: customTime.minute, period: customTime.hour >= 12 ? 'PM' : 'AM' }
      : { hour12: 8, minute: 0, period: 'AM' };
    setCustomTimeDraft(draft);
    setEditingCustomTime(true);
  }

  function adjustHour12(delta) {
    setCustomTimeDraft(prev => {
      let h = prev.hour12 + delta;
      if (h > 12) h = 1;
      if (h < 1) h = 12;
      return { ...prev, hour12: h };
    });
  }

  function adjustMinute(delta) {
    setCustomTimeDraft(prev => {
      let m = prev.minute + delta * 5;
      if (m >= 60) m = 0;
      if (m < 0) m = 55;
      return { ...prev, minute: m };
    });
  }

  function setPeriodAM() {
    setCustomTimeDraft(prev => ({ ...prev, period: 'AM' }));
  }

  function setPeriodPM() {
    setCustomTimeDraft(prev => ({ ...prev, period: 'PM' }));
  }

  function saveCustomTimeDraft() {
    const { hour12, minute, period } = customTimeDraft;
    const hour = period === 'PM' ? (hour12 % 12) + 12 : hour12 % 12;
    setCustomTime({ hour, minute });
    setEditingCustomTime(false);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const config = {
      frequency,
      timeSlot,
      ...(customTime ? { customHour: customTime.hour, customMinute: customTime.minute } : {}),
    };
    await saveReminderConfig(config);
    const success = await scheduleReminder(config);
    setSaving(false);
    if (success) {
      setSaved(true);
      setSavedConfig(config);
      Alert.alert(
        'Reminders set',
        `You'll be reminded at ${displayTime} (${FREQUENCIES.find(f => f.value === frequency)?.label.toLowerCase()}).`
      );
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
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: async () => {
          await cancelAllReminders();
          await saveReminderConfig({ frequency: null, timeSlot: null });
          setSavedConfig(null);
          setSaved(false);
          Alert.alert('Reminders turned off');
        },
      },
    ]);
  }

  const activeFreq = FREQUENCIES.find(f => f.value === frequency);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Reminders</Text>
        <Text style={styles.subtitle}>Choose what fits your treatment schedule.</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* Active state summary */}
        {saved && (
          <View style={styles.activeCard}>
            <View style={styles.activeIconWrap}>
              <Feather name="check-circle" size={18} color={colors.sage} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Reminders active</Text>
              <Text style={styles.activeSub}>{displayTime} · {activeFreq?.label}</Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.activeOffBtn}>
              <Text style={styles.activeOffTxt}>Turn off</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>How often do you dose?</Text>
        <View style={styles.freqList}>
          {FREQUENCIES.map(f => {
            const selected = frequency === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.freqRow, selected && styles.freqRowSel]}
                onPress={() => { setFrequency(f.value); setSaved(false); }}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${f.label}: ${f.desc}`}
              >
                <View style={[styles.freqIconWrap, selected && styles.freqIconWrapSel]}>
                  <Feather name={f.icon} size={17} color={selected ? colors.white : colors.slateLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.freqName, selected && { color: colors.lav }]}>{f.label}</Text>
                  <Text style={styles.freqDesc}>{f.desc}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSel]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>What time?</Text>
        <View style={styles.timeRow}>
          {TIME_SLOTS.map(t => {
            const selected = timeSlot === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.timeCard, selected && styles.timeCardSel]}
                onPress={() => { setTimeSlot(t.value); setSaved(false); }}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${t.label}, ${t.sub}`}
              >
                <View style={[styles.timeIconWrap, selected && styles.timeIconWrapSel]}>
                  <Feather name={t.icon} size={18} color={selected ? colors.white : colors.slateLight} />
                </View>
                <Text style={[styles.timeLabel, selected && { color: colors.lav }]}>{t.label}</Text>
                <Text style={styles.timeSub}>{t.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom time */}
        <TouchableOpacity
          style={styles.customTimeRow}
          onPress={() => editingCustomTime ? setEditingCustomTime(false) : openTimePicker()}
          accessibilityRole="button"
          accessibilityLabel={customTime ? `Custom time set to ${displayTime}. Tap to edit.` : 'Set a specific reminder time'}
        >
          <Feather name="clock" size={15} color={colors.lav} />
          <Text style={styles.customTimeTxt}>
            {customTime ? `Custom time: ${displayTime}` : 'Set a specific time instead'}
          </Text>
          <Feather name={editingCustomTime ? 'chevron-up' : (customTime ? 'edit-2' : 'chevron-down')} size={14} color={colors.lav} />
        </TouchableOpacity>

        {editingCustomTime && (
          <View style={styles.timePickerCard}>
            <View style={styles.timePicker}>
              <View style={styles.timeCol}>
                <TouchableOpacity onPress={() => adjustHour12(1)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="chevron-up" size={20} color={colors.lav} />
                </TouchableOpacity>
                <Text style={styles.timeVal}>{String(customTimeDraft.hour12).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustHour12(-1)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="chevron-down" size={20} color={colors.lav} />
                </TouchableOpacity>
              </View>
              <Text style={styles.timeSep}>:</Text>
              <View style={styles.timeCol}>
                <TouchableOpacity onPress={() => adjustMinute(1)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="chevron-up" size={20} color={colors.lav} />
                </TouchableOpacity>
                <Text style={styles.timeVal}>{String(customTimeDraft.minute).padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustMinute(-1)} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="chevron-down" size={20} color={colors.lav} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeCol}>
                <TouchableOpacity onPress={setPeriodPM} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="chevron-up" size={20} color={colors.lav} />
                </TouchableOpacity>
                <Text style={styles.timeVal}>{customTimeDraft.period}</Text>
                <TouchableOpacity onPress={setPeriodAM} style={styles.timeArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="chevron-down" size={20} color={colors.lav} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.setTimeBtn} onPress={saveCustomTimeDraft} activeOpacity={0.88}>
              <Text style={styles.setTimeTxt}>Save time</Text>
            </TouchableOpacity>
            {customTime && (
              <TouchableOpacity style={styles.clearTimeBtn} onPress={() => { setCustomTime(null); setEditingCustomTime(false); setSaved(false); }} activeOpacity={0.85}>
                <Text style={styles.clearTimeTxt}>Clear custom time</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Notification preview */}
        <Text style={styles.sectionLabel}>Preview</Text>
        <View style={styles.previewCard}>
          <Text style={styles.previewMeta}>How it will appear on your phone</Text>
          <View style={styles.previewNotif}>
            <View style={styles.previewAppIcon}>
              <Feather name="activity" size={16} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewAppName}>Migraine Companion</Text>
              <Text style={styles.previewBody}>Time for your medication. Tap to confirm.</Text>
            </View>
            <Text style={styles.previewTime}>now</Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || saving) && { opacity: 0.35 }]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          activeOpacity={0.88}
        >
          <Text style={styles.saveBtnTxt}>{saving ? 'Saving…' : 'Save reminders'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: textSize.displayMd, color: colors.slate },
  subtitle: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, marginTop: 4 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },

  // Active state
  activeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.sagePale, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: radius.lg, padding: 14, marginBottom: spacing.sm,
  },
  activeIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.sagePale, borderWidth: 1, borderColor: colors.sageBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  activeTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.caption, color: colors.sageDark },
  activeSub: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateMid, marginTop: 1 },
  activeOffBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  activeOffTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.terraDark },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateLight,
    marginBottom: 10, marginTop: 20,
  },

  // Frequency list
  freqList: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  freqRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  freqRowSel: { backgroundColor: colors.lavPale },
  freqIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.creamMid,
    alignItems: 'center', justifyContent: 'center',
  },
  freqIconWrapSel: { backgroundColor: colors.lav },
  freqName: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate },
  freqDesc: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateLight, marginTop: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSel: { borderColor: colors.lav },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lav },

  // Time slots
  timeRow: { flexDirection: 'row', gap: 10 },
  timeCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, alignItems: 'center', gap: 6,
  },
  timeCardSel: { backgroundColor: colors.lavPale, borderColor: colors.lavLight },
  timeIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.creamMid,
    alignItems: 'center', justifyContent: 'center',
  },
  timeIconWrapSel: { backgroundColor: colors.lav },
  timeLabel: { fontFamily: fonts.bodyMedium, fontSize: textSize.caption, color: colors.slate },
  timeSub: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight },
  customTimeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: colors.lavPale, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.lavLight, marginTop: 10,
  },
  customTimeTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.lav, flex: 1 },
  timePickerCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: spacing.md,
    borderWidth: 1.5, borderColor: colors.lavLight, marginTop: 8,
  },
  timePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
  timeCol: { alignItems: 'center', gap: 4, minWidth: 56 },
  timeArrow: { padding: 4 },
  timeVal: { fontFamily: fonts.display, fontSize: textSize.displayMd, color: colors.slate, minWidth: 56, textAlign: 'center' },
  timeSep: { fontFamily: fonts.display, fontSize: textSize.displayMd, color: colors.slate, marginBottom: 8 },
  setTimeBtn: { backgroundColor: colors.lav, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  setTimeTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  clearTimeBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  clearTimeTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.terraDark },

  // Preview
  previewCard: {
    backgroundColor: colors.slate, borderRadius: radius.lg, padding: 16,
  },
  previewMeta: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.fine,
    color: 'rgba(255,255,255,0.5)', marginBottom: 12,
  },
  previewNotif: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  previewAppIcon: {
    width: 36, height: 36, borderRadius: 9, backgroundColor: colors.lav,
    alignItems: 'center', justifyContent: 'center',
  },
  previewAppName: { fontFamily: fonts.bodyMedium, fontSize: textSize.caption, color: colors.white, marginBottom: 2 },
  previewBody: { fontFamily: fonts.body, fontSize: textSize.caption, color: 'rgba(255,255,255,0.75)' },
  previewTime: { fontFamily: fonts.body, fontSize: textSize.label, color: 'rgba(255,255,255,0.5)' },

  // Footer
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm },
  saveBtn: { backgroundColor: colors.lav, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center' },
  saveBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
});
