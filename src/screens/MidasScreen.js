import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getMidasScores, saveMidasScore } from '../services/storage';
import { colors, fonts, spacing, radius, textSize } from '../theme';
import { sharedStyles } from '../styles/shared';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';

const QUESTIONS = [
  {
    id: 'q1',
    text: 'How many days in the last 3 months did you miss work or school because of a headache?',
  },
  {
    id: 'q2',
    text: 'How many days in the last 3 months was your productivity at work or school reduced by half or more?',
  },
  {
    id: 'q3',
    text: 'How many days in the last 3 months did you not do household chores because of a headache?',
  },
  {
    id: 'q4',
    text: 'How many days in the last 3 months was your productivity in household chores reduced by half or more?',
  },
  {
    id: 'q5',
    text: 'How many days in the last 3 months did you miss family, social, or leisure activities because of a headache?',
  },
];

const BUCKETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 17, 21];

function scoreLabel(total) {
  if (total <= 5) return { label: 'Minimal', color: colors.sage, bg: colors.sagePale, border: colors.sageBorder };
  if (total <= 10) return { label: 'Mild', color: '#8E7E3B', bg: '#FAF5E4', border: '#D4C886' };
  if (total <= 20) return { label: 'Moderate', color: colors.terra, bg: colors.terraPale, border: colors.terraBorder };
  return { label: 'Severe', color: colors.terraDark, bg: '#FDE8E0', border: colors.terraBorder };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MidasScreen({ navigation }) {
  const { emitEvent } = useOrchestration();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('quiz');

  useEffect(() => {
    getMidasScores().then(setHistory);
  }, []);

  const q = QUESTIONS[step];
  const total = QUESTIONS.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);

  async function handleNext() {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const previousScore = history.length > 0 ? (history[0].total ?? history[0].score) : null;
      const scoreRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        score: total,           // kept for backward compat
        total,                  // authoritative field for orchestration rule
        label: scoreLabel(total).label,
        delta: previousScore !== null ? total - previousScore : null,
        ...answers,
      };
      const updated = await saveMidasScore(scoreRecord);
      emitEvent(EVENTS.MIDAS_COMPLETED, {
        total: scoreRecord.total,
        label: scoreRecord.label,
        delta: scoreRecord.delta,
      });
      setHistory(updated);
      setDone(true);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setDone(false);
    setView('quiz');
  }

  const grade = scoreLabel(total);

  if (view === 'history') {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setView('quiz')}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back to check-in"
          >
            <View style={sharedStyles.backRow}>
              <Feather name="arrow-left" size={16} color={colors.slateMid} />
              <Text style={styles.backTxt}>Back</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Score history</Text>
        </View>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {history.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTxt}>No scores yet. Complete a check-in to start tracking your disability over time.</Text>
            </View>
          ) : (
            history.map((item, i) => {
              const g = scoreLabel(item.score);
              return (
                <View key={item.id || i} style={[styles.historyCard, { borderColor: g.border, backgroundColor: g.bg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyLabel, { color: g.color }]}>{g.label}</Text>
                    <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                  </View>
                  <Text style={[styles.historyScore, { color: g.color }]}>{item.score}</Text>
                </View>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <View style={sharedStyles.backRow}>
              <Feather name="arrow-left" size={16} color={colors.slateMid} />
              <Text style={styles.backTxt}>Back</Text>
            </View>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultCard, { backgroundColor: grade.bg, borderColor: grade.border }]}>
            <Text style={[styles.resultScore, { color: grade.color }]}>{total}</Text>
            <Text style={[styles.resultGrade, { color: grade.color }]}>{grade.label} disability</Text>
            <Text style={styles.resultSub}>MIDAS score based on your last 3 months</Text>
          </View>

          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>What this means</Text>
            <Text style={styles.explanationBody}>
              {total <= 5 && 'Migraines are causing minimal disruption to your daily life. Keep logging to track any changes over time.'}
              {total > 5 && total <= 10 && 'Migraines are causing some disruption. This data gives your doctor useful context for evaluating your treatment approach.'}
              {total > 10 && total <= 20 && 'Migraines are significantly affecting your daily functioning. This is a meaningful piece of evidence to bring to your doctor — particularly if you\'re not yet on preventive therapy.'}
              {total > 20 && 'Migraines are causing severe impact on your daily life. This score is a strong signal to discuss more aggressive management with your healthcare provider.'}
            </Text>
          </View>

          <View style={styles.interpretCard}>
            <Text style={styles.interpretTitle}>MIDAS scale reference</Text>
            {[
              { range: '0 – 5', label: 'Minimal' },
              { range: '6 – 10', label: 'Mild' },
              { range: '11 – 20', label: 'Moderate' },
              { range: '21+', label: 'Severe' },
            ].map(row => (
              <View key={row.label} style={styles.interpretRow}>
                <Text style={styles.interpretRange}>{row.range}</Text>
                <Text style={styles.interpretLabel}>{row.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setView('history')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View score history"
          >
            <Text style={styles.historyBtnTxt}>View score history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Retake the check-in"
          >
            <Text style={styles.ghostBtnTxt}>Retake</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const selected = answers[q.id] ?? null;
  const progress = (step + 1) / QUESTIONS.length;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={step === 0 ? () => navigation.goBack() : () => setStep(step - 1)}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? 'Go back' : 'Go to previous question'}
        >
          <View style={sharedStyles.backRow}>
            <Feather name="arrow-left" size={16} color={colors.slateMid} />
            <Text style={styles.backTxt}>Back</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.headerRow}>
          <Text style={styles.stepMeta}>Question {step + 1} of {QUESTIONS.length}</Text>
          <TouchableOpacity
            onPress={() => setView('history')}
            accessibilityRole="button"
            accessibilityLabel="View score history"
          >
            <Text style={styles.historyLink}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={styles.eyebrow}>MIDAS Check-In</Text>
        <Text style={styles.question}>{q.text}</Text>
        <Text style={styles.questionNote}>Enter 0 if none.</Text>

        <View style={styles.bucketGrid}>
          {BUCKETS.map(val => (
            <TouchableOpacity
              key={val}
              style={[styles.bucket, selected === val && styles.bucketSel]}
              onPress={() => setAnswers(prev => ({ ...prev, [q.id]: val }))}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityLabel={`${val} days`}
              accessibilityState={{ checked: selected === val }}
            >
              <Text style={[styles.bucketTxt, selected === val && styles.bucketTxtSel]}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {step === QUESTIONS.length - 1 && Object.keys(answers).length === QUESTIONS.length && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Estimated score</Text>
            <Text style={[styles.previewScore, { color: scoreLabel(total).color }]}>{total}</Text>
            <Text style={[styles.previewGrade, { color: scoreLabel(total).color }]}>{scoreLabel(total).label}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, selected === null && { opacity: 0.35 }]}
          onPress={handleNext}
          disabled={selected === null}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={step === QUESTIONS.length - 1 ? 'See results' : 'Next question'}
          accessibilityState={{ disabled: selected === null }}
        >
          <Text style={styles.btnTxt}>
            {step === QUESTIONS.length - 1 ? 'See results' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  back: { marginBottom: spacing.md },
  backTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  progressBar: { height: 4, backgroundColor: colors.creamMid, borderRadius: radius.full, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.lav, borderRadius: radius.full },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepMeta: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slateLight },
  historyLink: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.lav },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: 120 },
  eyebrow: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.lav, marginBottom: 12 },
  question: { fontFamily: fonts.display, fontSize: 26, lineHeight: 36, color: colors.slate, marginBottom: 6 },
  questionNote: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight, marginBottom: spacing.lg },
  bucketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  bucket: {
    width: 52, height: 52, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white,
  },
  bucketSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  bucketTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slate },
  bucketTxtSel: { color: colors.lav },
  previewCard: {
    marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.lavPale,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.lavLight, alignItems: 'center',
  },
  previewLabel: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, marginBottom: 4 },
  previewScore: { fontFamily: fonts.display, fontSize: textSize.metric, color: colors.lav },
  previewGrade: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.lav },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm },
  btn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  btnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  resultCard: {
    borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center',
    borderWidth: 1, marginBottom: spacing.md,
  },
  resultScore: { fontFamily: fonts.display, fontSize: textSize.metricLg },
  resultGrade: { fontFamily: fonts.bodyMedium, fontSize: textSize.heading, marginTop: 4 },
  resultSub: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, marginTop: 6, textAlign: 'center' },
  explanationCard: {
    backgroundColor: colors.cream, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  explanationTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slate, marginBottom: 8 },
  explanationBody: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, lineHeight: 23 },
  interpretCard: {
    backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  interpretTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slate, marginBottom: 10 },
  interpretRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.creamMid },
  interpretRange: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slateMid },
  interpretLabel: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  historyBtn: {
    borderWidth: 1.5, borderColor: colors.lav, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', marginBottom: 8, backgroundColor: colors.lavPale,
  },
  historyBtnTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.lav },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight },
  doneBtn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  doneBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  title: { fontFamily: fonts.display, fontSize: textSize.display, color: colors.slate, marginBottom: 4 },
  historyCard: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, marginBottom: 10,
  },
  historyLabel: { fontFamily: fonts.bodyMedium, fontSize: textSize.base },
  historyDate: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, marginTop: 2 },
  historyScore: { fontFamily: fonts.display, fontSize: textSize.metric },
  emptyBox: {
    padding: spacing.xl, backgroundColor: colors.cream, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, lineHeight: 23 },
});
