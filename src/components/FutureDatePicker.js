import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radius, textSize } from '../theme';
import DateSpinnerPicker from './DateSpinnerPicker';

export default function FutureDatePicker({ label, date, onSave, onCancel }) {
  const now = new Date();
  const initial = date ? new Date(date) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d; })();
  const [draft, setDraft] = useState(initial);

  const minDate = new Date(now.getFullYear() - 1, 0, 1);
  const maxDate = new Date(now.getFullYear() + 5, 11, 31);

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <DateSpinnerPicker value={draft} onChange={setDraft} minDate={minDate} maxDate={maxDate} />
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => onSave(draft.toISOString())}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Save date"
        >
          <Text style={styles.saveTxt}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  label: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: colors.lav, borderRadius: radius.full,
    paddingVertical: 11, alignItems: 'center',
  },
  saveTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 14, justifyContent: 'center' },
  cancelTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight },
});
