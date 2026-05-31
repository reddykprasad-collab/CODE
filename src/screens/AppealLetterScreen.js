import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Alert, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getJournalEntries, getMidasScores, getTreatmentStartDate } from '../services/storage';
import { generateAppealLetter } from '../services/claude';
import { colors, fonts, spacing, radius, textSize } from '../theme';

export default function AppealLetterScreen({ navigation }) {
  const [denialReason, setDenialReason]       = useState('');
  const [priorTreatments, setPriorTreatments] = useState('');
  const [generating, setGenerating]           = useState(false);
  const [letterText, setLetterText]           = useState(null);
  const [patientData, setPatientData]         = useState({});

  useEffect(() => {
    (async () => {
      const [entries, midasScores, treatmentStart] = await Promise.all([
        getJournalEntries(), getMidasScores(), getTreatmentStartDate(),
      ]);

      // Migraine days per month from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);
      const migraineDays = new Set(
        recent.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())
      ).size;

      const severities = recent.filter(e => e.hadMigraine && e.severity).map(e => e.severity);
      const avgSeverity = severities.length > 0
        ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)
        : null;

      const latestMidas = midasScores?.[0] ?? null;

      const treatmentDaysIn = treatmentStart
        ? Math.floor((Date.now() - new Date(treatmentStart)) / 864e5)
        : null;

      setPatientData({
        migraineDaysPerMonth: migraineDays > 0 ? migraineDays : null,
        avgSeverity,
        midasTotal: latestMidas?.total ?? null,
        midasLabel: latestMidas?.label ?? null,
        treatmentDaysIn,
      });
    })();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = {
        ...patientData,
        denialReason: denialReason.trim() || null,
        priorTreatments: priorTreatments.trim() || null,
      };
      const text = await generateAppealLetter(data);
      setLetterText(text);
    } catch {
      Alert.alert(
        'Could not generate letter',
        'Check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleShare() {
    try {
      await Share.share({ message: letterText });
    } catch {}
  }

  function handleRegenerate() {
    setLetterText(null);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Appeal letter</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color={colors.slateLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          We'll draft an appeal letter based on your migraine data. Add any context below.
        </Text>

        {letterText === null ? (
          <>
            <Text style={styles.sectionLabel}>REASON FOR DENIAL (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. step therapy not completed, not medically necessary"
              placeholderTextColor={colors.slateLight}
              value={denialReason}
              onChangeText={setDenialReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Reason for denial"
            />

            <Text style={styles.sectionLabel}>PRIOR TREATMENTS TRIED (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. topiramate, amitriptyline, propranolol"
              placeholderTextColor={colors.slateLight}
              value={priorTreatments}
              onChangeText={setPriorTreatments}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Prior treatments tried"
            />

            {generating ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.lav} />
                <Text style={styles.loadingText}>Drafting your letter…</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleGenerate}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Generate draft"
              >
                <Text style={styles.primaryBtnTxt}>Generate draft</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>DRAFT APPEAL LETTER</Text>
            <View style={styles.letterBox}>
              <Text
                style={styles.letterText}
                selectable
              >
                {letterText}
              </Text>
            </View>
            <Text style={styles.selectHint}>Tap and hold to select and copy text</Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleShare}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Share letter"
            >
              <Text style={styles.primaryBtnTxt}>Share letter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleRegenerate}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Regenerate letter"
            >
              <Text style={styles.secondaryBtnTxt}>Regenerate</Text>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Review before sending. This is a draft — have your doctor review if possible.
            </Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: textSize.display,
    color: colors.slate,
  },

  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 32 },

  subtitle: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slateMid,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: textSize.fine,
    color: colors.slateLight,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slate,
    minHeight: 88,
    marginBottom: spacing.lg,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slateLight,
  },

  primaryBtn: {
    backgroundColor: colors.lav,
    borderRadius: radius.full,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.base,
    color: colors.white,
  },

  letterBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  letterText: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slate,
    lineHeight: 24,
  },
  selectHint: {
    fontFamily: fonts.body,
    fontSize: textSize.fine,
    color: colors.slateLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  secondaryBtn: {
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  secondaryBtnTxt: {
    fontFamily: fonts.body,
    fontSize: textSize.base,
    color: colors.slateLight,
  },

  footerNote: {
    fontFamily: fonts.body,
    fontSize: textSize.fine,
    color: colors.slateLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});
