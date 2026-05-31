import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getTreatmentStartDate, setTreatmentStartDate } from '../services/storage';
import { colors, fonts, spacing, radius, textSize } from '../theme';

const TOOLS = [
  {
    icon: 'help-circle',
    label: 'Candidacy Assessment',
    desc: 'Answer 5 questions to see if preventive therapy may be right for you.',
    detail: '5 questions · 2 min',
    accent: colors.lav,
    bg: colors.lavPale,
    border: colors.lavLight,
    route: 'Assessment',
  },
  {
    icon: 'clipboard',
    label: 'HCP Prep',
    desc: 'Build a one-page summary of your migraine history, ready to hand to your doctor.',
    detail: 'Based on your journal data',
    accent: colors.lav,
    bg: colors.white,
    border: colors.border,
    route: 'HCPPrep',
  },
  {
    icon: 'trending-up',
    label: 'My Trends',
    desc: 'View your 28-day pattern, top triggers, day-of-week breakdown, and treatment progress.',
    detail: 'Updated from your journal',
    accent: colors.lav,
    bg: colors.white,
    border: colors.border,
    route: 'Trends',
  },
  {
    icon: 'activity',
    label: 'MIDAS Check-In',
    desc: 'A 5-question validated scale that measures how much migraines are affecting your daily life. Run monthly.',
    detail: '5 questions · 2 min',
    accent: colors.terraDark,
    bg: colors.terraPale,
    border: colors.terraBorder,
    route: 'Midas',
  },
];

export default function ToolsScreen({ navigation }) {
  const [treatmentStart, setTreatmentStart] = useState(null);
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      getTreatmentStartDate().then(setTreatmentStart);
    }, [])
  );

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();

  function adjustMonth(delta) {
    let m = dateDraft.getMonth() + delta, y = dateDraft.getFullYear();
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    const target = new Date(y, m, 1);
    if (target > now) return;
    setDateDraft(new Date(y, m, Math.min(dateDraft.getDate(), new Date(y, m + 1, 0).getDate())));
  }
  function adjustDay(delta) {
    const maxDay = new Date(dateDraft.getFullYear(), dateDraft.getMonth() + 1, 0).getDate();
    const d = new Date(dateDraft.getFullYear(), dateDraft.getMonth(), Math.max(1, Math.min(maxDay, dateDraft.getDate() + delta)));
    if (d > now) return;
    setDateDraft(d);
  }
  function adjustYear(delta) {
    const y = dateDraft.getFullYear() + delta;
    if (y < now.getFullYear() - 3 || y > now.getFullYear()) return;
    const d = new Date(y, dateDraft.getMonth(), Math.min(dateDraft.getDate(), new Date(y, dateDraft.getMonth() + 1, 0).getDate()));
    if (d > now) return;
    setDateDraft(d);
  }
  async function saveDateDraft() {
    await setTreatmentStartDate(dateDraft.toISOString());
    setTreatmentStart(dateDraft.toISOString());
    setEditingDate(false);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>Understand your patterns and prepare for appointments.</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {TOOLS.map(tool => (
          <TouchableOpacity
            key={tool.route}
            style={styles.toolCard}
            onPress={() => navigation.navigate(tool.route)}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel={tool.label}
          >
            <View style={styles.toolTop}>
              <View style={[styles.toolIconWrap, { backgroundColor: tool.bg }]}>
                <Feather name={tool.icon} size={22} color={tool.accent} />
              </View>
              <View style={styles.toolDetailPill}>
                <Text style={[styles.toolDetailTxt, { color: tool.accent }]}>{tool.detail}</Text>
              </View>
            </View>
            <Text style={styles.toolLabel}>{tool.label}</Text>
            <Text style={styles.toolDesc}>{tool.desc}</Text>
            <View style={styles.toolFooter}>
              <Text style={[styles.toolCta, { color: tool.accent }]}>Open</Text>
              <Feather name="arrow-right" size={15} color={tool.accent} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Treatment settings */}
        <Text style={styles.settingsSectionLabel}>Settings</Text>
        <TouchableOpacity
          style={styles.settingsCard}
          onPress={() => {
            if (treatmentStart) setDateDraft(new Date(treatmentStart));
            setEditingDate(e => !e);
          }}
          accessibilityRole="button"
          accessibilityLabel="Set treatment start date"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsCardTitle}>Treatment start date</Text>
            <Text style={styles.settingsCardValue}>
              {treatmentStart
                ? new Date(treatmentStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'Not set'}
            </Text>
          </View>
          <Feather name={editingDate ? 'chevron-up' : 'edit-2'} size={15} color={colors.lav} />
        </TouchableOpacity>

        {editingDate && (
          <View style={styles.datePickerCard}>
            <View style={styles.datePicker}>
              {[
                { label: 'Month', val: MONTHS_SHORT[dateDraft.getMonth()], up: () => adjustMonth(1), dn: () => adjustMonth(-1) },
                { label: 'Day',   val: String(dateDraft.getDate()).padStart(2,'0'), up: () => adjustDay(1),   dn: () => adjustDay(-1) },
                { label: 'Year',  val: dateDraft.getFullYear(), up: () => adjustYear(1),  dn: () => adjustYear(-1) },
              ].map((col, i) => (
                <React.Fragment key={col.label}>
                  {i > 0 && <Text style={styles.dateSep}>/</Text>}
                  <View style={styles.dateCol}>
                    <TouchableOpacity onPress={col.up} style={styles.dateArrow} accessibilityRole="button" accessibilityLabel={`Increase ${col.label}`}>
                      <Feather name="chevron-up" size={18} color={colors.lav} />
                    </TouchableOpacity>
                    <Text style={styles.dateVal}>{col.val}</Text>
                    <TouchableOpacity onPress={col.dn} style={styles.dateArrow} accessibilityRole="button" accessibilityLabel={`Decrease ${col.label}`}>
                      <Feather name="chevron-down" size={18} color={colors.lav} />
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </View>
            <TouchableOpacity style={styles.setDateBtn} onPress={saveDateDraft} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel="Save treatment start date">
              <Text style={styles.setDateTxt}>Save date</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('PrivacyPolicy')}
          style={styles.privacyLink}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel="View privacy policy"
        >
          <Text style={styles.privacyTxt}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Onboarding')}
          style={styles.privacyLink}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel="Revisit onboarding"
        >
          <Text style={styles.privacyTxt}>Revisit Onboarding</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  title: { fontFamily: fonts.display, fontSize: textSize.displayLg, color: colors.slate },
  subtitle: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, marginTop: 4, lineHeight: 22 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  toolCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 12,
  },
  toolTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toolIconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  toolDetailPill: {
    borderRadius: radius.full,
    paddingHorizontal: 11, paddingVertical: 5,
    backgroundColor: colors.creamMid,
  },
  toolDetailTxt: {
    fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.slateMid,
  },
  toolLabel: {
    fontFamily: fonts.display, fontSize: textSize.headingLg,
    lineHeight: 32, color: colors.slate, marginBottom: 6,
  },
  toolDesc: {
    fontFamily: fonts.body, fontSize: textSize.body,
    color: colors.slateMid, lineHeight: 22,
    marginBottom: 18,
  },
  toolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolCta: {
    fontFamily: fonts.bodyMedium, fontSize: textSize.body,
  },

  settingsSectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateLight,
    marginBottom: 10, marginTop: 8,
  },
  settingsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  settingsCardTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.slate, marginBottom: 3 },
  settingsCardValue: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight },

  datePickerCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  dateCol: { alignItems: 'center', minWidth: 68 },
  dateArrow: { padding: 8 },
  dateVal: {
    fontFamily: fonts.bodyMedium, fontSize: textSize.heading,
    color: colors.slate, lineHeight: 28, textAlign: 'center',
  },
  dateSep: {
    fontFamily: fonts.body, fontSize: textSize.title, color: colors.border, marginHorizontal: 2,
  },
  setDateBtn: {
    backgroundColor: colors.lav, borderRadius: radius.full, paddingVertical: 11, alignItems: 'center',
  },
  setDateTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },

  privacyLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  privacyTxt: {
    fontFamily: fonts.body, fontSize: textSize.caption,
    color: colors.slateLight, textDecorationLine: 'underline',
  },
});
