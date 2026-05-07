import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';

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

export default function AssessmentScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  const q = QUESTIONS[step];
  const selected = answers[q?.id];
  const progress = (step + 1) / QUESTIONS.length;

  function pick(option) {
    setAnswers(prev => ({ ...prev, [q.id]: option }));
  }

  function handleNext() {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setDone(false);
  }

  if (done) {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.resultBody} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[colors.lav, '#6B5FAA']} style={styles.resultCard}>
            <Text style={styles.resultIcon}>✦</Text>
            <Text style={styles.resultTitle}>You may be a candidate for preventive therapy</Text>
            <Text style={styles.resultDesc}>
              Based on your answers, your migraine frequency and impact suggest it is worth a conversation with your doctor about preventive treatment options.
            </Text>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What this means</Text>
            <Text style={styles.cardDesc}>
              This is not a diagnosis. It is a signal to start a conversation with your healthcare provider. Use the HCP Prep tool to help you articulate your experience clearly.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your answers at a glance</Text>
            {QUESTIONS.map(q => (
              <View key={q.id} style={styles.summaryRow}>
                <Text style={styles.summaryQ} numberOfLines={2}>{q.text}</Text>
                <Text style={styles.summaryA}>{answers[q.id]}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('HCPPrep')}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Prepare for my HCP visit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={restart} activeOpacity={0.7}>
            <Text style={styles.ghostBtnText}>Take again</Text>
          </TouchableOpacity>
          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
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
            >
              <View style={[styles.optNum, selected === opt && styles.optNumSel]}>
                <Text style={[styles.optNumText, selected === opt && { color: 'white' }]}>{LETTERS[i]}</Text>
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
  back: { marginBottom: spacing.md },
  backText: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  progressBar: { height: 4, backgroundColor: colors.creamMid, borderRadius: radius.full, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.lav, borderRadius: radius.full },
  stepLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slateLight, textAlign: 'right' },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 110 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.8,
    textTransform: 'uppercase', color: colors.lav, marginBottom: 12,
  },
  question: {
    fontFamily: fonts.display, fontSize: 28, lineHeight: 36,
    color: colors.slate, marginBottom: spacing.xl,
  },
  options: { gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 15, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, backgroundColor: 'white',
  },
  optionSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  optNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.creamMid,
    alignItems: 'center', justifyContent: 'center',
  },
  optNumSel: { backgroundColor: colors.lav },
  optNumText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.slateMid },
  optText: { fontFamily: fonts.body, fontSize: 17, color: colors.slate, flex: 1, lineHeight: 22 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm },
  primaryBtn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  primaryBtnText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: 'white' },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  resultBody: { padding: spacing.lg, gap: spacing.sm },
  resultCard: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  resultIcon: { fontSize: 38, marginBottom: 14, color: 'white' },
  resultTitle: {
    fontFamily: fonts.display, fontSize: 28, color: 'white',
    textAlign: 'center', lineHeight: 34, marginBottom: 12,
  },
  resultDesc: {
    fontFamily: fonts.body, fontSize: 16, color: 'rgba(255,255,255,0.9)',
    textAlign: 'center', lineHeight: 22,
  },
  card: {
    backgroundColor: 'white', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate, marginBottom: 8 },
  cardDesc: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, lineHeight: 20 },
  summaryRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  summaryQ: { fontFamily: fonts.body, fontSize: 16, color: colors.slateLight, marginBottom: 3, lineHeight: 17 },
  summaryA: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate },
});
