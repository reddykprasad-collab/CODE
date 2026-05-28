import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getJournalEntries, getTreatmentStartDate, getWeatherData, getMidasScores } from '../services/storage';
import { buildCSV } from '../lib/journal';
import { syncWeatherData, computeWeatherCorrelation } from '../services/weather';
import { colors, fonts, spacing, radius, textSize, shadows } from '../theme';

const DAY_HEADERS = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];

export default function TrendsScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [treatmentStart, setTreatmentStart] = useState(null);
  const [weatherData, setWeatherData] = useState([]);
  const [midasScores, setMidasScores] = useState([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getJournalEntries(), getTreatmentStartDate(), getWeatherData(), getMidasScores()]).then(([e, d, wd, ms]) => {
        setEntries(e);
        setTreatmentStart(d);
        setWeatherData(wd);
        setMidasScores(ms);
      });
      syncWeatherData().then(result => {
        if (result?.data?.length > 0) setWeatherData(result.data);
      });
    }, [])
  );

  const now = new Date();

  async function handleExport() {
    const csv = buildCSV(entries);
    await Share.share({ message: csv, title: 'Migraine Journal Export' });
  }

  // Build date → status map from all entries
  const entryMap = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const key = new Date(e.date).toDateString();
      map[key] = { migraine: e.hadMigraine === true, severity: e.severity, triggers: e.triggers || [], impact: e.functionalImpact || [] };
    });
    return map;
  }, [entries]);

  // 28-day calendar padded to nearest preceding Sunday
  const calDays = useMemo(() => {
    const today = new Date();
    const todayDow = today.getDay(); // 0=Sun, 6=Sat
    const totalBack = todayDow + 27; // padding days + 27 days ago
    const days = [];
    for (let i = totalBack; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const info = entryMap[key];
      const isInRange = i <= 27;
      days.push({
        date: d,
        day: d.getDate(),
        status: isInRange ? (info ? (info.migraine ? 'migraine' : 'clear') : 'none') : 'padding',
        isToday: i === 0,
        padding: i > 27,
      });
    }
    return days;
  }, [entryMap]);

  // 30-day stats
  const thirtyAgo = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; }, []);
  const sixtyAgo  = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 60); return d; }, []);

  const thisMonth  = useMemo(() => entries.filter(e => new Date(e.date) >= thirtyAgo), [entries, thirtyAgo]);
  const lastMonth  = useMemo(() => entries.filter(e => new Date(e.date) >= sixtyAgo && new Date(e.date) < thirtyAgo), [entries, sixtyAgo, thirtyAgo]);

  const migraineThisMonth = useMemo(() => thisMonth.filter(e => e.hadMigraine === true), [thisMonth]);
  const migraineLastMonth = useMemo(() => lastMonth.filter(e => e.hadMigraine === true), [lastMonth]);

  const uniqueMigraineThis = useMemo(() => new Set(migraineThisMonth.map(e => new Date(e.date).toDateString())).size, [migraineThisMonth]);
  const uniqueMigraineLast = useMemo(() => new Set(migraineLastMonth.map(e => new Date(e.date).toDateString())).size, [migraineLastMonth]);
  const daysLogged = useMemo(() => new Set(thisMonth.map(e => new Date(e.date).toDateString())).size, [thisMonth]);

  const avgSeverity = migraineThisMonth.length > 0
    ? (migraineThisMonth.reduce((s, e) => s + (e.severity || 0), 0) / migraineThisMonth.length).toFixed(1)
    : null;

  const trend = lastMonth.length > 0
    ? uniqueMigraineThis < uniqueMigraineLast
      ? { label: 'Improving', color: colors.sageDark, iconBg: colors.sage, icon: 'trending-down', bg: colors.sagePale, border: colors.sageBorder }
      : uniqueMigraineThis > uniqueMigraineLast
      ? { label: 'Increasing', color: colors.terraDark, iconBg: colors.terra, icon: 'trending-up', bg: colors.terraPale, border: colors.terraBorder }
      : { label: 'Stable', color: colors.slateLight, iconBg: colors.slateLight, icon: 'minus', bg: colors.creamMid, border: colors.border }
    : null;

  // Day-of-week breakdown
  const byDay = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    migraineThisMonth.forEach(e => { counts[new Date(e.date).getDay()]++; });
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => ({ label, count: counts[i] }));
  }, [migraineThisMonth]);
  const maxDayCount = Math.max(...byDay.map(d => d.count), 1);

  // Triggers
  const topTriggers = useMemo(() => {
    const counts = {};
    migraineThisMonth.forEach(e => (e.triggers || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [migraineThisMonth]);

  // Functional impacts
  const topImpacts = useMemo(() => {
    const counts = {};
    migraineThisMonth.forEach(e => (e.functionalImpact || []).forEach(imp => {
      counts[imp] = (counts[imp] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [migraineThisMonth]);

  // MOH warning: count distinct days with any acute treatment use in last 30 days
  const mohDays = useMemo(() => {
    const days = new Set();
    thisMonth.forEach(e => {
      const hasStructured = e.acuteTreatments?.length > 0 && !e.acuteTreatments.every(t => t === 'Nothing');
      const hasLegacy = e.treatments && e.treatments.trim().length > 0;
      if (hasStructured || hasLegacy) days.add(new Date(e.date).toDateString());
    });
    return days.size;
  }, [thisMonth]);

  // Treatment efficacy breakdown from structured logging
  const treatmentEfficacy = useMemo(() => {
    const counts = { yes: 0, partial: 0, no: 0 };
    const treatmentCounts = {};
    thisMonth.forEach(e => {
      if (!e.acuteTreatments?.length) return;
      e.acuteTreatments.forEach(t => { treatmentCounts[t] = (treatmentCounts[t] || 0) + 1; });
      if (e.treatmentHelped) counts[e.treatmentHelped] = (counts[e.treatmentHelped] || 0) + 1;
    });
    const total = counts.yes + counts.partial + counts.no;
    if (total === 0) return null;
    return { counts, total, topTreatments: Object.entries(treatmentCounts).sort((a, b) => b[1] - a[1]).slice(0, 3) };
  }, [thisMonth]);

  // Prodrome patterns
  const prodromePatterns = useMemo(() => {
    const counts = {};
    thisMonth.forEach(e => {
      (e.prodrome || []).forEach(p => { counts[p] = (counts[p] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [thisMonth]);

  // Weather correlation
  const weatherCorrelation = useMemo(() => computeWeatherCorrelation(entries, weatherData), [entries, weatherData]);

  // Treatment comparison
  const treatmentComparison = useMemo(() => {
    if (!treatmentStart) return null;
    const start = new Date(treatmentStart);
    const beforeCutoff = new Date(start); beforeCutoff.setDate(beforeCutoff.getDate() - 90);
    const beforeE = entries.filter(e => new Date(e.date) >= beforeCutoff && new Date(e.date) < start);
    const afterE  = entries.filter(e => new Date(e.date) >= start);
    const beforeM = beforeE.filter(e => e.hadMigraine === true);
    const afterM  = afterE.filter(e => e.hadMigraine === true);
    const beforeDays = Math.max(1, Math.round((start - beforeCutoff) / 864e5));
    const afterDays  = Math.max(1, Math.round((now - start) / 864e5));
    const beforePer30 = beforeE.length > 0 ? Math.round((new Set(beforeM.map(e => new Date(e.date).toDateString())).size / beforeDays) * 30) : null;
    const afterPer30  = afterE.length > 0  ? Math.round((new Set(afterM.map(e => new Date(e.date).toDateString())).size / afterDays) * 30)  : null;
    const beforeSev = beforeM.length > 0 ? (beforeM.reduce((s, e) => s + (e.severity || 0), 0) / beforeM.length).toFixed(1) : null;
    const afterSev  = afterM.length > 0  ? (afterM.reduce((s, e) => s + (e.severity || 0), 0) / afterM.length).toFixed(1)  : null;
    const daysIn = Math.floor((now - start) / 864e5);
    return { beforePer30, afterPer30, beforeSev, afterSev, daysIn, isEarly: daysIn < 90 };
  }, [treatmentStart, entries]);

  const hasData = entries.length > 0;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Feather name="arrow-left" size={18} color={colors.slateMid} />
            <Text style={styles.backTxt}>Back</Text>
          </TouchableOpacity>
          {entries.length > 0 && (
            <TouchableOpacity onPress={handleExport} style={styles.exportBtn} accessibilityRole="button" accessibilityLabel="Export journal as CSV">
              <Feather name="download" size={16} color={colors.slateMid} />
              <Text style={styles.exportTxt}>Export</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>My trends</Text>
        <Text style={styles.subtitle}>Last 30 days</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {!hasData ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={44} color={colors.slateLight} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyDesc}>Three to four weeks of logs is enough to show real patterns. Your first entry is the most important one.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Main', { screen: 'Journal' })} activeOpacity={0.88}>
              <Text style={styles.emptyBtnTxt}>Go to journal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── 28-day calendar heatmap ── */}
            <View style={styles.calCard}>
              <Text style={styles.sectionLabel}>28-day overview</Text>
              <View style={styles.calGrid}>
                <View style={styles.calRow}>
                  {DAY_HEADERS.map((h, i) => (
                    <View key={i} style={styles.calHeaderCell}>
                      <Text style={styles.calHeaderTxt}>{h}</Text>
                    </View>
                  ))}
                </View>
                {Array.from({ length: Math.ceil(calDays.length / 7) }, (_, row) => (
                  <View key={row} style={styles.calRow}>
                    {calDays.slice(row * 7, row * 7 + 7).map((day, i) => (
                      <View key={i} style={styles.calCellWrap}>
                        {day.padding ? (
                          <View style={styles.calCell} />
                        ) : (
                          <View style={[
                            styles.calCell,
                            day.status === 'migraine' && styles.calCellMigraine,
                            day.status === 'clear' && styles.calCellClear,
                            day.isToday && day.status === 'none' && styles.calCellTodayEmpty,
                            day.isToday && styles.calCellToday,
                          ]}>
                            <Text style={[
                              styles.calCellNum,
                              day.status === 'migraine' && styles.calNumWhite,
                              day.status === 'clear' && styles.calNumWhite,
                              day.isToday && day.status === 'none' && styles.calNumToday,
                              day.isToday && day.status !== 'none' && styles.calNumWhite,
                            ]}>
                              {day.day}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              <View style={styles.calLegend}>
                <View style={styles.calLegendItem}>
                  <View style={[styles.calLegendDot, { backgroundColor: colors.terra }]} />
                  <Text style={styles.calLegendTxt}>Migraine</Text>
                </View>
                <View style={styles.calLegendItem}>
                  <View style={[styles.calLegendDot, { backgroundColor: colors.sage }]} />
                  <Text style={styles.calLegendTxt}>Clear</Text>
                </View>
                <View style={styles.calLegendItem}>
                  <View style={[styles.calLegendDot, { borderWidth: 1.5, borderColor: colors.border }]} />
                  <Text style={styles.calLegendTxt}>Not logged</Text>
                </View>
              </View>
            </View>

            {/* ── Medication overuse warning ── */}
            {mohDays >= 10 && (
              <View style={styles.mohWarning}>
                <Feather name="alert-triangle" size={16} color={colors.terraDark} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.mohTitle}>Medication overuse risk</Text>
                  <Text style={styles.mohBody}>
                    You've used acute treatments on {mohDays} days this month. Using rescue medication more than 10 days per month can lead to rebound headaches. Bring this up with your doctor.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Key stats ── */}
            <View style={styles.statRow}>
              <View style={[styles.statCard, uniqueMigraineThis >= 8 && { borderColor: colors.terraBorder, backgroundColor: colors.terraPale }]}>
                <Text style={[styles.statVal, uniqueMigraineThis >= 8 && { color: colors.terraDark }]}>{uniqueMigraineThis}</Text>
                <Text style={styles.statLbl}>Migraine days</Text>
                <Text style={styles.statSub}>this month</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{avgSeverity ?? '—'}</Text>
                <Text style={styles.statLbl}>Avg severity</Text>
                <Text style={styles.statSub}>out of 10</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{daysLogged}</Text>
                <Text style={styles.statLbl}>Days logged</Text>
                <Text style={styles.statSub}>this month</Text>
              </View>
            </View>

            {/* ── Month-over-month trend ── */}
            {trend && (
              <View style={[styles.trendCard, { backgroundColor: trend.bg, borderColor: trend.border }]}>
                <View style={[styles.trendIconWrap, { backgroundColor: trend.iconBg }]}>
                  <Feather name={trend.icon} size={18} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trendLabel, { color: trend.color }]}>{trend.label}</Text>
                  <Text style={styles.trendSub}>
                    {uniqueMigraineThis} migraine days this month · {uniqueMigraineLast} last month
                  </Text>
                </View>
              </View>
            )}

            {/* ── Treatment comparison ── */}
            {treatmentComparison && treatmentComparison.beforePer30 !== null && treatmentComparison.afterPer30 !== null && (
              <>
                <Text style={styles.sectionLabel}>Treatment progress</Text>
                <View style={styles.compareCard}>
                  <View style={styles.compareCol}>
                    <Text style={styles.compareTag}>Before</Text>
                    <Text style={styles.compareNum}>{treatmentComparison.beforePer30}</Text>
                    <Text style={styles.compareUnit}>days/month</Text>
                    {treatmentComparison.beforeSev && <Text style={styles.compareSev}>avg {treatmentComparison.beforeSev} sev</Text>}
                  </View>
                  <View style={styles.compareArrow}>
                    <Feather
                      name={treatmentComparison.afterPer30 < treatmentComparison.beforePer30 ? 'arrow-down' : 'arrow-up'}
                      size={20}
                      color={treatmentComparison.afterPer30 < treatmentComparison.beforePer30 ? colors.sage : colors.terra}
                    />
                  </View>
                  <View style={[styles.compareCol, {
                    backgroundColor: treatmentComparison.afterPer30 < treatmentComparison.beforePer30 ? colors.sagePale : colors.terraPale,
                    borderRadius: radius.md,
                  }]}>
                    <Text style={styles.compareTag}>After</Text>
                    <Text style={[styles.compareNum, { color: treatmentComparison.afterPer30 < treatmentComparison.beforePer30 ? colors.sageDark : colors.terraDark }]}>
                      {treatmentComparison.afterPer30}
                    </Text>
                    <Text style={styles.compareUnit}>days/month</Text>
                    {treatmentComparison.afterSev && <Text style={styles.compareSev}>avg {treatmentComparison.afterSev} sev</Text>}
                  </View>
                </View>
                {treatmentComparison.isEarly && (
                  <Text style={styles.compareNote}>Early data — preventives typically take 3–6 months to reach full effect. Keep logging.</Text>
                )}
              </>
            )}

            {/* ── Day-of-week bars ── */}
            <Text style={styles.sectionLabel}>Migraines by day of week</Text>
            <View style={styles.card}>
              {byDay.map(d => (
                <View
                  key={d.label}
                  style={styles.barRow}
                  accessible
                  accessibilityLabel={`${d.label}: ${d.count > 0 ? `${d.count} migraine${d.count !== 1 ? 's' : ''}` : 'none'}`}
                >
                  <Text style={styles.barLabel} accessible={false}>{d.label}</Text>
                  <View style={styles.barTrack}>
                    {d.count > 0 && (
                      <View style={[styles.barFill, { width: `${(d.count / maxDayCount) * 100}%` }]} />
                    )}
                  </View>
                  <Text style={[styles.barCount, d.count > 0 && { color: colors.lav }]} accessible={false}>
                    {d.count > 0 ? d.count : '—'}
                  </Text>
                </View>
              ))}
            </View>

            {/* ── Triggers ── */}
            {topTriggers.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Top triggers</Text>
                <View style={styles.card}>
                  {topTriggers.map(([trigger, count], i) => (
                    <View key={trigger} style={[styles.triggerRow, i === topTriggers.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={styles.triggerRankWrap}>
                        <Text style={styles.triggerRank}>{i + 1}</Text>
                      </View>
                      <Text style={styles.triggerLabel}>{trigger}</Text>
                      <View style={styles.triggerCountWrap}>
                        <Text style={styles.triggerCount}>{count}×</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Functional impact ── */}
            {topImpacts.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Functional impact</Text>
                <View style={styles.card}>
                  {topImpacts.map(([impact, count], i) => (
                    <View key={impact} style={[styles.triggerRow, i === topImpacts.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.triggerRankWrap, { backgroundColor: colors.terraPale }]}>
                        <Text style={[styles.triggerRank, { color: colors.terraDark }]}>{i + 1}</Text>
                      </View>
                      <Text style={styles.triggerLabel}>{impact}</Text>
                      <View style={[styles.triggerCountWrap, { backgroundColor: colors.lavPale }]}>
                        <Text style={[styles.triggerCount, { color: colors.lavDark }]}>{count}×</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── MOH warning ── */}
            {mohDays >= 10 && (
              <View style={styles.mohCard}>
                <View style={styles.mohIconWrap}>
                  <Feather name="alert-triangle" size={18} color={colors.terra} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mohTitle}>Frequent acute treatment use</Text>
                  <Text style={styles.mohBody}>
                    You used acute treatment on {mohDays} days this month. Using it 10 or more days a month can gradually increase headache frequency. Worth raising with your doctor.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Treatment efficacy ── */}
            {treatmentEfficacy && (
              <>
                <Text style={styles.sectionLabel}>Acute treatment efficacy</Text>
                <View style={styles.card}>
                  <View style={styles.efficacyBar}>
                    {treatmentEfficacy.counts.yes > 0 && (
                      <View style={[styles.efficacySegment, { flex: treatmentEfficacy.counts.yes, backgroundColor: colors.sage }]} />
                    )}
                    {treatmentEfficacy.counts.partial > 0 && (
                      <View style={[styles.efficacySegment, { flex: treatmentEfficacy.counts.partial, backgroundColor: colors.amber }]} />
                    )}
                    {treatmentEfficacy.counts.no > 0 && (
                      <View style={[styles.efficacySegment, { flex: treatmentEfficacy.counts.no, backgroundColor: colors.terra }]} />
                    )}
                  </View>
                  <View style={styles.efficacyLegend}>
                    {[
                      { label: 'Helped', count: treatmentEfficacy.counts.yes, color: colors.sage },
                      { label: 'Partial', count: treatmentEfficacy.counts.partial, color: colors.amber },
                      { label: 'No relief', count: treatmentEfficacy.counts.no, color: colors.terra },
                    ].filter(l => l.count > 0).map(l => (
                      <View key={l.label} style={styles.efficacyLegendItem}>
                        <View style={[styles.efficacyDot, { backgroundColor: l.color }]} />
                        <Text style={styles.efficacyLegendTxt}>{l.label} ({l.count})</Text>
                      </View>
                    ))}
                  </View>
                  {treatmentEfficacy.topTreatments.length > 0 && (
                    <View style={styles.topTreatmentsList}>
                      {treatmentEfficacy.topTreatments.map(([name, count]) => (
                        <View key={name} style={styles.topTreatmentRow}>
                          <Text style={styles.topTreatmentName}>{name}</Text>
                          <Text style={styles.topTreatmentCount}>{count}×</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* ── Prodrome patterns ── */}
            {prodromePatterns.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Warning signs before migraines</Text>
                <View style={styles.card}>
                  {prodromePatterns.map(([sign, count], i) => (
                    <View key={sign} style={[styles.triggerRow, i === prodromePatterns.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.triggerRankWrap, { backgroundColor: colors.creamMid }]}>
                        <Text style={[styles.triggerRank, { color: colors.slateLight }]}>{i + 1}</Text>
                      </View>
                      <Text style={styles.triggerLabel}>{sign}</Text>
                      <View style={[styles.triggerCountWrap, { backgroundColor: colors.creamMid }]}>
                        <Text style={[styles.triggerCount, { color: colors.slateMid }]}>{count}×</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Weather correlation ── */}
            {weatherCorrelation && (
              <>
                <Text style={styles.sectionLabel}>Weather sensitivity</Text>
                <View style={[styles.card, weatherCorrelation.sensitive && { borderColor: colors.lavLight, backgroundColor: colors.lavPale }]}>
                  <Text style={styles.weatherHeading}>
                    {weatherCorrelation.sensitive
                      ? 'Barometric pressure may be a factor for you'
                      : 'No strong pressure pattern detected yet'}
                  </Text>
                  <Text style={styles.weatherBody}>
                    {weatherCorrelation.sensitive
                      ? `Avg pressure on migraine days: ${weatherCorrelation.migraineAvg} hPa${weatherCorrelation.clearAvg ? ` · Clear days: ${weatherCorrelation.clearAvg} hPa` : ''}. ` +
                        (weatherCorrelation.pressureDropTotal > 0
                          ? `Pressure drops preceded ${weatherCorrelation.pressureDropMigraines} of ${weatherCorrelation.pressureDropTotal} migraine days.`
                          : '')
                      : `Analyzed ${weatherCorrelation.migraineDaysAnalyzed} migraine days. Keep logging to build a clearer picture.`}
                  </Text>
                  {weatherCity && (
                    <Text style={styles.weatherMeta}>Based on approximate location: {weatherCity}</Text>
                  )}
                </View>
              </>
            )}

            {/* ── MIDAS nudge ── */}
            <TouchableOpacity
              style={styles.midasCard}
              onPress={() => navigation.navigate('Midas')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Take MIDAS check-in to measure how much migraines are affecting your daily life."
            >
              <View style={styles.midasIcon}>
                <Feather name="activity" size={20} color={colors.terra} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.midasTitle}>
                  {midasScores.length > 0 ? 'Update your MIDAS score' : 'Measure your migraine impact'}
                </Text>
                <Text style={styles.midasDesc}>
                  {midasScores.length > 0
                    ? `Last score: ${midasScores[0].score} · Run monthly to track changes over time.`
                    : '5 questions · 2 min · A clinically recognized disability scale doctors know.'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.terra} />
            </TouchableOpacity>

            {/* ── HCP nudge ── */}
            <TouchableOpacity
              style={styles.hcpCard}
              onPress={() => navigation.navigate('HCPPrep')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Prepare for your appointment. Turn this data into a one-page summary for your doctor."
            >
              <View style={styles.hcpIcon}>
                <Feather name="clipboard" size={20} color={colors.lav} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hcpTitle}>Prepare for your appointment</Text>
                <Text style={styles.hcpDesc}>Turn this data into a one-page summary your doctor can read in under a minute.</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.lav} />
            </TouchableOpacity>

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  exportTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  title: { fontFamily: fonts.display, fontSize: textSize.displayMd, color: colors.slate },
  subtitle: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight, marginTop: 2 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: 4 },

  mohWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.md, padding: 14, marginBottom: 4,
  },
  mohTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.terraDark, marginBottom: 3 },
  mohBody: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateMid, lineHeight: 20 },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateLight,
    marginBottom: 12, marginTop: 20,
  },

  // Calendar
  calCard: {
    ...shadows.sm,
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: 18, borderWidth: 1, borderColor: colors.border,
    marginBottom: 12,
  },
  calGrid: { gap: 5 },
  calRow: { flexDirection: 'row', gap: 5 },
  calHeaderCell: { flex: 1, alignItems: 'center', paddingBottom: 6 },
  calHeaderTxt: { fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, color: colors.slateLight, letterSpacing: 0.5 },
  calCellWrap: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCell: {
    width: '90%', aspectRatio: 1, borderRadius: 100,
    backgroundColor: colors.creamMid,
    alignItems: 'center', justifyContent: 'center',
  },
  calCellMigraine: { backgroundColor: colors.terra },
  calCellClear: { backgroundColor: colors.sage },
  calCellToday: { borderWidth: 2, borderColor: colors.lav },
  calCellTodayEmpty: { backgroundColor: colors.lavPale },
  calCellNum: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.slateLight },
  calNumWhite: { color: colors.white },
  calNumToday: { color: colors.lav, fontFamily: fonts.bodySemiBold },
  calLegend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border,
  },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calLegendDot: { width: 10, height: 10, borderRadius: 5 },
  calLegendTxt: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateLight },

  // Stats
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    ...shadows.sm,
    flex: 1, backgroundColor: colors.white, borderRadius: radius.lg,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statVal: { fontFamily: fonts.display, fontSize: textSize.displayMd, color: colors.slate, lineHeight: 34 },
  statLbl: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.slateLight, textAlign: 'center', marginTop: 4 },
  statSub: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight, textAlign: 'center' },

  // Trend
  trendCard: {
    ...shadows.sm,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: radius.lg, padding: 16, borderWidth: 1, marginBottom: 4,
  },
  trendIconWrap: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  trendLabel: { fontFamily: fonts.bodyMedium, fontSize: textSize.base },
  trendSub: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateMid, marginTop: 2 },

  // Treatment comparison
  compareCard: {
    ...shadows.sm,
    backgroundColor: colors.lavPale, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lavLight,
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, marginBottom: 8,
  },
  compareCol: { flex: 1, alignItems: 'center', padding: 10 },
  compareTag: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.fine, color: colors.slateLight, marginBottom: 6,
  },
  compareNum: { fontFamily: fonts.display, fontSize: textSize.displayLg, color: colors.slate, lineHeight: 36 },
  compareUnit: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight, marginTop: 2 },
  compareSev: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.slateMid, marginTop: 4 },
  compareArrow: { alignItems: 'center', justifyContent: 'center', width: 32 },
  compareNote: {
    fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateMid,
    textAlign: 'center', lineHeight: 19, marginBottom: 8,
  },

  // Day bars + card
  card: {
    ...shadows.sm,
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  barLabel: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.slateMid, width: 34 },
  barTrack: {
    flex: 1, height: 10, backgroundColor: colors.creamMid,
    borderRadius: radius.full, overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.lav, borderRadius: radius.full },
  barCount: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.slateLight, width: 22, textAlign: 'right' },

  // Triggers
  triggerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  triggerRankWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.lavPale, alignItems: 'center', justifyContent: 'center',
  },
  triggerRank: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.lav },
  triggerLabel: { flex: 1, fontFamily: fonts.body, fontSize: textSize.body, color: colors.slate },
  triggerCountWrap: {
    backgroundColor: colors.terraStrong, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 3,
  },
  triggerCount: { fontFamily: fonts.bodyMedium, fontSize: textSize.label, color: colors.terraDark },

  // HCP nudge
  hcpCard: {
    ...shadows.sm,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.lavPale, borderWidth: 1, borderColor: colors.lavLight,
    borderRadius: radius.xl, padding: 16, marginTop: 8,
  },
  hcpIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  hcpTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.lav, marginBottom: 3 },
  hcpDesc: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateMid, lineHeight: 18 },

  // MOH warning
  mohCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.lg, padding: 16, marginBottom: 8, marginTop: 8,
  },
  mohIconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  mohTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.terraDark, marginBottom: 4 },
  mohBody: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateMid, lineHeight: 19 },

  // Treatment efficacy
  efficacyBar: { flexDirection: 'row', height: 12, borderRadius: radius.full, overflow: 'hidden', marginBottom: 12 },
  efficacySegment: { height: '100%' },
  efficacyLegend: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  efficacyLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  efficacyDot: { width: 8, height: 8, borderRadius: 4 },
  efficacyLegendTxt: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateMid },
  topTreatmentsList: { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  topTreatmentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  topTreatmentName: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slate },
  topTreatmentCount: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slateMid },

  // Weather
  weatherHeading: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slate, marginBottom: 6 },
  weatherBody: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 21 },
  weatherMeta: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight, marginTop: 8 },

  // MIDAS nudge
  midasCard: {
    ...shadows.sm,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.xl, padding: 16, marginTop: 8,
  },
  midasIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  midasTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.terraDark, marginBottom: 3 },
  midasDesc: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateMid, lineHeight: 18 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: textSize.headingMd, color: colors.slate, marginBottom: 10 },
  emptyDesc: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { backgroundColor: colors.lav, borderRadius: radius.full, paddingVertical: 14, paddingHorizontal: 28 },
  emptyBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
});
