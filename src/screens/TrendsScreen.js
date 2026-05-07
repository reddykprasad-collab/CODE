import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getJournalEntries } from '../services/storage';
import { colors, fonts, spacing, radius } from '../theme';

function StatCard({ label, value, sub, accent }) {
  return (
    <View style={[styles.statCard, accent && { borderColor: accent, borderWidth: 1.5 }]}>
      <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function Bar({ label, count, max, color }) {
  const width = max > 0 ? (count / max) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color || colors.lav }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

export default function TrendsScreen({ navigation }) {
  const [entries, setEntries] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getJournalEntries().then(setEntries);
    }, [])
  );

  // compute stats
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const thisMonth = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);
  const lastMonth = entries.filter(e => new Date(e.date) >= sixtyDaysAgo && new Date(e.date) < thirtyDaysAgo);

  const uniqueDaysLogged = new Set(thisMonth.map(e => new Date(e.date).toDateString())).size;

  const migraineDaysSet = new Set(
    thisMonth.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())
  );
  const migraineThisMonth = thisMonth.filter(e => e.hadMigraine);
  const migraineLastMonth = lastMonth.filter(e => e.hadMigraine);
  const uniqueMigraineDaysThisMonth = migraineDaysSet.size;
  const uniqueMigraineDaysLastMonth = new Set(
    migraineLastMonth.map(e => new Date(e.date).toDateString())
  ).size;

  const avgSeverity = migraineThisMonth.length > 0
    ? (migraineThisMonth.reduce((sum, e) => sum + (e.severity || 0), 0) / migraineThisMonth.length).toFixed(1)
    : '-';

  // day-of-week breakdown
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = dayNames.map((d, i) => ({
    label: d,
    count: migraineThisMonth.filter(e => new Date(e.date).getDay() === i).length,
  }));
  const maxDay = Math.max(...byDay.map(d => d.count), 1);

  // impact breakdown
  const allImpacts = migraineThisMonth.flatMap(e => e.functionalImpact || []);
  const impactCounts = {};
  allImpacts.forEach(i => { impactCounts[i] = (impactCounts[i] || 0) + 1; });
  const topImpacts = Object.entries(impactCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // trigger breakdown
  const allTriggers = migraineThisMonth.flatMap(e => e.triggers || []);
  const triggerCounts = {};
  allTriggers.forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; });
  const topTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const trend = uniqueMigraineDaysThisMonth < uniqueMigraineDaysLastMonth
    ? { label: 'Improving', color: colors.sage, arrow: '↓' }
    : uniqueMigraineDaysThisMonth > uniqueMigraineDaysLastMonth
    ? { label: 'Increasing', color: colors.terra, arrow: '↑' }
    : { label: 'Stable', color: colors.slateLight, arrow: '→' };

  const hasData = entries.length > 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My trends</Text>
        <Text style={styles.subtitle}>Last 30 days</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {!hasData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyDesc}>Log a few days in the Journal tab and your trends will appear here.</Text>
            <TouchableOpacity
              style={styles.logBtn}
              onPress={() => navigation.navigate('Main', { screen: 'Journal' })}
              activeOpacity={0.88}
            >
              <Text style={styles.logBtnText}>Go to journal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* stat row */}
            <View style={styles.statRow}>
              <StatCard
                label="Migraine days"
                value={uniqueMigraineDaysThisMonth}
                sub="this month"
                accent={uniqueMigraineDaysThisMonth >= 8 ? colors.terra : undefined}
              />
              <StatCard label="Avg severity" value={avgSeverity} sub="out of 10" />
              <StatCard label="Days logged" value={uniqueDaysLogged} sub="this month" />
            </View>

            {/* trend vs last month */}
            {lastMonth.length > 0 && (
              <View style={[styles.trendCard, { borderColor: trend.color }]}>
                <Text style={[styles.trendArrow, { color: trend.color }]}>{trend.arrow}</Text>
                <View>
                  <Text style={[styles.trendLabel, { color: trend.color }]}>{trend.label}</Text>
                  <Text style={styles.trendSub}>
                    {uniqueMigraineDaysThisMonth} migraine days this month vs {uniqueMigraineDaysLastMonth} last month
                  </Text>
                </View>
              </View>
            )}

            {/* by day of week */}
            <Text style={styles.sectionLabel}>Migraines by day of week</Text>
            <View style={styles.card}>
              {byDay.map(d => (
                <Bar key={d.label} label={d.label} count={d.count} max={maxDay} color={colors.lav} />
              ))}
            </View>

            {/* triggers */}
            {topTriggers.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Most common triggers</Text>
                <View style={styles.card}>
                  {topTriggers.map(([trigger, count]) => (
                    <View key={trigger} style={styles.impactRow}>
                      <Text style={styles.impactLabel}>{trigger}</Text>
                      <View style={[styles.impactPill, { backgroundColor: colors.sagePale }]}>
                        <Text style={[styles.impactCount, { color: colors.sage }]}>{count}×</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* functional impact */}
            {topImpacts.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Most common impacts</Text>
                <View style={styles.card}>
                  {topImpacts.map(([impact, count]) => (
                    <View key={impact} style={styles.impactRow}>
                      <Text style={styles.impactLabel}>{impact}</Text>
                      <View style={[styles.impactPill, { backgroundColor: colors.lavPale }]}>
                        <Text style={[styles.impactCount, { color: colors.lav }]}>{count}×</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* recent entries */}
            <Text style={styles.sectionLabel}>Recent log</Text>
            {entries.slice(0, 7).map(entry => (
              <View key={entry.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: entry.hadMigraine ? colors.terra : colors.sage }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logDate}>
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.logStatus}>
                    {entry.hadMigraine ? `Migraine, severity ${entry.severity}` : 'No migraine'}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.hcpNudge}>
              <Text style={styles.hcpNudgeText}>📋 Bring this data to your next appointment.</Text>
              <Text style={styles.hcpNudgeSub}>The HCP Prep tool can turn it into a shareable summary your doctor can read in under a minute.</Text>
            </View>

            <View style={{ height: 110 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  back: { marginBottom: spacing.sm },
  backText: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.slate },
  subtitle: { fontFamily: fonts.body, fontSize: 17, color: colors.slateLight, marginTop: 2 },
  scroll: { flex: 1 },
  body: { padding: spacing.md },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.5,
    textTransform: 'uppercase', color: colors.slateLight, marginBottom: 10, marginTop: 18,
  },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontFamily: fonts.display, fontSize: 32, color: colors.slate, lineHeight: 36 },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slateLight, textAlign: 'center', marginTop: 4 },
  statSub: { fontFamily: fonts.body, fontSize: 13, color: colors.slateLight, textAlign: 'center' },
  trendCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1.5, marginBottom: 4,
  },
  trendArrow: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  trendLabel: { fontFamily: fonts.bodyMedium, fontSize: 17 },
  trendSub: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid, marginTop: 2 },
  card: {
    backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slateMid, width: 32 },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.creamMid, borderRadius: 100 },
  barFill: { height: '100%', borderRadius: 100, minWidth: 4 },
  barCount: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate, width: 20, textAlign: 'right' },
  impactRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  impactLabel: { fontFamily: fonts.body, fontSize: 16, color: colors.slate },
  impactPill: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  impactCount: { fontFamily: fonts.bodyMedium, fontSize: 16 },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 12, padding: spacing.md,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  logDot: { width: 10, height: 10, borderRadius: 5 },
  logDate: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate },
  logStatus: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid, marginTop: 2 },
  hcpNudge: {
    backgroundColor: colors.lavPale, borderRadius: 14, padding: spacing.md,
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.lavLight,
  },
  hcpNudgeText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.lav, marginBottom: 6 },
  hcpNudgeSub: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, lineHeight: 20 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.slate, marginBottom: 10 },
  emptyDesc: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  logBtn: { backgroundColor: colors.lav, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28 },
  logBtnText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: 'white' },
});
