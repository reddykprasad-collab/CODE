import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getAssessmentResult, getJournalEntries, saveJournalEntry } from '../services/storage';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';
import InterventionBanner from '../components/InterventionBanner';
import { colors, fonts, spacing, radius, textSize } from '../theme';

const ARTICLES = [
  { id: 'cgrp-education', title: 'What is a CGRP and how does it relate to migraines?', meta: '5 min · Education' },
  { id: 'undertreated', title: 'How to tell if you are being undertreated for migraines', meta: '4 min · Education' },
  { id: 'hcp-conversation', title: 'How to talk to your doctor about preventive options', meta: '6 min · HCP Prep' },
  { id: 'stress-triggers', title: 'How stress triggers migraines — and what you can do about it', meta: '4 min · Triggers' },
  { id: 'sleep-migraines', title: 'The connection between sleep and migraine frequency', meta: '4 min · Triggers' },
];

export default function AwarenessHomeScreen({ navigation }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { emitEvent } = useOrchestration();

  const [priorResult, setPriorResult]         = useState(null);
  const [quickLoggedToday, setQuickLoggedToday] = useState(false);
  const [quickMigraine, setQuickMigraine]     = useState(null);
  const [quickSeverity, setQuickSeverity]     = useState(5);
  const [quickSaving, setQuickSaving]         = useState(false);
  const [quickError, setQuickError]           = useState(false);
  const [monthStats, setMonthStats]           = useState(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [result, entries] = await Promise.all([getAssessmentResult(), getJournalEntries()]);
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
          const migraineDays = new Set(recent.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())).size;
          const severities = recent.filter(e => e.hadMigraine && e.severity).map(e => e.severity);
          const avgSev = severities.length > 0
            ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
            : null;
          setMonthStats({ migraineDays, avgSev, totalLogged: recent.length });
        }
      })();
    }, [])
  );

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

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.greetingSm}>{greeting}</Text>
        <Text style={styles.greeting}>
          Where are you{' '}
          <Text style={styles.greetingItalic}>today?</Text>
        </Text>
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
          <View style={styles.heroCard}>
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
          </View>
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
            <Text style={styles.quickLogHint}>Tracking even on clear days builds the pattern data you'll bring to your doctor.</Text>
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
                <Text style={[styles.quickLogOptTxt, quickMigraine === false && { color: colors.sage }]}>Clear day</Text>
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
                  <Text style={styles.statLbl}>days logged</Text>
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

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 4 },
  greetingSm: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateLight, marginBottom: 4 },
  greeting: { fontFamily: fonts.display, fontSize: textSize.display, color: colors.slate },
  greetingItalic: { fontFamily: fonts.displayItalic, color: colors.lav },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  heroCard: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.lav },
  heroEy: { fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, letterSpacing: 0.8, color: 'rgba(253,252,249,0.9)', marginBottom: 8 },
  heroTitle: { fontFamily: fonts.display, fontSize: textSize.heading, color: colors.white, lineHeight: 29, marginBottom: 10 },
  heroDesc: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: 'rgba(253,252,249,0.82)', lineHeight: 24 },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  heroCta: { fontFamily: fonts.bodyMedium, fontSize: textSize.bodyLarge, color: colors.white },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label,
    color: colors.slateLight, marginTop: 18, marginBottom: 10,
  },

  // Quick log
  quickLogCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18, marginBottom: 10,
  },
  quickLogHint: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 22, marginBottom: 12 },
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

  // 30-day stats
  statsCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18, marginBottom: 10,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statBlock: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: fonts.bodyMedium, fontSize: textSize.metric, color: colors.lav, lineHeight: 44 },
  statLbl: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateMid, textAlign: 'center', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 8 },
  statsAlert: {
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  statsAlertTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.terra, lineHeight: 21 },
  statsLink: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.lav, textAlign: 'right' },

  // Articles
  featuredCard: {
    backgroundColor: colors.lavPale, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: 9, borderWidth: 1, borderColor: colors.lavLight,
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
