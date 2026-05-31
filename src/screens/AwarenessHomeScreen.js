import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getAssessmentResult, getJournalEntries, getTreatmentStatus, saveTreatmentStatus } from '../services/storage';
import { getGreeting } from '../lib/dateUtils';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';
import InterventionBanner from '../components/InterventionBanner';
import QuickLogSection from '../components/QuickLogSection';
import TreatmentStatusSection from '../components/TreatmentStatusSection';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius, textSize, shadows, gradients } from '../theme';

const ARTICLES = [
  { id: 'cgrp-education', title: 'What is a CGRP and how does it relate to migraines?', meta: '5 min · Education' },
  { id: 'undertreated', title: 'How to tell if you are being undertreated for migraines', meta: '4 min · Education' },
  { id: 'hcp-conversation', title: 'How to talk to your doctor about preventive options', meta: '6 min · HCP Prep' },
  { id: 'stress-triggers', title: 'How stress triggers migraines — and what you can do about it', meta: '4 min · Triggers' },
  { id: 'sleep-migraines', title: 'The connection between sleep and migraine frequency', meta: '4 min · Triggers' },
];

export default function AwarenessHomeScreen({ navigation }) {
  const greeting = getGreeting();

  const { emitEvent } = useOrchestration();

  const [priorResult, setPriorResult]         = useState(null);
  const [quickLoggedToday, setQuickLoggedToday] = useState(false);
  const [monthStats, setMonthStats]           = useState(null);
  const [treatmentStatus, setTreatmentStatus] = useState({ paStatus: 'not_submitted', paExpiryDate: null, refillDate: null });

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [result, entries, txStatus] = await Promise.all([getAssessmentResult(), getJournalEntries(), getTreatmentStatus()]);
        setTreatmentStatus(txStatus);
        setPriorResult(result);

        const todayStr = new Date().toDateString();
        setQuickLoggedToday(entries.some(e => new Date(e.date).toDateString() === todayStr));

        // Emit app_opened for diary-gap rule
        const lastEntry = entries[0];
        const daysSinceLast = lastEntry
          ? Math.floor((Date.now() - new Date(lastEntry.date).getTime()) / 86400000)
          : 999;
        emitEvent(EVENTS.APP_OPENED, { daysSinceLast });

        if (entries.length >= 3) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recent = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);
          const allDays = new Set(recent.map(e => new Date(e.date).toDateString()));
          const migraineDays = new Set(recent.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())).size;
          const severities = recent.filter(e => e.hadMigraine && e.severity).map(e => e.severity);
          const avgSev = severities.length > 0
            ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
            : null;
          setMonthStats({ migraineDays, avgSev, totalLogged: allDays.size });
        }
      })();
    }, [])
  );

  async function handleStatusUpdate(patch) {
    const updated = { ...treatmentStatus, ...patch };
    setTreatmentStatus(updated);
    await saveTreatmentStatus(updated);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingSm}>{greeting}</Text>
          <Text style={styles.greeting}>
            Where are you{' '}
            <Text style={styles.greetingItalic}>today?</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="settings" size={20} color={colors.slateLight} />
        </TouchableOpacity>
      </View>

      <InterventionBanner
        onCtaPress={(type) => {
          if (type === 'hcp_prep_prompt') navigation.navigate('HCPPrep');
          else if (type === 'diary_prompt') navigation.navigate('Journal');
          else if (type === 'positive_reinforcement') navigation.navigate('Trends');
        }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* Self-assessment hero */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Assessment')}
          accessibilityRole="button"
          accessibilityLabel={priorResult ? `Assessment result: ${priorResult.title}. Retake the assessment.` : 'Self-assessment: Could preventive therapy be right for you? Answer 5 quick questions.'}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.6 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroEy}>Self-assessment</Text>
            <Text style={styles.heroTitle}>
              {priorResult ? priorResult.title : 'Could preventive therapy be right for you?'}
            </Text>
            {!priorResult && (
              <Text style={styles.heroDesc}>Answer 5 quick questions and get a clear picture of whether preventive therapy is worth discussing with your doctor.</Text>
            )}
            <View style={styles.heroCtaRow}>
              <Text style={styles.heroCta}>{priorResult ? 'Retake assessment' : 'Take the assessment'}</Text>
              <Feather name="arrow-right" size={14} color={colors.white} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {priorResult && (
          <TouchableOpacity
            style={styles.priorResultCard}
            onPress={() => navigation.navigate('Assessment')}
            accessibilityRole="button"
            accessibilityLabel="View or retake your assessment"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.priorResultLabel}>Your last assessment</Text>
              <Text style={styles.priorResultTitle} numberOfLines={2}>{priorResult.title}</Text>
              <View style={styles.priorResultDateRow}>
                <Text style={styles.priorResultDate}>
                  {new Date(priorResult.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                </Text>
                <Text style={[styles.priorResultDate, { color: colors.lav }]}>Retake</Text>
                <Feather name="chevron-right" size={13} color={colors.lav} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick log */}
        <Text style={styles.sectionLabel}>Log today</Text>
        <QuickLogSection
          isLogged={quickLoggedToday}
          onAddDetail={() => navigation.navigate('Journal')}
          headerText="Tracking even on clear days builds the pattern data you'll bring to your doctor."
          headerVariant="hint"
          onSaved={() => setQuickLoggedToday(true)}
        />

        {/* 30-day stats (once there's enough data) */}
        {monthStats && monthStats.totalLogged >= 3 && (
          <>
            <Text style={styles.sectionLabel}>Your last 30 days</Text>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() => navigation.navigate('Trends')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="View your migraine trends"
            >
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statNum}>{monthStats.migraineDays}</Text>
                  <Text style={styles.statLbl}>migraine {monthStats.migraineDays === 1 ? 'day' : 'days'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={styles.statNum}>{monthStats.avgSev ?? '—'}</Text>
                  <Text style={styles.statLbl}>avg severity</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBlock}>
                  <Text style={styles.statNum}>{monthStats.totalLogged}</Text>
                  <Text style={styles.statLbl}>days tracked</Text>
                  <Text style={styles.statSub}>last 30 days</Text>
                </View>
              </View>
              {monthStats.migraineDays >= 4 && (
                <View style={styles.statsAlert}>
                  <Text style={styles.statsAlertTxt}>
                    {monthStats.migraineDays} migraine days may be worth discussing with your doctor.
                  </Text>
                </View>
              )}
              <Text style={styles.statsLink}>See full trends →</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.sectionLabel}>Learn</Text>

        <TouchableOpacity
          style={styles.featuredCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('ArticleDetail', { articleId: ARTICLES[0].id })}
          accessibilityRole="button"
          accessibilityLabel={`${ARTICLES[0].title}. ${ARTICLES[0].meta}`}
        >
          <Text style={styles.featuredMeta}>{ARTICLES[0].meta}</Text>
          <Text style={styles.featuredTitle}>{ARTICLES[0].title}</Text>
        </TouchableOpacity>

        {ARTICLES.slice(1).map((a) => (
          <TouchableOpacity
            key={a.id}
            style={styles.artRow}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ArticleDetail', { articleId: a.id })}
            accessibilityRole="button"
            accessibilityLabel={`${a.title}. ${a.meta}`}
          >
            <View style={styles.artRowText}>
              <Text style={styles.artRowTitle}>{a.title}</Text>
              <Text style={styles.artRowMeta}>{a.meta}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.slateLight} />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>HCP Prep</Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('HCPPrep')}
          accessibilityRole="button"
          accessibilityLabel="Prepare for your next appointment. Generate a summary of your migraine burden."
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Prepare for your next appointment</Text>
            <Text style={styles.cardDesc}>Generate a summary of your migraine burden to share with your doctor.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.lav} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Treatment Access</Text>
        <TreatmentStatusSection status={treatmentStatus} onUpdate={handleStatusUpdate} />

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 4 },
  headerLeft: { flex: 1, marginRight: spacing.sm },
  greetingSm: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateLight, marginBottom: 4 },
  greeting: { fontFamily: fonts.display, fontSize: textSize.display, color: colors.slate },
  greetingItalic: { fontFamily: fonts.displayItalic, color: colors.lav },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  heroCard: { ...shadows.md, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, overflow: 'hidden' },
  heroEy: { fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, letterSpacing: 0.8, color: 'rgba(253,252,249,0.9)', marginBottom: 8 },
  heroTitle: { fontFamily: fonts.display, fontSize: textSize.heading, color: colors.white, lineHeight: 29, marginBottom: 10 },
  heroDesc: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: 'rgba(253,252,249,0.82)', lineHeight: 24 },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  heroCta: { fontFamily: fonts.bodyMedium, fontSize: textSize.bodyLarge, color: colors.white },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label,
    color: colors.slateLight, marginTop: 18, marginBottom: 10,
  },

  // 30-day stats
  statsCard: {
    ...shadows.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18, marginBottom: 10,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statBlock: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: fonts.bodyMedium, fontSize: textSize.metric, color: colors.lav, lineHeight: 44 },
  statLbl: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateMid, textAlign: 'center', marginTop: 2 },
  statSub: { fontFamily: fonts.body, fontSize: textSize.micro, color: colors.slateLight, textAlign: 'center', marginTop: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 8 },
  statsAlert: {
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  statsAlertTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.terraDark, lineHeight: 21 },
  statsLink: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.lav, textAlign: 'right' },

  // Articles
  featuredCard: {
    ...shadows.sm,
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: 9, borderWidth: 1, borderColor: colors.border,
  },
  featuredMeta: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.lav, marginBottom: 8 },
  featuredTitle: { fontFamily: fonts.display, fontSize: textSize.heading, color: colors.slate, lineHeight: 28 },
  artRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: radius.md, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  artRowText: { flex: 1 },
  artRowTitle: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slate, lineHeight: 20, marginBottom: 3 },
  artRowMeta: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateLight },

  card: {
    ...shadows.sm,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slate, marginBottom: 4 },
  cardDesc: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight, lineHeight: 22 },

  priorResultCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: 6, borderWidth: 1, borderColor: colors.border,
  },
  priorResultLabel: { fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, color: colors.slateLight, letterSpacing: 0.5, marginBottom: 5 },
  priorResultTitle: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slate, lineHeight: 21, marginBottom: 6 },
  priorResultDateRow: { flexDirection: 'row', alignItems: 'center' },
  priorResultDate: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateLight },
});
