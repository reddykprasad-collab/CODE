import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getJournalEntries, getHCPAnswers, saveHCPAnswers, getTreatmentStatus } from '../services/storage';
import { colors, fonts, spacing, radius, textSize } from '../theme';
import { sharedStyles } from '../styles/shared';

const STEPS = [
  {
    id: 'frequency',
    title: 'How often do you get migraines?',
    type: 'options',
    options: ['1–3 days per month', '4–7 days per month', '8–14 days per month', '15+ days per month'],
  },
  {
    id: 'impact',
    title: 'How do migraines affect your daily life?',
    type: 'multiselect',
    options: [
      'Miss work or school',
      'Cancel social plans',
      'Can\'t care for family',
      'Affects my relationships',
      'Limits physical activity',
      'Causes anxiety about future attacks',
    ],
  },
  {
    id: 'treatments',
    title: 'What treatments have you tried?',
    subtitle: 'Include anything: over-the-counter, prescription, lifestyle changes. Optional — skip if you haven\'t tried any yet.',
    type: 'text',
  },
  {
    id: 'goal',
    title: 'What do you most want from treatment?',
    type: 'options',
    options: [
      'Fewer migraine days overall',
      'Less severe migraines when they happen',
      'Being able to function through a migraine',
      'Reducing how much rescue medication I use',
    ],
  },
];

function frequencyFromJournalDays(days) {
  if (days >= 15) return '15+ days per month';
  if (days >= 8) return '8–14 days per month';
  if (days >= 4) return '4–7 days per month';
  return '1–3 days per month';
}

function generateDoctorQuestions(answers, journalStats) {
  const q = [];
  const freq = answers.frequency || '';
  const highFreq = freq.includes('8–14') || freq.includes('15+');

  if (highFreq) {
    q.push('Given my migraine frequency, am I a candidate for preventive therapy?');
  } else {
    q.push('At what point would my frequency make me a candidate for preventive therapy?');
  }

  const impacts = answers.impact || [];
  if (impacts.includes('Miss work or school') || impacts.includes("Can't care for family")) {
    q.push('What can we do to reduce how often migraines disrupt my ability to work and care for others?');
  }

  if (journalStats?.avgSeverity && parseFloat(journalStats.avgSeverity) >= 7) {
    q.push("My average pain severity is high — what options do I have when my current approach isn't controlling it?");
  }

  const goal = answers.goal || '';
  if (goal.includes('rescue medication')) {
    q.push('Is there a preventive option that could reduce how often I reach for rescue medication?');
  } else if (goal.includes('Fewer migraine days')) {
    q.push('What is a realistic target for how many migraine days I could reduce?');
  }

  if (q.length < 3) {
    q.push('What would you want to see at my next appointment to know we chose the right approach?');
  }

  return q.slice(0, 4);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntilDate(iso) {
  return Math.ceil((new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 864e5);
}

function generateSummary(answers, journalStats, txStatus) {
  const lines = ['MIGRAINE SUMMARY\nFor my healthcare provider\n'];

  if (journalStats && journalStats.daysLogged > 0) {
    lines.push('From my journal (last 30 days):');
    lines.push(`  Migraine days: ${journalStats.migraineDays} out of ${journalStats.daysLogged} days logged`);
    if (journalStats.avgSeverity) {
      lines.push(`  Average severity: ${journalStats.avgSeverity} / 10`);
    }
    if (journalStats.topTriggers.length > 0) {
      lines.push(`  Most common triggers: ${journalStats.topTriggers.join(', ')}`);
    }
    lines.push('');
  }

  lines.push(`Self-reported frequency: ${answers.frequency || 'Not specified'}`);
  if (answers.impact && answers.impact.length > 0) {
    lines.push(`Daily impact: ${answers.impact.join(', ')}`);
  }
  if (answers.treatments) {
    lines.push(`Treatments I have tried: ${answers.treatments}`);
  }
  if (answers.goal) {
    lines.push(`My treatment goal: ${answers.goal}`);
  }

  if (txStatus) {
    const paLines = [];
    if (txStatus.paStatus === 'denied') {
      paLines.push('Prior authorization status: DENIED — I need help with next steps');
    } else if (txStatus.paStatus === 'expired') {
      paLines.push('Prior authorization: EXPIRED — renewal needed');
    } else if (txStatus.paStatus === 'approved' && txStatus.paExpiryDate) {
      const days = daysUntilDate(txStatus.paExpiryDate);
      if (days <= 30) paLines.push(`Prior authorization expires: ${formatDate(txStatus.paExpiryDate)} (${days > 0 ? `${days} days` : 'EXPIRED'})`);
    } else if (txStatus.paStatus === 'pending') {
      paLines.push('Prior authorization: PENDING');
    }
    if (txStatus.refillDate) {
      const days = daysUntilDate(txStatus.refillDate);
      if (days <= 14) paLines.push(`Next refill due: ${formatDate(txStatus.refillDate)}${days <= 0 ? ' (OVERDUE)' : ''}`);
    }
    if (paLines.length > 0) {
      lines.push('');
      lines.push('Treatment access:');
      paLines.forEach(l => lines.push(`  ${l}`));
    }
  }

  lines.push('\nGenerated by Migraine Companion. For general informational purposes only. This is not a medical document.');
  return lines.join('\n');
}

export default function HCPPrepScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [editingFromDone, setEditingFromDone] = useState(false);
  const [journalStats, setJournalStats] = useState(null);
  const [lastPrepDate, setLastPrepDate] = useState(null);
  const [treatmentStatus, setTreatmentStatus] = useState(null);

  useEffect(() => {
    Promise.all([getJournalEntries(), getHCPAnswers(), getTreatmentStatus()]).then(([entries, savedPrep, txStatus]) => {
      setTreatmentStatus(txStatus);
      if (savedPrep) {
        setAnswers(prev => ({ ...savedPrep.answers, ...prev }));
        setLastPrepDate(savedPrep.savedAt);
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const recent = entries.filter(e => new Date(e.date) >= cutoff);
      const migraine = recent.filter(e => e.hadMigraine);

      const avgSeverity = migraine.length > 0
        ? (migraine.reduce((s, e) => s + (e.severity || 0), 0) / migraine.length).toFixed(1)
        : null;

      const trigCounts = {};
      migraine.flatMap(e => e.triggers || []).forEach(t => {
        trigCounts[t] = (trigCounts[t] || 0) + 1;
      });
      const topTriggers = Object.entries(trigCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

      const stats = {
        daysLogged: new Set(recent.map(e => new Date(e.date).toDateString())).size,
        migraineDays: new Set(migraine.map(e => new Date(e.date).toDateString())).size,
        avgSeverity,
        topTriggers,
      };
      setJournalStats(stats);

      if (stats.migraineDays > 0) {
        setAnswers(prev => ({
          ...prev,
          frequency: prev.frequency || frequencyFromJournalDays(stats.migraineDays),
        }));
      }
    });
  }, []);

  const s = STEPS[step];
  const progress = (step + 1) / STEPS.length;

  function pickOption(value) {
    setAnswers(prev => ({ ...prev, [s.id]: value }));
  }

  function toggleMulti(value) {
    setAnswers(prev => {
      const current = prev[s.id] || [];
      return {
        ...prev,
        [s.id]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  }

  function setText(value) {
    setAnswers(prev => ({ ...prev, [s.id]: value }));
  }

  function canProceed() {
    const val = answers[s.id];
    if (s.type === 'multiselect') return val && val.length > 0;
    if (s.type === 'text') return true;
    return !!val;
  }

  async function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await saveHCPAnswers(answers);
      setDone(true);
    }
  }

  async function handleShare() {
    const summary = generateSummary(answers, journalStats, treatmentStatus);
    try {
      await Share.share({ message: summary });
    } catch {
      Alert.alert('Could not share', 'Copy the text below and paste it in an email or message to your doctor.');
    }
  }

  if (done) {
    const summary = generateSummary(answers, journalStats, treatmentStatus);
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
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.resultBody} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            <Feather name="clipboard" size={28} color={colors.white} style={styles.resultIcon} />
            <Text style={styles.resultTitle}>Your appointment summary is ready</Text>
            <Text style={styles.resultDesc}>Share this with your doctor before or at your next appointment.</Text>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryBoxHint}>Tap and hold to select and copy text</Text>
            <Text style={styles.summaryText} selectable>{summary}</Text>
          </View>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Share summary with my doctor"
          >
            <Text style={styles.shareBtnText}>Share with my doctor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editAnswersBtn}
            onPress={() => { setDone(false); setStep(0); setEditingFromDone(true); }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Go back to edit your answers"
          >
            <Text style={styles.editAnswersTxt}>Edit answers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => { setStep(0); setAnswers({}); setDone(false); }}
            accessibilityRole="button"
            accessibilityLabel="Start HCP prep over"
          >
            <Text style={styles.ghostBtnText}>Start over</Text>
          </TouchableOpacity>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Questions for your doctor</Text>
            {generateDoctorQuestions(answers, journalStats).map((q, i) => (
              <View key={i} style={styles.tipQuestion}>
                <Text style={styles.tipQNum}>{i + 1}</Text>
                <Text style={styles.tipQText}>{q}</Text>
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
        <TouchableOpacity
          onPress={step === 0
            ? editingFromDone
              ? () => { setDone(true); setEditingFromDone(false); }
              : () => navigation.goBack()
            : () => setStep(step - 1)}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? (editingFromDone ? 'Back to results' : 'Go back') : 'Go back to previous step'}
        >
          <View style={sharedStyles.backRow}>
            <Feather name="arrow-left" size={16} color={colors.slateMid} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.stepMeta}>Step {step + 1} of {STEPS.length}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={styles.eyebrow}>HCP Prep</Text>
        <Text style={styles.question}>{s.title}</Text>
        {s.subtitle && <Text style={styles.subtitle}>{s.subtitle}</Text>}

        {step === 0 && lastPrepDate && (
          <View style={[styles.journalBadge, { backgroundColor: colors.lavPale, borderColor: colors.lavLight }]}>
            <Text style={[styles.journalBadgeTitle, { color: colors.lav }]}>
              Last completed {new Date(lastPrepDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <Text style={styles.journalBadgeBody}>Your previous answers are pre-filled. Update anything that has changed.</Text>
          </View>
        )}

        {s.id === 'frequency' && journalStats && journalStats.daysLogged > 0 && (
          <View style={styles.journalBadge}>
            <Text style={styles.journalBadgeTitle}>From your journal (last 30 days)</Text>
            <Text style={styles.journalBadgeBody}>
              {journalStats.migraineDays} migraine {journalStats.migraineDays === 1 ? 'day' : 'days'} out of {journalStats.daysLogged} logged
              {journalStats.avgSeverity ? `. Average severity: ${journalStats.avgSeverity}/10.` : '.'}
            </Text>
          </View>
        )}

        {s.type === 'options' && (
          <View style={styles.options}>
            {s.options.map(opt => {
              const selected = answers[s.id] === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, selected && styles.optionSel]}
                  onPress={() => pickOption(opt)}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityLabel={opt}
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.radio, selected && styles.radioSel]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.optText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {s.type === 'multiselect' && (
          <View style={styles.options}>
            {s.options.map(opt => {
              const selected = (answers[s.id] || []).includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, selected && styles.optionSel]}
                  onPress={() => toggleMulti(opt)}
                  activeOpacity={0.85}
                  accessibilityRole="checkbox"
                  accessibilityLabel={opt}
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxSel]}>
                    {selected && <Text style={{ color: colors.white, fontSize: textSize.bodyLarge }}>✓</Text>}
                  </View>
                  <Text style={styles.optText}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {s.type === 'text' && (
          <TextInput
            style={styles.textarea}
            value={answers[s.id] || ''}
            onChangeText={setText}
            placeholder="Type here…"
            placeholderTextColor={colors.slateLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel={s.title}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !canProceed() && { opacity: 0.35 }]}
          onPress={handleNext}
          disabled={!canProceed()}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={step === STEPS.length - 1 ? 'Generate summary' : 'Continue to next step'}
          accessibilityState={{ disabled: !canProceed() }}
        >
          <Text style={styles.btnText}>
            {step === STEPS.length - 1 ? 'Generate summary' : 'Continue'}
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
  backText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  progressBar: { height: 4, backgroundColor: colors.creamMid, borderRadius: radius.full, marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.lav, borderRadius: radius.full },
  stepMeta: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slateLight, textAlign: 'right' },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: 110 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.lav, marginBottom: 12,
  },
  question: { fontFamily: fonts.display, fontSize: textSize.display, lineHeight: 36, color: colors.slate, marginBottom: 8 },
  subtitle: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, marginBottom: spacing.lg },
  options: { gap: 10, marginTop: spacing.md },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, backgroundColor: colors.white,
  },
  optionSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSel: { borderColor: colors.lav, backgroundColor: colors.lav },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSel: { borderColor: colors.lav, backgroundColor: colors.lav },
  optText: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slate, flex: 1 },
  textarea: {
    backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, padding: 14, fontFamily: fonts.body, fontSize: textSize.bodyLarge,
    color: colors.slate, lineHeight: 24, minHeight: 120, marginTop: spacing.md,
  },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm },
  btn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  btnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  resultBody: { padding: spacing.lg, gap: spacing.sm },
  resultCard: { borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.lav },
  resultIcon: { marginBottom: 14 },
  resultTitle: { fontFamily: fonts.display, fontSize: textSize.headingLg, color: colors.white, textAlign: 'center', marginBottom: 10 },
  resultDesc: { fontFamily: fonts.body, fontSize: textSize.base, color: 'rgba(253,252,249,0.9)', textAlign: 'center', lineHeight: 22 },
  summaryBox: {
    backgroundColor: colors.cream, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryBoxHint: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, color: colors.slateLight,
    marginBottom: 10, letterSpacing: 0.3,
  },
  summaryText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, lineHeight: 22 },
  shareBtn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  shareBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  editAnswersBtn: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', marginBottom: 4,
  },
  editAnswersTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  doneBtn: {
    borderWidth: 1.5, borderColor: colors.lav, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', backgroundColor: colors.lavPale,
  },
  doneBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.lav },
  tipCard: {
    backgroundColor: colors.lavPale, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.lavLight,
  },
  tipTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.lav, marginBottom: 12 },
  tipQuestion: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tipQNum: {
    fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.lav,
    width: 18, marginTop: 2,
  },
  tipQText: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 22, flex: 1 },
  journalBadge: {
    backgroundColor: colors.sagePale, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: 12, padding: 13, marginBottom: spacing.md,
  },
  journalBadgeTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.sage, marginBottom: 4 },
  journalBadgeBody: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, lineHeight: 22 },
});
