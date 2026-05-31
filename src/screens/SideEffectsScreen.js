import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getSideEffects, saveSideEffect } from '../services/storage';
import { colors, fonts, spacing, radius, textSize, shadows } from '../theme';

const SYMPTOM_OPTIONS = [
  'Injection site reaction',
  'Fatigue',
  'Mood changes',
  'Nausea or stomach upset',
  'Hair changes',
  'Other',
];

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function SideEffectsScreen({ navigation }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const todayStr = useMemo(() => new Date().toDateString(), []);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    getSideEffects().then(entries => {
      const todayEntry = entries.find(e => new Date(e.date).toDateString() === todayStr);
      if (todayEntry) {
        setExistingId(todayEntry.id);
        setSelectedSymptoms(todayEntry.symptoms || []);
        setNoteText(todayEntry.note || '');
      }
    });
  }, [todayStr]);

  function toggleSymptom(symptom) {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  }

  async function handleSave() {
    if (selectedSymptoms.length === 0 && noteText.trim() === '') {
      Alert.alert(
        'Nothing to save',
        'Log at least one symptom or add a note before saving.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSaving(true);
    try {
      await saveSideEffect({
        id: existingId ?? Date.now().toString(),
        date: new Date().toISOString(),
        symptoms: selectedSymptoms,
        note: noteText.trim(),
      });
      navigation.goBack();
    } catch {
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Side effects today</Text>
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
          Track how you're feeling since starting treatment. This helps your doctor.
        </Text>

        <Text style={styles.dateLabel}>
          Today, {formatDateLabel(today)}
        </Text>

        <Text style={styles.sectionLabel}>SYMPTOMS TODAY</Text>

        <View style={styles.checkboxList}>
          {SYMPTOM_OPTIONS.map(symptom => {
            const selected = selectedSymptoms.includes(symptom);
            return (
              <TouchableOpacity
                key={symptom}
                style={[styles.checkboxRow, selected && styles.checkboxRowSelected]}
                onPress={() => toggleSymptom(symptom)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityLabel={symptom}
                accessibilityState={{ checked: selected }}
              >
                <Feather
                  name={selected ? 'check-square' : 'square'}
                  size={20}
                  color={selected ? colors.lav : colors.slateLight}
                />
                <Text style={[styles.checkboxLabel, selected && styles.checkboxLabelSelected]}>
                  {symptom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.noteInput}
          placeholder="Any other notes (optional)"
          placeholderTextColor={colors.slateLight}
          value={noteText}
          onChangeText={setNoteText}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          accessibilityLabel="Optional notes"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Saving…' : 'Save'}
        >
          <Text style={styles.saveBtnTxt}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>

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
    marginBottom: spacing.md,
  },

  dateLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.label,
    color: colors.slateLight,
    marginBottom: spacing.lg,
  },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: textSize.fine,
    color: colors.slateLight,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  checkboxList: {
    ...shadows.sm,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamMid,
  },
  checkboxRowSelected: {
    backgroundColor: colors.lavPale,
  },
  checkboxLabel: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slate,
    flex: 1,
  },
  checkboxLabelSelected: {
    fontFamily: fonts.bodyMedium,
    color: colors.lav,
  },

  noteInput: {
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

  saveBtn: {
    backgroundColor: colors.lav,
    borderRadius: radius.full,
    paddingVertical: 17,
    alignItems: 'center',
  },
  saveBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.base,
    color: colors.white,
  },
});
