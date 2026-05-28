import React, { useState, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import {
  getStreak, confirmDose, getJournalEntries, saveJournalEntry,
  getTreatmentStartDate, setTreatmentStartDate, getReminderConfig,
  hasSeenCoachmark, markCoachmarkSeen, getTreatmentStatus, saveTreatmentStatus,
  getWeatherData,
} from '../services/storage';
import { syncWeatherData } from '../services/weather';
import { predictMigraineRisk } from '../services/prediction';
import { colors, fonts, spacing, radius, textSize, shadows } from '../theme';
import EducationInsightCard from '../components/EducationInsightCard';
import TreatmentDateCard from '../components/TreatmentDateCard';
import TreatmentStatusSection from '../components/TreatmentStatusSection';
import InterventionBanner from '../components/InterventionBanner';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';

function deriveInsight(entries) {
  if (entries.length < 3) return null;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthEntries = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);

  const triggerCounts = {};
  monthEntries.forEach(e => (e.triggers || []).forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; }));
  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];
  const migraineDays = new Set(
    monthEntries.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())
  ).size;

  if (topTrigger?.[0] === 'Stress' && topTrigger[1] >= 2) return { articleId: 'stress-triggers', context: `Stress appears in ${topTrigger[1]} of your recent entries` };
  if (topTrigger?.[0] === 'Poor sleep' && topTrigger[1] >= 2) return { articleId: 'sleep-migraines', context: `Poor sleep appears in ${topTrigger[1]} of your recent entries` };
  if (migraineDays >= 4) return { articleId: 'undertreated', context: `${migraineDays} migraine days logged in the last 30 days` };
  if (monthEntries.length >= 5) return { articleId: 'cgrp-education', context: 'Based on your tracking history' };
  return null;
}

async function cancelNotificationsOfType(type) {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(n => n.content.data?.type === type);
    await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  } catch {}
}

const COACH_STEPS = [
  { icon: 'check-circle', title: 'Confirm your dose here', body: 'Tap when you take your dose to build your streak.' },
  { icon: 'edit-3', title: 'Log how today went', body: 'A quick tap keeps your pattern data accurate — even "no migraine" matters.' },
  { icon: 'trending-up', title: 'Your entries power everything', body: 'Trends, HCP summaries, and risk predictions run on your logs.' },
];

export default function AdherenceHomeScreen({ navigation }) {
  const [streak, setStreak]                         = useState({ count: 0, lastConfirmed: null });
  const [doseConfirmedToday, setDoseConfirmedToday] = useState(false);
  const [treatmentStart, setTreatmentStart]         = useState(null);
  const [reminderFrequency, setReminderFrequency]   = useState(null);
  const [weekSummary, setWeekSummary]               = useState(null);
  const [educationInsight, setEducationInsight]     = useState(null);
  const [prediction, setPrediction]                 = useState(undefined); // undefined = loading, null = no data
  const [quickLoggedToday, setQuickLoggedToday]     = useState(false);
  const [quickMigraine, setQuickMigraine]           = useState(null);
  const [quickSeverity, setQuickSeverity]           = useState(5);
  const [quickSaving, setQuickSaving]               = useState(false);
  const [quickError, setQuickError]                 = useState(false);
  const [showCoach, setShowCoach]                   = useState(false);
  const [coachStep, setCoachStep]                   = useState(0);
  const [confirmingDose, setConfirmingDose]         = useState(false);
  const [treatmentStatus, setTreatmentStatus]       = useState({ paStatus: 'not_submitted', paExpiryDate: null, refillDate: null });

  const now     = new Date();
  const hour    = now.getHours();
  const today   = now.toDateString();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { emitEvent } = useOrchestration();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [s, startDate, config, txStatus, cachedWeather] = await Promise.all([
          getStreak(), getTreatmentStartDate(), getReminderConfig(), getTreatmentStatus(), getWeatherData(),
        ]);
        setStreak(s);
        setTreatmentStart(startDate);
        setReminderFrequency(config?.frequency ?? null);
        setTreatmentStatus(txStatus);
        setDoseConfirmedToday(s.lastConfirmed ? new Date(s.lastConfirmed).toDateString() === today : false);

        const entries = await getJournalEntries();
        const todayStr = new Date().toDateString();
        setQuickLoggedToday(entries.some(e => new Date(e.date).toDateString() === todayStr));
        setPrediction(predictMigraineRisk(entries, cachedWeather));

        // Refresh weather in background — prediction updates when fresh data arrives
        syncWeatherData().then(result => {
          if (result?.data?.length > 0) setPrediction(predictMigraineRisk(entries, result.data));
        }).catch(() => {});

        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
        const migraineCount = new Set(weekEntries.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())).size;
        const totalDays = new Set(weekEntries.map(e => new Date(e.date).toDateString())).size;
        setWeekSummary({ count: migraineCount, total: totalDays });
        setEducationInsight(deriveInsight(entries));

        const seen = await hasSeenCoachmark('adherence');
        if (!seen) setShowCoach(true);

        // Emit app_opened for diary-gap rule
        const lastEntry = entries[0];
        const daysSinceLast = lastEntry
          ? Math.floor((Date.now() - new Date(lastEntry.date).getTime()) / 86400000)
          : 999;
        emitEvent(EVENTS.APP_OPENED, { daysSinceLast });
      })();
    }, [])
  );

  async function dismissCoach() {
    setShowCoach(false);
    await markCoachmarkSeen('adherence');
  }

  async function handleStatusUpdate(patch) {
    const updated = { ...treatmentStatus, ...patch };
    setTreatmentStatus(updated);
    await saveTreatmentStatus(updated);

    if (patch.paStatus !== undefined && patch.paStatus !== treatmentStatus.paStatus) {
      emitEvent(EVENTS.PA_STATUS_CHANGED, { status: patch.paStatus });
    }

    if (patch.paExpiryDate) {
      await cancelNotificationsOfType('pa_expiry');
      const alertDate = new Date(patch.paExpiryDate);
      alertDate.setDate(alertDate.getDate() - 14);
      if (alertDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Migraine Companion', body: 'Your prior authorization expires in 14 days. Contact your insurer to renew.', data: { type: 'pa_expiry' } },
          trigger: alertDate,
        }).catch(() => {});
      }
    }
    if (patch.refillDate) {
      await cancelNotificationsOfType('refill');
      const alertDate = new Date(patch.refillDate);
      alertDate.setDate(alertDate.getDate() - 7);
      if (alertDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Migraine Companion', body: 'Your prescription refill is due in 7 days.', data: { type: 'refill' } },
          trigger: alertDate,
        }).catch(() => {});
      }
    }
  }

  function buildWeekStrip() {
    const confirmedSet = new Set(streak.confirmedDates || []);
    const startMs = treatmentStart ? new Date(treatmentStart).setHours(0, 0, 0, 0) : null;

    return Array.from({ length: 7 }, (_, idx) => {
      const i = 6 - idx;
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const isToday = i === 0;
      const confirmed = confirmedSet.has(d.toDateString());

      let missed = false;
      if (!isToday && startMs !== null && d.getTime() >= startMs) {
        if (reminderFrequency === 'monthly') {
          missed = false;
        } else if (reminderFrequency === 'every-other-day') {
          const daysSinceStart = Math.floor((d.getTime() - startMs) / 86400000);
          missed = daysSinceStart % 2 === 0 && !confirmed;
        } else {
          missed = !confirmed;
        }
      }

      return { label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), confirmed, isToday, missed };
    });
  }

  async function handleQuickSave() {
    if (quickMigraine === null || quickSaving) return;
    setQuickSaving(true);
    setQuickError(false);
    try {
      await saveJournalEntry({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        hadMigraine: quickMigraine,
        severity: quickMigraine ? quickSeverity : null,
        treatments: '',
        functionalImpact: [],
        triggers: [],
      });
      setQuickLoggedToday(true);
    } catch {
      setQuickError(true);
    } finally {
      setQuickSaving(false);
    }
  }

  const MILESTONES = [7, 14, 30, 60, 90];

  async function handleConfirm() {
    setConfirmingDose(true);
    try {
      const s = await confirmDose();
      setStreak(s);
      setDoseConfirmedToday(true);
      emitEvent(EVENTS.DOSE_CONFIRMED, { streak: s.count });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (MILESTONES.includes(s.count)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        Alert.alert(
          `${s.count}-day streak`,
          s.count < 30
            ? 'Consistency this early matters more than you might think. Keep going.'
            : s.count < 90
            ? 'Preventive therapy takes 3–6 months to show its full effect. You\'re building real data.'
            : 'Three months of consistent dosing. That\'s significant — bring your journal to your next appointment.',
          [{ text: 'Got it' }]
        );
      }
    } finally {
      setConfirmingDose(false);
    }
  }

  const weekDays = useMemo(() => buildWeekStrip(), [streak, treatmentStart, reminderFrequency]);
  const confirmedCount = weekDays.filter(d => d.confirmed).length;

  // MOH warning state — loaded once on mount and stored for render
  const [mohDays, setMohDays] = useState(0);
  useFocusEffect(useCallback(() => {
    getJournalEntries().then(entries => {
      const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
      const recent = entries.filter(e => new Date(e.date) >= thirtyAgo);
      const days = new Set();
      recent.forEach(e => {
        const hasActive = e.acuteTreatments?.length > 0 && !e.acuteTreatments.every(t => t === 'Nothing');
        const hasLegacy = e.treatments && e.treatments.trim().length > 0;
        if (hasActive || hasLegacy) days.add(new Date(e.date).toDateString());
      });
      setMohDays(days.size);
    });
  }, []));

  const ACTIONS = [
    { label: 'Log today',     icon: 'edit-3',         onPress: () => navigation.navigate('Journal'),   bg: colors.sagePale,  iconColor: colors.sage,     border: colors.sageBorder },
    { label: 'Ask companion', icon: 'message-circle',  onPress: () => navigation.navigate('Chat'),      bg: colors.lavPale,   iconColor: colors.lav,      border: colors.lavLight },
    { label: 'My trends',     icon: 'trending-up',     onPress: () => navigation.navigate('Trends'),    bg: colors.white,     iconColor: colors.slateMid, border: colors.border },
    { label: 'Reminders',     icon: 'bell',            onPress: () => navigation.navigate('Reminders'), bg: colors.white,     iconColor: colors.slateMid, border: colors.border },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.dateLabel}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <Text style={styles.greeting}>{greeting}</Text>
      </View>

      <InterventionBanner
        onCtaPress={(type) => {
          if (type === 'hcp_prep_prompt') navigation.navigate('HCPPrep');
          else if (type === 'positive_reinforcement') navigation.navigate('Trends');
          else if (type === 'pa_denial_support') navigation.navigate('HCPPrep');
          else if (type === 'diary_prompt') navigation.navigate('Journal');
        }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {showCoach && (
          <View style={styles.coachCard}>
            <View style={styles.coachDots}>
              {COACH_STEPS.map((_, i) => (
                <View key={i} style={[styles.coachDot, i === coachStep && styles.coachDotActive]} />
              ))}
            </View>
            <Feather name={COACH_STEPS[coachStep].icon} size={20} color={colors.lav} style={{ marginBottom: 8 }} />
            <Text style={styles.coachTitle}>{COACH_STEPS[coachStep].title}</Text>
            <Text style={styles.coachBody}>{COACH_STEPS[coachStep].body}</Text>
            <View style={styles.coachActions}>
              {coachStep < COACH_STEPS.length - 1 ? (
                <TouchableOpacity onPress={() => setCoachStep(s => s + 1)} style={styles.coachNextBtn} accessibilityRole="button" accessibilityLabel="Next tip">
                  <Text style={styles.coachNextTxt}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={dismissCoach} style={styles.coachNextBtn} accessibilityRole="button" accessibilityLabel="Dismiss tips">
                  <Text style={styles.coachNextTxt}>Got it</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={dismissCoach} style={styles.coachSkipBtn} accessibilityRole="button" accessibilityLabel="Skip tips">
                <Text style={styles.coachSkipTxt}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Dose hero */}
        {doseConfirmedToday ? (
          <View style={styles.heroDone} accessibilityLabel="Daily dose confirmed today">
            <View style={styles.heroDoneCheck}>
              <Feather name="check" size={16} color={colors.white} />
            </View>
            <View style={styles.heroDoneText}>
              <Text style={styles.heroDoneTag}>Done today</Text>
              <Text style={styles.heroDoseTitle}>Daily dose</Text>
            </View>
          </View>
        ) : (
          <View style={styles.heroPending} accessibilityLabel="Confirm today's daily dose">
            <View style={styles.heroPendingTop}>
              <Text style={styles.heroPendingTag}>Today's dose</Text>
              <View style={styles.heroPendingDot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            </View>
            <Text style={styles.heroDoseTitle}>Daily dose</Text>
            <Text style={styles.heroPendingDesc}>
              {streak.count > 0
                ? `${streak.count} ${streak.count === 1 ? 'dose' : 'doses'} confirmed in a row. Keep it going.`
                : 'Confirm when taken to start tracking your streak.'}
            </Text>
            <TouchableOpacity
              style={[styles.heroBtn, confirmingDose && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={confirmingDose}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={confirmingDose ? 'Confirming…' : "Confirm today's dose"}
              accessibilityState={{ busy: confirmingDose }}
            >
              {confirmingDose
                ? <ActivityIndicator size="small" color={colors.white} />
                : <><Feather name="check" size={15} color={colors.white} /><Text style={styles.heroBtnTxt}>Confirm dose taken</Text></>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Quick log */}
        {quickLoggedToday ? (
          <TouchableOpacity
            style={styles.quickLoggedCard}
            onPress={() => navigation.navigate('Journal')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Today logged. Tap to add more detail."
          >
            <View style={styles.quickLoggedCheck}>
              <Feather name="check" size={13} color={colors.white} />
            </View>
            <Text style={styles.quickLoggedTxt}>Logged today</Text>
            <Text style={styles.quickLoggedCta}>Add detail →</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.quickLogCard}>
            <Text style={styles.quickLogTitle}>How was today?</Text>
            <View style={styles.quickLogToggle}>
              <TouchableOpacity
                style={[styles.quickLogOpt, quickMigraine === true && styles.quickLogMigraineActive]}
                onPress={() => setQuickMigraine(true)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityLabel="Migraine today"
                accessibilityState={{ checked: quickMigraine === true }}
              >
                <Text style={[styles.quickLogOptTxt, quickMigraine === true && { color: colors.terra }]}>Migraine</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickLogOpt, quickMigraine === false && styles.quickLogClearActive]}
                onPress={() => setQuickMigraine(false)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityLabel="Clear day"
                accessibilityState={{ checked: quickMigraine === false }}
              >
                <Text style={[styles.quickLogOptTxt, quickMigraine === false && { color: colors.sageDark }]}>Clear day</Text>
              </TouchableOpacity>
            </View>

            {quickMigraine && (
              <View style={styles.quickSevWrap}>
                <View style={styles.quickSevHeader}>
                  <Text style={styles.quickSevLabel}>Severity</Text>
                  <Text style={styles.quickSevRange}>1 = mild  ·  10 = severe</Text>
                </View>
                {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
                  <View key={ri} style={styles.quickSevRow}>
                    {row.map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[styles.quickSevBtn, quickSeverity === n && styles.quickSevBtnActive]}
                        onPress={() => setQuickSeverity(n)}
                        accessibilityRole="radio"
                        accessibilityLabel={`Severity ${n}`}
                        accessibilityState={{ checked: quickSeverity === n }}
                      >
                        <Text style={[styles.quickSevTxt, quickSeverity === n && styles.quickSevTxtActive]}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {quickError && (
              <Text style={styles.quickErrorTxt}>Couldn't save. Try again or use the full Journal tab.</Text>
            )}

            <TouchableOpacity
              style={[styles.quickSaveBtn, (quickMigraine === null || quickSaving) && { opacity: 0.35 }]}
              onPress={handleQuickSave}
              disabled={quickMigraine === null || quickSaving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save today's log"
              accessibilityState={{ disabled: quickMigraine === null || quickSaving }}
            >
              <Text style={styles.quickSaveTxt}>{quickSaving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionBreak}>
          <Text style={styles.sectionBreakLabel}>Your patterns</Text>
        </View>

        {/* Dose consistency */}
        <View style={styles.consistencyCard} accessibilityLabel={`Dose consistency. ${streak.count} consecutive doses confirmed.`}>
          <Text style={styles.consistencySectionLbl}>Dose consistency</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricNum}>{streak.count}</Text>
              <Text style={styles.metricLbl}>
                {streak.count === 0 ? 'start your streak' : streak.count === 1 ? 'dose confirmed' : 'doses in a row'}
              </Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBlock}>
              <Text style={styles.metricNum}>{confirmedCount}</Text>
              <Text style={styles.metricLbl}>of 7 days this week</Text>
            </View>
          </View>

          <View style={styles.weekStrip}>
            {weekDays.map((day, i) => (
              <View key={i} style={styles.weekDay}>
                <View style={[
                  styles.weekDot,
                  day.confirmed && styles.weekDotConfirmed,
                  day.missed    && styles.weekDotMissed,
                  day.isToday && !day.confirmed && styles.weekDotToday,
                ]}>
                  {day.confirmed && <Feather name="check" size={11} color={colors.white} />}
                  {day.missed    && <Feather name="minus" size={10} color={colors.border} />}
                </View>
                <Text style={[styles.weekDayLbl, day.isToday && styles.weekDayLblToday]}>{day.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.weekLegend}>
            <View style={styles.weekLegendItem}>
              <View style={[styles.weekLegendDot, { backgroundColor: colors.lav }]} />
              <Text style={styles.weekLegendTxt}>Confirmed</Text>
            </View>
            <View style={styles.weekLegendItem}>
              <View style={[styles.weekLegendDot, { backgroundColor: colors.creamMid, borderWidth: 1.5, borderColor: colors.border }]} />
              <Text style={styles.weekLegendTxt}>Missed</Text>
            </View>
            <View style={styles.weekLegendItem}>
              <View style={[styles.weekLegendDot, { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lav }]} />
              <Text style={styles.weekLegendTxt}>Today</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(confirmedCount / 7) * 100}%` }]} />
          </View>
          <Text style={styles.streakHint}>Stays active even if you miss one day.</Text>
        </View>

        {/* MOH warning */}
        {mohDays >= 10 && (
          <View style={styles.mohWarning}>
            <Feather name="alert-triangle" size={15} color={colors.terraDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mohTitle}>Rescue medication: {mohDays} days this month</Text>
              <Text style={styles.mohBody}>Using acute treatments on more than 10 days per month can cause rebound headaches. Mention this at your next appointment.</Text>
            </View>
          </View>
        )}

        {/* Prediction */}
        {prediction === undefined ? (
          <View style={styles.predCardSkeleton}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={styles.predSkeletonEyebrow}>Migraine risk · Tomorrow</Text>
              <ActivityIndicator size="small" color={colors.slateLight} />
            </View>
            <Text style={styles.predSkeletonBody}>Analyzing your recent patterns…</Text>
          </View>
        ) : prediction === null ? (
          <View style={styles.predCardEmpty}>
            <Text style={styles.predEmptyTitle}>Migraine risk · Tomorrow</Text>
            <Text style={styles.predEmptyBody}>Log 7 days to unlock your personal migraine pattern analysis.</Text>
          </View>
        ) : (
          <View style={[styles.predCard, styles[`predCard_${prediction.level}`]]}>
            <View style={styles.predTopRow}>
              <Text style={[styles.predEyebrow, styles[`predText_${prediction.level}`]]}>Migraine risk · Tomorrow</Text>
              <View style={[styles.predBadge, styles[`predBadge_${prediction.level}`]]}>
                <View style={styles.predDot} />
                <Text style={styles.predBadgeTxt}>{prediction.label}</Text>
              </View>
            </View>
            {prediction.reasons.map((r, i) => (
              <Text key={i} style={[styles.predReason, i > 0 && { marginTop: 4 }]}>{r}</Text>
            ))}
            <Text style={styles.predDisclaimer}>Based on your patterns, not medical advice</Text>
            <Text style={styles.predAction}>
              {prediction.level === 'elevated'
                ? 'Consider keeping your acute medication accessible today.'
                : prediction.level === 'moderate'
                ? 'Stay hydrated and aim for consistent sleep tonight.'
                : 'Risk looks low. Keep your usual routine.'}
            </Text>
          </View>
        )}

        {/* Weekly snapshot */}
        {weekSummary !== null && weekSummary.total > 0 && (
          <TouchableOpacity
            style={[styles.snapshotCard, weekSummary.count > 0 && { backgroundColor: colors.terraStrong, borderColor: colors.terraBorder }]}
            onPress={() => navigation.navigate('Trends')}
            activeOpacity={0.85}
          >
            <View style={[styles.snapshotDot, { backgroundColor: weekSummary.count > 0 ? colors.terra : colors.sage }]} />
            <Text style={styles.snapshotTxt}>
              {weekSummary.count === 0 ? 'No migraine days logged this week' : `${weekSummary.count} migraine ${weekSummary.count === 1 ? 'day' : 'days'} this week`}
            </Text>
            <Feather name="chevron-right" size={14} color={colors.slateLight} />
          </TouchableOpacity>
        )}

        <EducationInsightCard
          insight={educationInsight}
          onPress={() => navigation.navigate('ArticleDetail', { articleId: educationInsight?.articleId })}
        />

        {/* Action grid: two explicit rows for pixel-correct flex layout */}
        <View style={styles.actionGrid}>
          {[ACTIONS.slice(0, 2), ACTIONS.slice(2)].map((row, ri) => (
            <View key={ri} style={styles.actionRow}>
              {row.map((a, i) => (
                <TouchableOpacity
                  key={a.label}
                  style={[styles.actionTile, { backgroundColor: a.bg, borderColor: a.border }, ri === 0 && styles.actionTilePrimary]}
                  onPress={a.onPress}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                >
                  <View style={[styles.actionIcon, { backgroundColor: a.bg === colors.white ? colors.creamMid : 'rgba(255,255,255,0.65)' }]}>
                    <Feather name={a.icon} size={ri === 0 ? 18 : 16} color={a.iconColor} />
                  </View>
                  <Text style={[styles.actionLbl, ri > 0 && styles.actionLblSecondary]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <TreatmentDateCard
          startDate={treatmentStart}
          onSave={async iso => { setTreatmentStart(iso); await setTreatmentStartDate(iso); }}
        />

        <TreatmentStatusSection status={treatmentStatus} onUpdate={handleStatusUpdate} />

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  dateLabel: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateLight, marginBottom: 5 },
  greeting: { fontFamily: fonts.display, fontSize: textSize.displayMd, color: colors.slate, lineHeight: 36 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: 4 },
  sectionBreak: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  sectionBreakLabel: { fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, color: colors.slateLight, letterSpacing: 0.8 },

  // Hero: pending
  heroPending: {
    ...shadows.md,
    backgroundColor: colors.sagePale, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: radius.xl, padding: spacing.lg, marginBottom: 10,
  },
  heroPendingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  heroPendingTag: { fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, color: colors.slateMid },
  heroPendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sage },
  heroDoseTitle: { fontFamily: fonts.display, fontSize: textSize.display, color: colors.slate, lineHeight: 34, marginBottom: 8 },
  heroPendingDesc: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 22, marginBottom: 20 },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.sage, borderRadius: radius.full, paddingVertical: 15,
  },
  heroBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },

  // Hero: done
  heroDone: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: radius.xl, padding: spacing.md, marginBottom: 10,
  },
  heroDoneCheck: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  heroDoneText: { flex: 1 },
  heroDoneTag: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateMid, marginBottom: 2 },

  // Consistency card
  consistencyCard: {
    ...shadows.sm,
    backgroundColor: colors.lavPale, borderWidth: 1, borderColor: colors.lavLight,
    borderRadius: radius.xl, padding: spacing.lg, marginBottom: 10,
  },
  consistencySectionLbl: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slate, marginBottom: 16 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  metricBlock: { flex: 1, alignItems: 'center' },
  metricNum: { fontFamily: fonts.bodyMedium, fontSize: textSize.metricLg, color: colors.lav, lineHeight: 46 },
  metricLbl: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateMid, textAlign: 'center', marginTop: 4 },
  metricDivider: { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: 16 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  weekDay: { alignItems: 'center', gap: 7 },
  weekDayLbl: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.slateLight, letterSpacing: 0.2 },
  weekDayLblToday: { color: colors.lav, fontFamily: fonts.bodySemiBold },
  weekDot: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white,
    borderWidth: 1.5, borderColor: colors.lavLight, alignItems: 'center', justifyContent: 'center',
  },
  weekDotConfirmed: { backgroundColor: colors.lav, borderColor: colors.lav },
  weekDotMissed:    { backgroundColor: colors.creamMid, borderColor: colors.border },
  weekDotToday:     { borderColor: colors.lav, borderWidth: 2 },
  weekLegend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 14 },
  weekLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  weekLegendDot: { width: 10, height: 10, borderRadius: 5 },
  weekLegendTxt: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight },
  progressTrack: { height: 6, backgroundColor: colors.white, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.lav, borderRadius: radius.full },
  streakHint: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight, textAlign: 'center', marginTop: 10 },

  // Weekly snapshot
  snapshotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 13, marginBottom: 10,
  },
  snapshotDot: { width: 8, height: 8, borderRadius: 4 },
  snapshotTxt: { flex: 1, fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },

  // Action grid
  actionGrid: { gap: 9, marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 9 },
  actionTile: { ...shadows.sm, flex: 1, borderWidth: 1, borderRadius: radius.xl, padding: 16, minHeight: 86, justifyContent: 'flex-end', gap: 10 },
  actionTilePrimary: { minHeight: 96 },
  actionIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actionLbl: { fontFamily: fonts.bodySemiBold, fontSize: textSize.body, color: colors.slate },
  actionLblSecondary: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateMid },

  // Prediction
  predCardEmpty: {
    backgroundColor: colors.creamMid, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18, marginBottom: 10,
  },
  predEmptyTitle: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateLight, marginBottom: 6 },
  predEmptyBody: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight, lineHeight: 22 },
  predCard: { ...shadows.sm, borderWidth: 1, borderRadius: radius.xl, padding: 18, marginBottom: 10 },
  predCard_low:      { backgroundColor: colors.sagePale,   borderColor: colors.sageBorder },
  predCard_moderate: { backgroundColor: colors.terraPale,  borderColor: colors.terraBorder },
  predCard_elevated: { backgroundColor: colors.terraStrong, borderColor: colors.terra },
  predTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  predEyebrow: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, letterSpacing: 0.3 },
  predText_low:      { color: colors.sageDark },
  predText_moderate: { color: colors.terra },
  predText_elevated: { color: colors.terraDark },
  predBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
  },
  predBadge_low:      { backgroundColor: colors.sage },
  predBadge_moderate: { backgroundColor: colors.terra },
  predBadge_elevated: { backgroundColor: colors.terraDark },
  predDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' },
  predBadgeTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.white },
  predReason: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 22, marginBottom: 8 },
  predDisclaimer: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight, letterSpacing: 0.2, marginBottom: 6 },
  predAction: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 21 },
  predCardSkeleton: {
    backgroundColor: colors.creamMid, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18, marginBottom: 10,
  },
  predSkeletonEyebrow: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateLight, marginBottom: 6 },
  predSkeletonBody: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight, lineHeight: 22 },

  // Quick log
  quickLogCard: {
    ...shadows.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18, marginBottom: 10,
  },
  quickLogTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, marginBottom: 12 },
  quickLogToggle: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickLogOpt: { flex: 1, paddingVertical: 11, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, alignItems: 'center' },
  quickLogMigraineActive: { borderColor: colors.terra, backgroundColor: colors.terraPale },
  quickLogClearActive: { borderColor: colors.sage, backgroundColor: colors.sagePale },
  quickLogOptTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },
  quickSevWrap: { marginTop: 12, marginBottom: 4 },
  quickSevHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  quickSevLabel: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateMid },
  quickSevRange: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight },
  quickSevRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  quickSevBtn: { flex: 1, paddingVertical: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 9, alignItems: 'center' },
  quickSevBtnActive: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  quickSevTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },
  quickSevTxtActive: { fontFamily: fonts.bodyMedium, color: colors.lav },
  quickErrorTxt: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.terra, marginTop: 8 },
  mohWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.md, padding: 14, marginBottom: 10,
  },
  mohTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.terraDark, marginBottom: 3 },
  mohBody: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateMid, lineHeight: 20 },
  quickSaveBtn: {
    backgroundColor: colors.lav, borderRadius: radius.full,
    paddingVertical: 12, alignItems: 'center', marginTop: 12,
  },
  quickSaveTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.white },
  quickLoggedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 10,
  },
  quickLoggedCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  quickLoggedTxt: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate },
  quickLoggedCta: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.lav },

  // Coachmark
  coachCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lavLight,
    borderRadius: radius.xl, padding: spacing.lg, marginBottom: 10,
  },
  coachDots: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  coachDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  coachDotActive: { backgroundColor: colors.lav },
  coachTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slate, marginBottom: 6 },
  coachBody: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 22, marginBottom: 16 },
  coachActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  coachNextBtn: { backgroundColor: colors.lav, borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 22 },
  coachNextTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.white },
  coachSkipBtn: { paddingVertical: 10 },
  coachSkipTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight },
});
