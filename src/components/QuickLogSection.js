import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { saveJournalEntry } from '../services/storage';
import { colors, fonts, radius, textSize, shadows } from '../theme';

export default function QuickLogSection({ isLogged, onAddDetail, headerText, headerVariant = 'title', onSaved }) {
  const [quickMigraine, setQuickMigraine] = useState(null);
  const [quickSeverity, setQuickSeverity] = useState(5);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState(false);

  async function handleSave() {
    if (quickMigraine === null || quickSaving) return;
    setQuickSaving(true);
    setQuickError(false);
    try {
      await saveJournalEntry({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        hadMigraine: quickMigraine,
        severity: quickMigraine ? quickSeverity : null,
        treatments: '',
        functionalImpact: [],
        triggers: [],
      });
      if (onSaved) onSaved();
    } catch {
      setQuickError(true);
    } finally {
      setQuickSaving(false);
    }
  }

  if (isLogged) {
    return (
      <TouchableOpacity
        style={styles.quickLoggedCard}
        onPress={onAddDetail}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Today logged. Tap to add more detail."
      >
        <View style={styles.quickLoggedCheck}>
          <Feather name="check" size={13} color={colors.white} />
        </View>
        <Text style={styles.quickLoggedTxt}>Logged today</Text>
        <Text style={styles.quickLoggedCta}>Add detail →</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.quickLogCard}>
      {headerText ? (
        headerVariant === 'hint'
          ? <Text style={styles.quickLogHint}>{headerText}</Text>
          : <Text style={styles.quickLogTitle}>{headerText}</Text>
      ) : null}

      <View style={styles.quickLogToggle}>
        <TouchableOpacity
          style={[styles.quickLogOpt, quickMigraine === true && styles.quickLogMigraineActive]}
          onPress={() => setQuickMigraine(true)}
          activeOpacity={0.85}
          accessibilityRole="radio"
          accessibilityLabel="Migraine today"
          accessibilityState={{ checked: quickMigraine === true }}
        >
          <Text style={[styles.quickLogOptTxt, quickMigraine === true && { color: colors.terraDark }]}>Migraine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickLogOpt, quickMigraine === false && styles.quickLogClearActive]}
          onPress={() => setQuickMigraine(false)}
          activeOpacity={0.85}
          accessibilityRole="radio"
          accessibilityLabel="Clear day"
          accessibilityState={{ checked: quickMigraine === false }}
        >
          <Text style={[styles.quickLogOptTxt, quickMigraine === false && { color: colors.sageDark }]}>Clear day</Text>
        </TouchableOpacity>
      </View>

      {quickMigraine && (
        <View style={styles.quickSevWrap}>
          <View style={styles.quickSevHeader}>
            <Text style={styles.quickSevLabel}>Severity</Text>
            <Text style={styles.quickSevRange}>1 = mild  ·  10 = severe</Text>
          </View>
          {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
            <View key={ri} style={styles.quickSevRow}>
              {row.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.quickSevBtn, quickSeverity === n && styles.quickSevBtnActive]}
                  onPress={() => setQuickSeverity(n)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Severity ${n}`}
                  accessibilityState={{ checked: quickSeverity === n }}
                >
                  <Text style={[styles.quickSevTxt, quickSeverity === n && styles.quickSevTxtActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}

      {quickError && (
        <Text style={styles.quickErrorTxt}>Couldn't save. Try again or use the full Journal tab.</Text>
      )}

      <TouchableOpacity
        style={[styles.quickSaveBtn, (quickMigraine === null || quickSaving) && { opacity: 0.35 }]}
        onPress={handleSave}
        disabled={quickMigraine === null || quickSaving}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Save today's log"
        accessibilityState={{ disabled: quickMigraine === null || quickSaving }}
      >
        <Text style={styles.quickSaveTxt}>{quickSaving ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  quickLogCard: {
    ...shadows.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 18, marginBottom: 10,
  },
  quickLogTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, marginBottom: 12 },
  quickLogHint: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 22, marginBottom: 12 },
  quickLogToggle: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickLogOpt: { flex: 1, paddingVertical: 11, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, alignItems: 'center' },
  quickLogMigraineActive: { borderColor: colors.terra, backgroundColor: colors.terraPale },
  quickLogClearActive: { borderColor: colors.sage, backgroundColor: colors.sagePale },
  quickLogOptTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },
  quickSevWrap: { marginTop: 12, marginBottom: 4 },
  quickSevHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  quickSevLabel: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateMid },
  quickSevRange: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight },
  quickSevRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  quickSevBtn: { flex: 1, paddingVertical: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 9, alignItems: 'center' },
  quickSevBtnActive: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  quickSevTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },
  quickSevTxtActive: { fontFamily: fonts.bodyMedium, color: colors.lav },
  quickErrorTxt: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.terraDark, marginTop: 8 },
  quickSaveBtn: {
    backgroundColor: colors.lav, borderRadius: radius.full,
    paddingVertical: 12, alignItems: 'center', marginTop: 12,
  },
  quickSaveTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.white },
  quickLoggedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 10,
  },
  quickLoggedCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  quickLoggedTxt: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate },
  quickLoggedCta: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.lav },
});
