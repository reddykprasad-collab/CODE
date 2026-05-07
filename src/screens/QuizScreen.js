import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { setHasOnboarded, setUserPath } from '../services/storage';
import { colors, fonts, spacing, radius } from '../theme';

const QUESTIONS = [
  {
    id: 'q1',
    text: 'How often do you get migraines each month?',
    options: [
      { value: 'low', label: 'Fewer than 4 days per month' },
      { value: 'mid', label: '4 to 8 days per month' },
      { value: 'high', label: 'More than 8 days per month' },
    ],
  },
  {
    id: 'q2',
    text: 'Are you currently on any preventive migraine treatment?',
    options: [
      { value: 'yes', label: 'Yes, I take a regular preventive medication' },
      { value: 'no', label: 'No, I only treat migraines when they happen' },
      { value: 'unsure', label: "I'm not sure" },
    ],
  },
  {
    id: 'q3',
    text: 'How satisfied are you with how your migraines are managed right now?',
    options: [
      { value: 'satisfied', label: 'Very satisfied: my migraines are well controlled' },
      { value: 'somewhat', label: 'Somewhat satisfied, with room for improvement' },
      { value: 'unsatisfied', label: 'Not satisfied. Still disrupting my life.' },
    ],
  },
];

export default function QuizScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const q = QUESTIONS[step];
  const selected = answers[q.id];
  const progress = (step + 1) / QUESTIONS.length;

  async function handleNext() {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const path = answers.q2 === 'yes' ? 'adherence' : 'awareness';
      await setUserPath(path);
      await setHasOnboarded();
      navigation.replace('NotificationPermission');
    }
  }

  function pick(value) {
    setAnswers(prev => ({ ...prev, [q.id]: value }));
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

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>{q.text}</Text>
        <View style={styles.options}>
          {q.options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, selected === opt.value && styles.optionSelected]}
              onPress={() => pick(opt.value)}
              activeOpacity={0.85}
            >
              <View style={[styles.radio, selected === opt.value && styles.radioSelected]}>
                {selected === opt.value && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.optionText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          onPress={handleNext}
          disabled={!selected}
          activeOpacity={0.88}
        >
          <Text style={styles.btnText}>
            {step === QUESTIONS.length - 1 ? 'Get started' : 'Continue'}
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
  progressBar: {
    height: 4, backgroundColor: colors.creamMid, borderRadius: radius.full, marginBottom: 6,
  },
  progressFill: {
    height: '100%', backgroundColor: colors.lav, borderRadius: radius.full,
  },
  stepLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slateLight, textAlign: 'right' },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  question: {
    fontFamily: fonts.display, fontSize: 30, lineHeight: 38,
    color: colors.slate, marginBottom: spacing.xl,
  },
  options: { gap: 11, paddingBottom: spacing.lg },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 17, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 15, backgroundColor: 'white',
  },
  optionSelected: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.lav, backgroundColor: colors.lav },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
  optionText: { fontFamily: fonts.body, fontSize: 17, color: colors.slate, flex: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm },
  btn: {
    backgroundColor: colors.lav, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: 'white' },
});
