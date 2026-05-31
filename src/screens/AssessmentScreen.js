import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, textSize } from '../theme';
import { sharedStyles } from '../styles/shared';
import { saveAssessmentResult, setUserPath, setTreatmentStartDate } from '../services/storage';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';

const QUESTIONS = [
  {
    id: 'q1',
    text: 'How many days per month do migraines keep you from your usual activities?',
    options: ['Fewer than 2 days', '2 to 4 days', '5 or more days'],
  },
  {
    id: 'q2',
    text: 'Have you tried more than two different treatments for migraine prevention?',
    options: ['Yes, and none worked well', 'Yes, and some helped a little', "No, I haven't tried preventive treatment"],
  },
  {
    id: 'q3',
    text: 'Do you rely on pain-relief medication more than 10 days per month?',
    options: ['Yes, most months', 'Sometimes', 'No, rarely'],
  },
  {
    id: 'q4',
    text: 'Has a doctor ever discussed preventive migraine treatment with you?',
    options: ["Yes, and I'm currently on it", 'Yes, but I never started', "No, it's never come up"],
  },
  {
    id: 'q5',
    text: "How would you describe migraines' impact on your quality of life?",
    options: [
      'Significant: affects work, relationships, and daily life',
      'Moderate: some disruption, but I manage',
      'Minimal: I can push through most of the time',
    ],
  },
];

const LETTERS = ['A', 'B', 'C'];

const QUESTION_SCORES = {
  q1: { 'Fewer than 2 days': 0, '2 to 4 days': 1, '5 or more days': 2 },
  q2: { 'Yes, and none worked well': 2, 'Yes, and some helped a little': 1, "No, I haven't tried preventive treatment": 0 },
  q3: { 'Yes, most months': 2, 'Sometimes': 1, 'No, rarely': 0 },
  q5: { 'Significant: affects work, relationships, and daily life': 2, 'Moderate: some disruption, but I manage': 1, 'Minimal: I can push through most of the time': 0 },
};

const ALREADY_ON_TREATMENT = "Yes, and I'm currently on it";

const RESULTS = {
  onTreatment: {
    icon: 'activity',
    title: "You're already on preventive treatment",
    desc: "The most useful thing you can do now is track consistently. Your journal data will show whether treatment is working and give your doctor what they need to adjust if it isn't.",
    cta: null,
    ctaLabel: null,
    note: "Keep logging in the Journal tab after migraines and on migraine-free days.",
    showScoring: false,
  },
  strong: {
    icon: 'check-circle',
    title: 'You may be a strong candidate for preventive therapy',
    desc: 'Your frequency, impact, and treatment history put you in the range where most guidelines recommend discussing preventive options with your doctor.',
    cta: 'HCPPrep',
    ctaLabel: 'Prepare for my HCP visit',
    note: 'This is not a diagnosis. It is a signal to start a conversation.',
    showScoring: true,
  },
  discuss: {
    icon: 'message-circle',
    title: 'Your pattern is worth a conversation with your doctor',
    desc: 'Your answers suggest migraine is affecting your life in ways that are manageable now but may benefit from a more structured approach.',
    cta: 'HCPPrep',
    ctaLabel: 'Prepare for my HCP visit',
    note: 'Even if preventive therapy is not the answer yet, your doctor can help you build a better management plan.',
    showScoring: true,
  },
  notYet: {
    icon: 'info',
    title: 'Preventive therapy may not be the focus right now',
    desc: 'Based on your answers, your migraine burden is currently below the threshold where preventive therapy is typically recommended. Consistent tracking is the most useful next step.',
    cta: null,
    ctaLabel: null,
    note: 'Retake this assessment if your pattern changes.',
    showScoring: true,
  },
};

function scoreAnswers(answers) {
  if (answers.q4 === ALREADY_ON_TREATMENT) return RESULTS.onTreatment;
  const total = ['q1', 'q2', 'q3', 'q5'].reduce((sum, id) => {
    return sum + (QUESTION_SCORES[id]?.[answers[id]] ?? 0);
  }, 0);
  if (total >= 6) return RESULTS.strong;
  if (total >= 3) return RESULTS.discuss;
  return RESULTS.notYet;
}

export default function AssessmentScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const { emitEvent } = useOrchestration();

  const q = QUESTIONS[step];
  const selected = answers[q?.id];
  const progress = (step + 1) / QUESTIONS.length;

  function pick(option) {
    setAnswers(prev => ({ ...prev, [q.id]: option }));
  }

  async function handleNext() {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const finalAnswers = { ...answers };
      const result = scoreAnswers(finalAnswers);
      await saveAssessmentResult({ title: result.title, icon: result.icon });
      setDone(true);
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setDone(false);
  }

  if (done) {
    const result = scoreAnswers(answers);
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.resultBody} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            <Feather name={result.icon} size={32} color={colors.white} style={styles.resultIcon} />
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultDesc}>{result.desc}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardDesc}>{result.note}</Text>
          </View>

          {result.showScoring && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How this is scored</Text>
              <Text style={styles.cardDesc}>
                Your score weighs four factors: how often migraines disrupt your life, how many treatments you've tried, daily medication use, and overall quality-of-life impact. A score of 6 or higher typically indicates strong candidacy for preventive therapy; 3 to 5 suggests it may be worth discussing.
              </Text>
            </View>
          )}

          {result.cta && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate(result.cta)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={result.ctaLabel}
            >
              <Text style={styles.primaryBtnText}>{result.ctaLabel}</Text>
            </TouchableOpacity>
          )}
          {result === RESULTS.strong && (
            <TouchableOpacity
              style={styles.startTreatmentBtn}
              onPress={async () => {
                await setUserPath('adherence');
                await setTreatmentStartDate(new Date().toISOString());
                emitEvent(EVENTS.TREATMENT_START_SET, {});
                navigation.navigate('Main');
              }}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="I just started preventive treatment"
            >
              <Text style={styles.startTreatmentBtnTxt}>I just started preventive treatment</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={restart}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Take the assessment again"
          >
            <Text style={styles.ghostBtnText}>Take again</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your answers at a glance</Text>
            {QUESTIONS.map(q => (
              <View key={q.id} style={styles.summaryRow}>
                <Text style={styles.summaryQ} numberOfLines={2}>{q.text}</Text>
                <Text style={styles.summaryA}>{answers[q.id]}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {step > 0 ? (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Go back to previous question"
            >
              <View style={sharedStyles.backRow}>
                <Feather name="arrow-left" size={16} color={colors.slateMid} />
                <Text style={styles.backText}>Back</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close assessment"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={22} color={colors.slateMid} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.stepLabel}>{step + 1} of {QUESTIONS.length}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={styles.eyebrow}>Candidacy self-assessment</Text>
        <Text style={styles.question}>{q.text}</Text>
        <View style={styles.options}>
          {q.options.map((opt, i) => (
            <TouchableOpacity
              key={opt}
              style={[styles.option, selected === opt && styles.optionSel]}
              onPress={() => pick(opt)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityLabel={opt}
              accessibilityState={{ checked: selected === opt }}
            >
              <View style={[styles.optNum, selected === opt && styles.optNumSel]}>
                <Text style={[styles.optNumText, selected === opt && { color: colors.white }]}>{LETTERS[i]}</Text>
              </View>
              <Text style={styles.optText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !selected && { opacity: 0.35 }]}
          onPress={handleNext}
          disabled={!selected}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={step === QUESTIONS.length - 1 ? 'See my results' : 'Continue to next question'}
          accessibilityState={{ disabled: !selected }}
        >
          <Text style={styles.primaryBtnText}>
            {step === QUESTIONS.length - 1 ? 'See my results' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  back: {},
  backText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  progressBar: { height: 4, backgroundColor: colors.creamMid, borderRadius: radius.full, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.lav, borderRadius: radius.full },
  stepLabel: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slateLight, textAlign: 'right' },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 110 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.lav, marginBottom: 12,
  },
  question: {
    fontFamily: fonts.display, fontSize: textSize.display, lineHeight: 36,
    color: colors.slate, marginBottom: spacing.xl,
  },
  options: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 15, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, backgroundColor: colors.white,
  },
  optionSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  optNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.creamMid,
    alignItems: 'center', justifyContent: 'center',
  },
  optNumSel: { backgroundColor: colors.lav },
  optNumText: { fontFamily: fonts.bodySemiBold, fontSize: textSize.base, color: colors.slateMid },
  optText: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slate, flex: 1, lineHeight: 22 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm },
  primaryBtn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  primaryBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  doneBtn: {
    borderWidth: 1.5, borderColor: colors.lav, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', backgroundColor: colors.lavPale,
  },
  doneBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.lav },
  resultBody: { padding: spacing.lg, gap: spacing.sm },
  resultCard: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.lav },
  resultIcon: { marginBottom: 16 },
  resultTitle: {
    fontFamily: fonts.display, fontSize: textSize.display, color: colors.white,
    textAlign: 'center', lineHeight: 34, marginBottom: 12,
  },
  resultDesc: {
    fontFamily: fonts.body, fontSize: textSize.base, color: 'rgba(253,252,249,0.9)',
    textAlign: 'center', lineHeight: 22,
  },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slate, marginBottom: 8 },
  cardDesc: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateMid, lineHeight: 24 },
  summaryRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  summaryQ: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight, marginBottom: 3, lineHeight: 17 },
  summaryA: { fontFamily: fonts.bodyMedium, fontSize: textSize.bodyLarge, color: colors.slate },
  startTreatmentBtn: {
    borderWidth: 1.5,
    borderColor: colors.lav,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  startTreatmentBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.body,
    color: colors.lav,
  },
});
