import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, textSize } from '../theme';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Shared spinner date picker. Parent controls constraints via minDate/maxDate.
export default function DateSpinnerPicker({ value, onChange, minDate = null, maxDate = null }) {
  function clamp(d) {
    if (minDate && d < minDate) return new Date(minDate);
    if (maxDate && d > maxDate) return new Date(maxDate);
    return d;
  }

  function adjustMonth(delta) {
    let m = value.getMonth() + delta;
    let y = value.getFullYear();
    if (m < 0) { m = 11; y--; }
    else if (m > 11) { m = 0; y++; }
    const day = Math.min(value.getDate(), new Date(y, m + 1, 0).getDate());
    onChange(clamp(new Date(y, m, day)));
  }

  function adjustDay(delta) {
    const maxDay = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
    const day = Math.max(1, Math.min(maxDay, value.getDate() + delta));
    onChange(clamp(new Date(value.getFullYear(), value.getMonth(), day)));
  }

  function adjustYear(delta) {
    const y = value.getFullYear() + delta;
    const day = Math.min(value.getDate(), new Date(y, value.getMonth() + 1, 0).getDate());
    onChange(clamp(new Date(y, value.getMonth(), day)));
  }

  const cols = [
    { label: 'Month', val: MONTHS_SHORT[value.getMonth()], up: () => adjustMonth(1), dn: () => adjustMonth(-1) },
    { label: 'Day',   val: String(value.getDate()).padStart(2, '0'), up: () => adjustDay(1),   dn: () => adjustDay(-1) },
    { label: 'Year',  val: value.getFullYear(), up: () => adjustYear(1),  dn: () => adjustYear(-1) },
  ];

  return (
    <View style={styles.picker}>
      {cols.map((col, i) => (
        <React.Fragment key={col.label}>
          {i > 0 && <Text style={styles.sep}>/</Text>}
          <View style={styles.col}>
            <TouchableOpacity onPress={col.up} style={styles.arrow} accessibilityRole="button" accessibilityLabel={`Increase ${col.label}`}>
              <Feather name="chevron-up" size={18} color={colors.lav} />
            </TouchableOpacity>
            <Text style={styles.val}>{col.val}</Text>
            <TouchableOpacity onPress={col.dn} style={styles.arrow} accessibilityRole="button" accessibilityLabel={`Decrease ${col.label}`}>
              <Feather name="chevron-down" size={18} color={colors.lav} />
            </TouchableOpacity>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  col: { alignItems: 'center', minWidth: 68 },
  arrow: { padding: 8 },
  val: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.heading,
    color: colors.slate,
    lineHeight: 28,
    textAlign: 'center',
  },
  sep: {
    fontFamily: fonts.body,
    fontSize: textSize.title,
    color: colors.border,
    marginHorizontal: 2,
    paddingBottom: 2,
  },
});
