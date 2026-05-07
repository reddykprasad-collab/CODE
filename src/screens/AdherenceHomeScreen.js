import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getStreak, confirmDose, getJournalEntries } from '../services/storage';
import { colors, fonts, spacing, radius } from '../theme';

export default function AdherenceHomeScreen({ navigation }) {
  const [streak, setStreak] = useState({ count: 0, lastConfirmed: null });
  const [weekSummary, setWeekSummary] = useState(null);
  const [doseConfirmedToday, setDoseConfirmedToday] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toDateString();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await getStreak();
        setStreak(s);
        setDoseConfirmedToday(s.lastConfirmed ? new Date(s.lastConfirmed).toDateString() === today : false);

        const entries = await getJournalEntries();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekEntries = entries.filter(e => new Date(e.date) >= weekAgo);
        const migraineCount = new Set(
          weekEntries.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())
        ).size;
        const totalDays = new Set(weekEntries.map(e => new Date(e.date).toDateString())).size;
        setWeekSummary({ count: migraineCount, total: totalDays });
      })();
    }, [])
  );

  async function handleConfirm() {
    const newStreak = await confirmDose();
    setStreak(newStreak);
    setDoseConfirmedToday(true);
    Alert.alert('Dose confirmed ✓', `Keep it up! You're on a ${newStreak.count}-day streak!`);
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.greetingSm}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        <Text style={styles.greeting}>{greeting}, <Text style={styles.greetingItalic}>Jordan</Text></Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* streak card */}
        <LinearGradient colors={['#25233A', '#352D55']} style={styles.streakCard}>
          <View style={styles.streakBlob} />
          {streak.count >= 7 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 On a roll</Text>
            </View>
          )}
          <Text style={styles.streakNum}>
            {streak.count}
            <Text style={styles.streakUnit}> days</Text>
          </Text>
          <Text style={styles.streakSub}>consecutive doses confirmed</Text>
        </LinearGradient>

        {/* dose reminder */}
        <View style={[styles.remindCard, doseConfirmedToday && styles.remindCardDone]}>
          <View>
            <Text style={[styles.remindLbl, doseConfirmedToday && { color: colors.sage }]}>
              {doseConfirmedToday ? 'Done today ✓' : "Today's reminder"}
            </Text>
            <Text style={styles.remindTxt}>Morning dose</Text>
          </View>
          {!doseConfirmedToday && (
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>✓ Confirm</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* action grid */}
        <View style={styles.actionGrid}>
          {[
            { icon: '📓', label: 'Log today', onPress: () => navigation.navigate('Journal') },
            { icon: '💬', label: 'Ask companion', onPress: () => navigation.navigate('Chat') },
            { icon: '🔔', label: 'Reminders', onPress: () => navigation.navigate('Reminders') },
            { icon: '📈', label: 'View trends', onPress: () => navigation.navigate('Trends') },
          ].map((a, i) => (
            <TouchableOpacity key={i} style={styles.actionTile} onPress={a.onPress} activeOpacity={0.85}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* weekly summary */}
        {weekSummary !== null && (
          <>
            <Text style={styles.sectionLabel}>This week</Text>
            <View style={styles.card}>
              <Text style={styles.cardEy}>Weekly summary</Text>
              <Text style={styles.cardTitle}>
                {weekSummary.count === 0
                  ? 'No migraine days logged this week'
                  : `${weekSummary.count} migraine ${weekSummary.count === 1 ? 'day' : 'days'} this week`}
              </Text>
              <Text style={styles.cardDesc}>
                {weekSummary.total === 0
                  ? 'Start logging in the Journal tab to see your trends here.'
                  : 'Keep logging daily to build a clearer picture for your doctor.'}
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 4 },
  greetingSm: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.5,
    color: colors.slateLight, textTransform: 'uppercase', marginBottom: 4,
  },
  greeting: { fontFamily: fonts.display, fontSize: 28, color: colors.slate },
  greetingItalic: { fontFamily: fonts.displayItalic, color: colors.lav },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  streakCard: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, overflow: 'hidden' },
  streakBlob: {
    position: 'absolute', right: -24, top: -24, width: 140, height: 140,
    backgroundColor: 'rgba(142,125,196,0.18)', borderRadius: 70,
  },
  streakBadge: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(142,125,196,0.28)', borderWidth: 1,
    borderColor: 'rgba(142,125,196,0.45)', borderRadius: radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  streakBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.lavLight },
  streakNum: { fontFamily: fonts.bodyMedium, fontSize: 58, color: 'white', lineHeight: 62 },
  streakUnit: { fontFamily: fonts.body, fontSize: 18, color: 'rgba(255,255,255,0.45)' },
  streakSub: { fontFamily: fonts.body, fontSize: 17, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  remindCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.sagePale, borderWidth: 1, borderColor: colors.sageBorder,
    borderRadius: radius.lg, padding: 16, marginBottom: spacing.sm,
  },
  remindCardDone: { backgroundColor: '#EAF5F2' },
  remindLbl: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.sage, marginBottom: 3,
  },
  remindTxt: { fontFamily: fonts.body, fontSize: 17, color: colors.slate },
  confirmBtn: {
    backgroundColor: colors.sage, borderRadius: radius.full,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  confirmBtnText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: 'white' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: spacing.sm },
  actionTile: {
    width: '48%', backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
    borderRadius: 18, padding: 18,
  },
  actionIcon: { fontSize: 24, marginBottom: 10 },
  actionLabel: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate, lineHeight: 18 },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.5,
    color: colors.slateLight, textTransform: 'uppercase', marginBottom: 10,
  },
  card: {
    backgroundColor: 'white', borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cardEy: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.slateLight, marginBottom: 10,
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.slate, marginBottom: 8 },
  cardDesc: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, lineHeight: 20 },
});
