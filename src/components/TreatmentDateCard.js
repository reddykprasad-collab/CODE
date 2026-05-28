import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, textSize } from '../theme';
import DateSpinnerPicker from './DateSpinnerPicker';

const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function defaultDraft() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

export default function TreatmentDateCard({ startDate, onSave }) {
  const now = new Date();
  const [editing, setEditing] = useState(!startDate);
  const [draft, setDraft] = useState(() => startDate ? new Date(startDate) : defaultDraft());

  const minDate = new Date(now.getFullYear() - 3, 0, 1);
  const maxDate = now;

  if (!editing && startDate) {
    const d = new Date(startDate);
    const daysAgo = Math.floor((now - d) / 864e5);
    return (
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="calendar" size={14} color={colors.slateLight} />
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>Treatment started</Text>
          <Text style={styles.date}>
            {MONTHS_LONG[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
            <Text style={styles.ago}>  ·  {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setEditing(true)}
          accessibilityRole="button"
          accessibilityLabel="Change treatment start date"
        >
          <Text style={styles.editTxt}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
      <Text style={styles.prompt}>When did you start treatment?</Text>
      <DateSpinnerPicker value={draft} onChange={setDraft} minDate={minDate} maxDate={maxDate} />
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => { onSave(draft.toISOString()); setEditing(false); }}
          activeOpacity={0.88}
          accessibilityRole="button"
        >
          <Text style={styles.saveTxt}>Set start date</Text>
        </TouchableOpacity>
        {startDate && (
          <TouchableOpacity
            onPress={() => setEditing(false)}
            style={styles.cancelBtn}
            accessibilityRole="button"
          >
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: colors.creamMid, alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  label: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.slateLight, marginBottom: 2 },
  date: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate },
  ago: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateLight },
  editTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.lav },
  prompt: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: colors.lav, borderRadius: radius.full,
    paddingVertical: 11, alignItems: 'center',
  },
  saveTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 14, justifyContent: 'center' },
  cancelTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight },
});
