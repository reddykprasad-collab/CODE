import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getMedicationHistory, saveMedicationEntry, deleteMedicationEntry } from '../services/storage';
import { colors, fonts, spacing, radius, textSize, shadows } from '../theme';

const REASON_OPTIONS = [
  { key: 'worked',       label: 'It worked',    bg: colors.sagePale,  text: colors.sageDark },
  { key: 'still_taking', label: 'Still taking',  bg: colors.lavPale,   text: colors.lav },
  { key: 'side_effects', label: 'Side effects',  bg: '#1C1508',        text: colors.amber },
  { key: 'ineffective',  label: "Didn't work",   bg: colors.terraPale, text: colors.terraDark },
  { key: 'cost',         label: 'Cost/access',   bg: colors.creamMid,  text: colors.slateLight },
  { key: 'other',        label: 'Other',         bg: colors.creamMid,  text: colors.slateMid },
];

function reasonMeta(key) {
  return REASON_OPTIONS.find(r => r.key === key) || REASON_OPTIONS[REASON_OPTIONS.length - 1];
}

const EMPTY_FORM = {
  id: null,
  name: '',
  startDate: '',
  endDate: '',
  reason: null,
  notes: '',
};

export default function MedicationHistoryScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getMedicationHistory().then(setEntries);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAddForm() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(entry) {
    setForm({
      id: entry.id,
      name: entry.name,
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
      reason: entry.reason || null,
      notes: entry.notes || '',
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (form.name.trim() === '') {
      Alert.alert('Name required', 'Please enter a medication name before saving.', [{ text: 'OK' }]);
      return;
    }
    setSaving(true);
    try {
      const entry = {
        id: form.id ?? Date.now().toString(),
        name: form.name.trim(),
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        reason: form.reason,
        notes: form.notes.trim(),
      };
      const updated = await saveMedicationEntry(entry);
      setEntries(updated);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch {
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id, name) {
    Alert.alert(
      'Remove medication?',
      `"${name}" will be removed from your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deleteMedicationEntry(id);
              setEntries(updated);
            } catch {
              Alert.alert('Could not delete', 'Something went wrong. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>My medications</Text>
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
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          A record of treatments you've tried. Useful for doctor visits and insurance paperwork.
        </Text>

        {!showForm && (
          <>
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="list" size={40} color={colors.slateLight} />
                <Text style={styles.emptyTitle}>No medications logged yet</Text>
                <Text style={styles.emptyBody}>
                  Keep a record of what you've tried — it's handy when talking to your doctor.
                </Text>
                <TouchableOpacity
                  style={styles.addFirstBtn}
                  onPress={openAddForm}
                  accessibilityRole="button"
                  accessibilityLabel="Add your first medication"
                >
                  <Text style={styles.addFirstBtnTxt}>Add your first</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {entries.map(entry => {
                  const meta = reasonMeta(entry.reason);
                  const dateRange = [entry.startDate, entry.endDate]
                    .filter(Boolean)
                    .join(' – ') || null;
                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[styles.entryCard, shadows.sm]}
                      onPress={() => openEditForm(entry)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${entry.name}`}
                    >
                      <View style={styles.entryMain}>
                        <View style={styles.entryTextBlock}>
                          <Text style={styles.entryName}>{entry.name}</Text>
                          {dateRange ? (
                            <Text style={styles.entryDate}>{dateRange}</Text>
                          ) : null}
                        </View>
                        <View style={styles.entryActions}>
                          {entry.reason ? (
                            <View style={[styles.reasonBadge, { backgroundColor: meta.bg }]}>
                              <Text style={[styles.reasonBadgeText, { color: meta.text }]}>
                                {meta.label}
                              </Text>
                            </View>
                          ) : null}
                          <TouchableOpacity
                            onPress={() => handleDelete(entry.id, entry.name)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${entry.name}`}
                          >
                            <Feather name="trash-2" size={16} color={colors.slateLight} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {entries.length > 0 && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={openAddForm}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Add medication"
              >
                <Text style={styles.addBtnTxt}>Add medication</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {showForm && (
          <View style={[styles.formCard, shadows.sm]}>
            <Text style={styles.formSectionLabel}>
              {form.id ? 'EDIT MEDICATION' : 'ADD MEDICATION'}
            </Text>

            <Text style={styles.fieldLabel}>Medication name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Aimovig, Topamax, Sumatriptan"
              placeholderTextColor={colors.slateLight}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              accessibilityLabel="Medication name"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Start date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Jan 2024"
              placeholderTextColor={colors.slateLight}
              value={form.startDate}
              onChangeText={v => setForm(f => ({ ...f, startDate: v }))}
              accessibilityLabel="Start date"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>End date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Mar 2024 (or leave blank if still taking)"
              placeholderTextColor={colors.slateLight}
              value={form.endDate}
              onChangeText={v => setForm(f => ({ ...f, endDate: v }))}
              accessibilityLabel="End date"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Why did you stop? (optional)</Text>
            <View style={styles.reasonRow}>
              {REASON_OPTIONS.map(option => {
                const active = form.reason === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.reasonChip,
                      active && { backgroundColor: option.bg, borderColor: option.text },
                    ]}
                    onPress={() =>
                      setForm(f => ({ ...f, reason: active ? null : option.key }))
                    }
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.reasonChipTxt,
                        active && { color: option.text, fontFamily: fonts.bodyMedium },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              placeholder="Any additional details..."
              placeholderTextColor={colors.slateLight}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              accessibilityLabel="Notes"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
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

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={cancelForm}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
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
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: 32,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slateMid,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.base,
    color: colors.slate,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slateMid,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  addFirstBtn: {
    backgroundColor: colors.lav,
    borderRadius: radius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  addFirstBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.base,
    color: colors.white,
  },

  // Entry cards
  entryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  entryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  entryTextBlock: {
    flex: 1,
    gap: 2,
  },
  entryName: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.base,
    color: colors.slate,
  },
  entryDate: {
    fontFamily: fonts.body,
    fontSize: textSize.label,
    color: colors.slateLight,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reasonBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reasonBadgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.fine,
  },

  // Add button
  addBtn: {
    backgroundColor: colors.lav,
    borderRadius: radius.full,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.base,
    color: colors.white,
  },

  // Form
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  formSectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: textSize.fine,
    color: colors.slateLight,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.label,
    color: colors.slateMid,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slate,
  },
  notesInput: {
    minHeight: 80,
  },

  // Reason chips
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reasonChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.cream,
  },
  reasonChipTxt: {
    fontFamily: fonts.body,
    fontSize: textSize.label,
    color: colors.slateMid,
  },

  // Save / Cancel
  saveBtn: {
    backgroundColor: colors.lav,
    borderRadius: radius.full,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.base,
    color: colors.white,
  },
  cancelBtn: {
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnTxt: {
    fontFamily: fonts.body,
    fontSize: textSize.base,
    color: colors.slateMid,
  },
});
