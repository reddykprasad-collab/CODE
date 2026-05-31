import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { saveJournalEntry, getJournalEntries, deleteJournalEntry, getCustomTriggers, saveCustomTrigger } from '../services/storage';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';
import { groupByPeriod } from '../lib/journal';
import { colors, fonts, spacing, radius, textSize } from '../theme';

const IMPACTS = ['Stayed home', 'Worked through it', 'Missed activities', 'No impact'];

const ACUTE_TREATMENTS = [
  'NSAID / OTC pain reliever',
  'Triptan (rescue med)',
  'Anti-nausea medication',
  'Ice pack / rest',
  'Nothing',
];

const PRODROME_SIGNS = [
  'Aura', 'Neck stiffness', 'Mood change',
  'Light sensitivity', 'Food craving', 'Yawning', 'Fatigue',
];

const EFFICACY_OPTIONS = [
  { label: 'Helped fully', value: 'yes', color: colors.sageDark, bg: colors.sagePale, border: colors.sageBorder },
  { label: 'Partial relief', value: 'partial', color: '#FFC030', bg: '#1C1508', border: '#3D2E08' },
  { label: 'No relief', value: 'no', color: colors.terraDark, bg: colors.terraPale, border: colors.terraBorder },
];

const TRIGGERS = [
  'Poor sleep', 'Stress', 'Hormonal', 'Weather change', 'Caffeine change', 'Dehydration',
  'Skipped meal', 'Alcohol', 'Bright light', 'Physical exertion',
];
const TRIGGER_VISIBLE_COUNT = 6;

const DURATION_OPTIONS = [
  { label: 'Under 4h', value: '<4h' },
  { label: '4–12h', value: '4-12h' },
  { label: '12–24h', value: '12-24h' },
  { label: '1–2 days', value: '1-2d' },
  { label: '2–3 days', value: '2-3d' },
  { label: '3+ days', value: '3+d' },
];

const SLEEP_QUALITY_OPTIONS = [
  { label: 'Poor (<5h)', value: 'poor' },
  { label: 'Fair (5–7h)', value: 'fair' },
  { label: 'Good (7–9h)', value: 'good' },
  { label: 'Great (9h+)', value: 'great' },
];

export default function JournalScreen({ navigation }) {
  const { emitEvent } = useOrchestration();
  const [hadMigraine, setHadMigraine] = useState(null);
  const [severity, setSeverity] = useState(5);
  const [impacts, setImpacts] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [view, setView] = useState('entry');
  const [acuteTreatments, setAcuteTreatments] = useState([]);
  const [treatmentHelped, setTreatmentHelped] = useState(null);
  const [prodrome, setProdrome] = useState([]);
  const [saving, setSaving] = useState(false);
  const [undoEntry, setUndoEntry] = useState(null);
  const [showAllTriggers, setShowAllTriggers] = useState(false);
  const [customTriggers, setCustomTriggers] = useState([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [entryDate, setEntryDate] = useState(new Date());
  const [editingEntry, setEditingEntry] = useState(null);
  const [duration, setDuration] = useState(null);
  const [sleepQuality, setSleepQuality] = useState(null);
  const [isPeriodDay, setIsPeriodDay] = useState(null);
  const undoTimerRef = useRef(null);

  const allTriggers = useMemo(() => [...TRIGGERS, ...customTriggers], [customTriggers]);

  useFocusEffect(
    useCallback(() => {
      getJournalEntries().then(setRecentEntries);
      getCustomTriggers().then(setCustomTriggers);
    }, [])
  );

  const migraineCount = useMemo(
    () => recentEntries.filter(e => e.hadMigraine === true).length,
    [recentEntries]
  );
  const clearCount = recentEntries.length - migraineCount;
  const groups = useMemo(() => groupByPeriod(recentEntries), [recentEntries]);

  const hasLoggedDate = useMemo(
    () => !editingEntry && recentEntries.some(e => new Date(e.date).toDateString() === entryDate.toDateString()),
    [recentEntries, entryDate, editingEntry]
  );

  const sortedTriggers = useMemo(() => {
    const recentlyUsed = new Set(
      recentEntries.flatMap(e => e.triggers || []).slice(0, 30)
    );
    return [...allTriggers].sort((a, b) => {
      const aSelected = triggers.includes(a);
      const bSelected = triggers.includes(b);
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      const aRecent = recentlyUsed.has(a);
      const bRecent = recentlyUsed.has(b);
      if (aRecent !== bRecent) return aRecent ? -1 : 1;
      return 0;
    });
  }, [allTriggers, triggers, recentEntries]);

  function toggleImpact(impact) {
    setImpacts(prev =>
      prev.includes(impact) ? prev.filter(i => i !== impact) : [...prev, impact]
    );
  }

  function toggleTrigger(trigger) {
    setTriggers(prev =>
      prev.includes(trigger) ? prev.filter(t => t !== trigger) : [...prev, trigger]
    );
  }

  async function handleAddCustomTrigger() {
    const t = newTrigger.trim();
    if (!t) return;
    const updated = await saveCustomTrigger(t);
    setCustomTriggers(updated);
    setTriggers(prev => [...prev, t]);
    setNewTrigger('');
  }

  function handleEdit(entry) {
    setEditingEntry(entry);
    setEntryDate(new Date(entry.date));
    setHadMigraine(entry.hadMigraine);
    setSeverity(entry.severity ?? 5);
    setAcuteTreatments(entry.acuteTreatments || []);
    setTreatmentHelped(entry.treatmentHelped || null);
    setProdrome(entry.prodrome || []);
    setImpacts(entry.functionalImpact || []);
    setTriggers(entry.triggers || []);
    setDuration(entry.duration || null);
    setSleepQuality(entry.sleepQuality || null);
    setIsPeriodDay(entry.isPeriodDay ?? null);
    setView('entry');
  }

  async function handleSave() {
    if (hadMigraine === null) {
      Alert.alert('One more thing', 'Please indicate whether you had a migraine today.');
      return;
    }
    setSaving(true);
    const hasTreatment = acuteTreatments.length > 0 && !acuteTreatments.every(t => t === 'Nothing');
    const entry = {
      id: editingEntry ? editingEntry.id : Date.now().toString(),
      date: entryDate.toISOString(),
      hadMigraine,
      severity: hadMigraine ? severity : null,
      treatments: editingEntry?.treatments && acuteTreatments.length === 0 ? editingEntry.treatments : undefined,
      acuteTreatments,
      treatmentHelped: hasTreatment ? treatmentHelped : null,
      prodrome,
      functionalImpact: impacts,
      triggers,
      duration: hadMigraine ? duration : null,
      sleepQuality,
      isPeriodDay,
    };
    try {
      if (editingEntry && editingEntry.id !== entry.id) {
        await deleteJournalEntry(editingEntry.id);
      }
      const updated = await saveJournalEntry(entry);
      emitEvent(EVENTS.JOURNAL_SAVED, {
        hadMigraine: entry.hadMigraine,
        severity: entry.severity,
        triggers: entry.triggers || [],
      });
      setRecentEntries(updated);
      setHadMigraine(null);
      setSeverity(5);
      setAcuteTreatments([]);
      setTreatmentHelped(null);
      setProdrome([]);
      setImpacts([]);
      setTriggers([]);
      setDuration(null);
      setSleepQuality(null);
      setIsPeriodDay(null);
      setEntryDate(new Date());
      setEditingEntry(null);
      setUndoEntry(entry);
      undoTimerRef.current = setTimeout(() => {
        setUndoEntry(null);
        setView('history');
      }, 5000);
    } catch {
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    Alert.alert(
      'Delete entry?',
      'This will permanently remove this log entry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await deleteJournalEntry(id);
              setRecentEntries(updated);
            } catch {}
          },
        },
      ]
    );
  }

  async function handleUndo() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    const entry = undoEntry;
    setUndoEntry(null);
    if (entry) {
      try {
        const updated = await deleteJournalEntry(entry.id);
        setRecentEntries(updated);
      } catch {}
      setHadMigraine(entry.hadMigraine);
      setSeverity(entry.severity ?? 5);
      setAcuteTreatments(entry.acuteTreatments || []);
      setTreatmentHelped(entry.treatmentHelped || null);
      setProdrome(entry.prodrome || []);
      setImpacts(entry.functionalImpact || []);
      setTriggers(entry.triggers || []);
      setDuration(entry.duration || null);
      setSleepQuality(entry.sleepQuality || null);
      setIsPeriodDay(entry.isPeriodDay ?? null);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {view === 'entry' ? (editingEntry ? 'Edit entry' : "Today's log") : 'Journal history'}
          </Text>
          <Text style={styles.date}>
            {(view === 'entry' ? entryDate : new Date()).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <TouchableOpacity
            onPress={() => setView(view === 'entry' ? 'history' : 'entry')}
            accessibilityRole="button"
            accessibilityLabel={view === 'entry' ? 'View journal history' : 'Log today'}
            style={{ paddingVertical: 8 }}
          >
            <Text style={styles.toggleView}>{view === 'entry' ? 'History' : '+ Log today'}</Text>
          </TouchableOpacity>
          {view === 'history' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Trends')}
              accessibilityRole="button"
              accessibilityLabel="View trends"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }}
            >
              <Text style={[styles.toggleView, { color: colors.sageDark, fontSize: textSize.base }]}>View trends</Text>
              <Feather name="arrow-right" size={13} color={colors.sageDark} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {view === 'entry' ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {editingEntry && (
            <View style={styles.editingBanner}>
              <Feather name="edit-2" size={13} color={colors.lav} />
              <Text style={styles.editingBannerTxt}>
                Editing {new Date(editingEntry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => { setEditingEntry(null); setEntryDate(new Date()); setHadMigraine(null); setSeverity(5); setImpacts([]); setTriggers([]); }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.terraDark }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          {hasLoggedDate && !editingEntry && (
            <View style={styles.updateBanner}>
              <Feather name="info" size={13} color={colors.lav} />
              <Text style={styles.updateBannerTxt}>You've already logged this date. Saving will update your entry.</Text>
            </View>
          )}
          {/* Date selector */}
          {!editingEntry && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Log date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  const isSelected = d.toDateString() === entryDate.toDateString();
                  const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.dateChip, isSelected && styles.dateChipSel]}
                      onPress={() => setEntryDate(new Date(d))}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ checked: isSelected }}
                    >
                      <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSel]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {/* migraine toggle */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Did you have a migraine?</Text>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleOpt, hadMigraine === true && styles.toggleYes]}
                onPress={() => setHadMigraine(true)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityLabel="Yes, I had a migraine"
                accessibilityState={{ checked: hadMigraine === true }}
              >
                <Text style={[styles.toggleOptText, hadMigraine === true && { color: colors.terraDark }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOpt, hadMigraine === false && styles.toggleNo]}
                onPress={() => setHadMigraine(false)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityLabel="No migraine today"
                accessibilityState={{ checked: hadMigraine === false }}
              >
                <Text style={[styles.toggleOptText, hadMigraine === false && { color: colors.sageDark }]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>

          {hadMigraine && (
            <View style={styles.fieldGroup}>
              <View style={styles.severityHeader}>
                <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Pain severity</Text>
                <Text style={styles.severityRange}>1 = mild · 10 = severe</Text>
              </View>
              {[[1,2,3,4,5],[6,7,8,9,10]].map((row, ri) => (
                <View key={ri} style={styles.severityRow}>
                  {row.map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.severityBtn, severity === n && styles.severityBtnActive]}
                      onPress={() => setSeverity(n)}
                      accessibilityRole="radio"
                      accessibilityLabel={`Severity ${n}`}
                      accessibilityState={{ checked: severity === n }}
                    >
                      <Text style={[styles.severityBtnTxt, severity === n && styles.severityBtnTxtActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}

          {hadMigraine && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Attack duration</Text>
              <View style={styles.impactGrid}>
                {DURATION_OPTIONS.map(opt => {
                  const sel = duration === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.impactOpt, sel && styles.durationOptSel]}
                      onPress={() => setDuration(prev => prev === opt.value ? null : opt.value)}
                      activeOpacity={0.85}
                      accessibilityRole="radio"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ checked: sel }}
                    >
                      <Text style={[styles.impactOptText, sel && { color: colors.terraDark }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Treatments taken</Text>
            {/* Legacy text entry shown only when editing an old entry that has no structured data */}
            {editingEntry && editingEntry.treatments && acuteTreatments.length === 0 ? (
              <View style={styles.legacyTreatmentBanner}>
                <Feather name="package" size={13} color={colors.slateLight} />
                <Text style={styles.legacyTreatmentTxt} numberOfLines={2}>{editingEntry.treatments}</Text>
              </View>
            ) : null}
            <View style={styles.impactGrid}>
              {ACUTE_TREATMENTS.map(t => {
                const sel = acuteTreatments.includes(t);
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.impactOpt, sel && styles.impactOptSel]}
                    onPress={() => setAcuteTreatments(prev =>
                      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                    )}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityLabel={t}
                    accessibilityState={{ checked: sel }}
                  >
                    <Text style={[styles.impactOptText, sel && { color: colors.lav }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {acuteTreatments.length > 0 && !acuteTreatments.every(t => t === 'Nothing') && (
              <View style={styles.efficacyRow}>
                <Text style={styles.efficacyLabel}>Did it help?</Text>
                <View style={styles.efficacyOptions}>
                  {EFFICACY_OPTIONS.map(opt => {
                    const sel = treatmentHelped === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.efficacyOpt, { borderColor: sel ? opt.border : colors.border, backgroundColor: sel ? opt.bg : colors.white }]}
                        onPress={() => setTreatmentHelped(prev => prev === opt.value ? null : opt.value)}
                        activeOpacity={0.85}
                        accessibilityRole="radio"
                        accessibilityLabel={opt.label}
                        accessibilityState={{ checked: sel }}
                      >
                        <Text style={[styles.efficacyOptTxt, { color: sel ? opt.color : colors.slateMid }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {hadMigraine && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Functional impact</Text>
              <View style={styles.impactGrid}>
                {IMPACTS.map(imp => (
                  <TouchableOpacity
                    key={imp}
                    style={[styles.impactOpt, impacts.includes(imp) && styles.impactOptSel]}
                    onPress={() => toggleImpact(imp)}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityLabel={imp}
                    accessibilityState={{ checked: impacts.includes(imp) }}
                  >
                    <Text style={[styles.impactOptText, impacts.includes(imp) && { color: colors.lav }]}>{imp}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Last night's sleep</Text>
            <View style={styles.impactGrid}>
              {SLEEP_QUALITY_OPTIONS.map(opt => {
                const sel = sleepQuality === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.impactOpt, sel && styles.sleepOptSel]}
                    onPress={() => setSleepQuality(prev => prev === opt.value ? null : opt.value)}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ checked: sel }}
                  >
                    <Text style={[styles.impactOptText, sel && { color: colors.lav }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Warning signs before the migraine</Text>
            <Text style={styles.fieldSubLabel}>Prodrome symptoms, if any</Text>
            <View style={styles.impactGrid}>
              {PRODROME_SIGNS.map(sign => {
                const sel = prodrome.includes(sign);
                return (
                  <TouchableOpacity
                    key={sign}
                    style={[styles.impactOpt, sel && styles.prodromeOptSel]}
                    onPress={() => setProdrome(prev =>
                      prev.includes(sign) ? prev.filter(s => s !== sign) : [...prev, sign]
                    )}
                    activeOpacity={0.85}
                    accessibilityRole="checkbox"
                    accessibilityLabel={sign}
                    accessibilityState={{ checked: sel }}
                  >
                    <Text style={[styles.impactOptText, sel && { color: colors.slateLight }]}>{sign}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Possible triggers</Text>
            <View style={styles.impactGrid}>
              {(showAllTriggers ? sortedTriggers : sortedTriggers.slice(0, TRIGGER_VISIBLE_COUNT)).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.impactOpt, triggers.includes(t) && styles.triggerOptSel]}
                  onPress={() => toggleTrigger(t)}
                  activeOpacity={0.85}
                  accessibilityRole="checkbox"
                  accessibilityLabel={t}
                  accessibilityState={{ checked: triggers.includes(t) }}
                >
                  <Text style={[styles.impactOptText, triggers.includes(t) && { color: colors.sageDark }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {sortedTriggers.length > TRIGGER_VISIBLE_COUNT && (
              <TouchableOpacity
                onPress={() => setShowAllTriggers(v => !v)}
                style={styles.showMoreBtn}
                accessibilityRole="button"
                accessibilityLabel={showAllTriggers ? 'Show fewer triggers' : `Show ${sortedTriggers.length - TRIGGER_VISIBLE_COUNT} more triggers`}
              >
                <Text style={styles.showMoreTxt}>
                  {showAllTriggers ? 'Show fewer' : `Show ${sortedTriggers.length - TRIGGER_VISIBLE_COUNT} more`}
                </Text>
                <Feather name={showAllTriggers ? 'chevron-up' : 'chevron-down'} size={14} color={colors.lav} />
              </TouchableOpacity>
            )}
            <View style={styles.customTriggerRow}>
              <TextInput
                style={styles.customTriggerInput}
                value={newTrigger}
                onChangeText={setNewTrigger}
                placeholder="Add your own trigger…"
                placeholderTextColor={colors.slateLight}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={handleAddCustomTrigger}
                accessibilityLabel="Add a custom trigger"
              />
              <TouchableOpacity
                style={[styles.customTriggerBtn, !newTrigger.trim() && { opacity: 0.3 }]}
                onPress={handleAddCustomTrigger}
                disabled={!newTrigger.trim()}
                accessibilityRole="button"
                accessibilityLabel="Add trigger"
              >
                <Feather name="plus" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Period day{' '}
              <Text style={{ fontFamily: fonts.body, color: colors.slateLight }}>· optional</Text>
            </Text>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleOpt, isPeriodDay === true && styles.periodOptYes]}
                onPress={() => setIsPeriodDay(prev => prev === true ? null : true)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityLabel="Yes, today is a period day"
                accessibilityState={{ checked: isPeriodDay === true }}
              >
                <Text style={[styles.toggleOptText, isPeriodDay === true && { color: colors.terraDark }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOpt, isPeriodDay === false && styles.toggleNo]}
                onPress={() => setIsPeriodDay(prev => prev === false ? null : false)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityLabel="No, not a period day"
                accessibilityState={{ checked: isPeriodDay === false }}
              >
                <Text style={[styles.toggleOptText, isPeriodDay === false && { color: colors.sageDark }]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.historyBody}>
          {recentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="book-open" size={40} color={colors.slateLight} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyDesc}>Even a "no migraine today" entry matters. Absence data is pattern data, and your doctor needs both.</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setView('entry')}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Log your first journal entry"
              >
                <Text style={styles.emptyBtnTxt}>Log your first entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Summary strip */}
              <View style={styles.summaryStrip}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNum}>{recentEntries.length}</Text>
                  <Text style={styles.summaryLabel}>logged</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNum, { color: colors.terraDark }]}>{migraineCount}</Text>
                  <Text style={styles.summaryLabel}>migraine</Text>
                </View>
                {clearCount > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNum, { color: colors.sageDark }]}>{clearCount}</Text>
                    <Text style={styles.summaryLabel}>clear</Text>
                  </View>
                )}
              </View>

              {/* Grouped history */}
              {groups.map(group => (
                <View key={group.title} style={styles.group}>
                  <Text style={styles.groupHeader}>{group.title}</Text>
                  {group.entries.map(entry => {
                    const isMigraine = entry.hadMigraine === true;
                    const d = new Date(entry.date);
                    return (
                      <View key={entry.id} style={[styles.entryCard, isMigraine ? styles.entryCardMigraine : styles.entryCardClear]}>
                        <View style={styles.entryTier1}>
                          <View style={styles.entryDateWrap}>
                            <Text style={styles.entryDayNum}>{d.getDate()}</Text>
                            <Text style={styles.entryDateMeta}>
                              {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short' })}
                            </Text>
                          </View>
                          <View style={styles.entryRightBlock}>
                            <View style={[styles.entryStatusBadge, isMigraine ? styles.entryStatusBadgeMigraine : styles.entryStatusBadgeClear]}>
                              <Text style={[styles.entryStatusTxt, isMigraine ? styles.entryStatusTxtMigraine : styles.entryStatusTxtClear]}>
                                {isMigraine ? 'Migraine' : 'Clear'}
                              </Text>
                            </View>
                            {isMigraine && entry.severity != null && (
                              <Text style={styles.entrySeverity}>{entry.severity}/10</Text>
                            )}
                            <TouchableOpacity
                              onPress={() => handleEdit(entry)}
                              style={styles.editBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Edit this entry"
                              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            >
                              <Feather name="edit-2" size={13} color={colors.slateLight} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(entry.id)}
                              style={styles.deleteBtn}
                              accessibilityRole="button"
                              accessibilityLabel="Delete this entry"
                              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            >
                              <Feather name="trash-2" size={13} color={colors.slateLight} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {entry.triggers && entry.triggers.length > 0 && (
                          <Text style={styles.entryTriggerLine} numberOfLines={1}>
                            {entry.triggers.slice(0, 4).join(' · ')}{entry.triggers.length > 4 ? ` +${entry.triggers.length - 4}` : ''}
                          </Text>
                        )}

                        {(entry.acuteTreatments?.length > 0) ? (
                          <View style={styles.entryTreatmentRow}>
                            <Feather name="package" size={12} color={colors.slateLight} style={{ marginTop: 1 }} />
                            <Text style={styles.entryTreatment} numberOfLines={1}>
                              {entry.acuteTreatments.join(', ')}
                              {entry.treatmentHelped ? ` · ${entry.treatmentHelped === 'yes' ? 'helped' : entry.treatmentHelped === 'partial' ? 'partial' : 'no relief'}` : ''}
                            </Text>
                          </View>
                        ) : entry.treatments ? (
                          <View style={styles.entryTreatmentRow}>
                            <Feather name="package" size={12} color={colors.slateLight} style={{ marginTop: 1 }} />
                            <Text style={styles.entryTreatment} numberOfLines={1}>{entry.treatments}</Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </>
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {view === 'entry' && (
        <View style={styles.footer}>
          {undoEntry ? (
            <View style={styles.undoBar}>
              <Text style={styles.undoBarTxt}>Entry saved</Text>
              <TouchableOpacity
                onPress={handleUndo}
                style={styles.undoBtn}
                accessibilityRole="button"
                accessibilityLabel="Undo save"
              >
                <Text style={styles.undoBtnTxt}>Undo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Save journal entry"
              accessibilityState={{ disabled: saving, busy: saving }}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save entry'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontFamily: fonts.display, fontSize: textSize.headingMd, color: colors.slate },
  date: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateLight, marginTop: 2 },
  toggleView: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.lav, marginTop: 4 },
  scroll: { flex: 1 },
  body: { padding: spacing.lg },
  historyBody: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  // Entry form
  fieldGroup: { marginBottom: 26 },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.body, color: colors.slateMid, marginBottom: 11,
  },
  toggle: { flexDirection: 'row', gap: 10 },
  toggleOpt: {
    flex: 1, padding: 14, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, alignItems: 'center',
  },
  toggleYes: { borderColor: colors.terra, backgroundColor: colors.terraPale },
  toggleNo: { borderColor: colors.sage, backgroundColor: colors.sagePale },
  toggleOptText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  severityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  severityRange: { fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight },
  severityRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  severityBtn: { flex: 1, paddingVertical: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, alignItems: 'center' },
  severityBtnActive: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  severityBtnTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  severityBtnTxtActive: { fontFamily: fonts.bodyMedium, color: colors.lav },
  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  impactOpt: {
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5,
    borderColor: colors.border, borderRadius: 12,
  },
  impactOptSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  triggerOptSel: { borderColor: colors.sage, backgroundColor: colors.sagePale },
  prodromeOptSel: { borderColor: colors.border, backgroundColor: colors.creamMid },
  durationOptSel: { borderColor: colors.terra, backgroundColor: colors.terraPale },
  sleepOptSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  periodOptYes: { borderColor: colors.terra, backgroundColor: colors.terraPale },
  impactOptText: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateMid },
  fieldSubLabel: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight, marginBottom: 10, marginTop: -6 },
  efficacyRow: { marginTop: 12 },
  efficacyLabel: { fontFamily: fonts.bodySemiBold, fontSize: textSize.body, color: colors.slateMid, marginBottom: 8 },
  efficacyOptions: { flexDirection: 'row', gap: 8 },
  efficacyOpt: {
    flex: 1, paddingVertical: 10, borderWidth: 1.5,
    borderColor: colors.border, borderRadius: 12, alignItems: 'center',
  },
  efficacyOptTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.slateMid },
  legacyTreatmentBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: colors.cream, borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  legacyTreatmentTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateLight, flex: 1, lineHeight: 20 },
  footer: { padding: spacing.lg, paddingBottom: 32 },
  saveBtn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  updateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.lavPale, borderWidth: 1, borderColor: colors.lavLight,
    borderRadius: radius.md, padding: 12, marginBottom: 20,
  },
  updateBannerTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.lav, flex: 1, lineHeight: 20 },
  deleteBtn: { marginTop: 2, padding: 2 },
  editBtn: { marginTop: 2, padding: 2 },
  editingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.lavPale, borderWidth: 1, borderColor: colors.lavLight,
    borderRadius: radius.md, padding: 12, marginBottom: 20,
  },
  editingBannerTxt: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.lav, flex: 1, lineHeight: 20 },
  dateChip: {
    paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.full, backgroundColor: colors.white,
  },
  dateChipSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  dateChipText: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },
  dateChipTextSel: { fontFamily: fonts.bodyMedium, color: colors.lav },
  customTriggerRow: {
    flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center',
  },
  customTriggerInput: {
    flex: 1, backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    fontFamily: fonts.body, fontSize: textSize.body, color: colors.slate,
  },
  customTriggerBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sage,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.display, fontSize: textSize.heading, color: colors.slate, marginBottom: 10 },
  emptyDesc: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateMid, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 24, backgroundColor: colors.lav, borderRadius: radius.full,
    paddingVertical: 14, paddingHorizontal: 28,
  },
  emptyBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },

  // History — summary strip
  summaryStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 20, paddingHorizontal: spacing.md, marginBottom: 4,
  },
  summaryItem: { alignItems: 'center' },
  summaryNum: { fontFamily: fonts.bodyMedium, fontSize: textSize.headingLg, color: colors.slate, lineHeight: 30 },
  summaryLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.micro,
    color: colors.slateLight, letterSpacing: 0.5, marginTop: 3,
  },

  // History — groups
  group: { marginBottom: 28 },
  groupHeader: {
    fontFamily: fonts.displayItalic, fontSize: textSize.titleMd,
    color: colors.slateMid, marginBottom: 10, letterSpacing: 0.2,
  },

  // History — entry card
  entryCard: { borderRadius: radius.lg, marginBottom: 6, padding: 14 },
  entryCardMigraine: { backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.terraBorder },
  entryCardClear: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  entryTier1: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 8,
  },
  entryDateWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  entryDayNum: { fontFamily: fonts.bodyMedium, fontSize: textSize.display, color: colors.slate, lineHeight: 32 },
  entryDateMeta: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateLight },
  entryRightBlock: { alignItems: 'flex-end', gap: 6 },
  entryStatusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  entryStatusBadgeMigraine: { backgroundColor: colors.white },
  entryStatusBadgeClear: { backgroundColor: colors.sagePale },
  entryStatusTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.label },
  entryStatusTxtMigraine: { color: colors.terraDark },
  entryStatusTxtClear: { color: colors.sageDark },
  entrySeverity: { fontFamily: fonts.bodyMedium, fontSize: textSize.fine, color: colors.terraDark },
  entryTriggerLine: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateLight, marginBottom: 6 },
  entryTreatmentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  entryTreatment: { fontFamily: fonts.body, fontSize: textSize.label, color: colors.slateLight, lineHeight: 18, flex: 1 },

  // Trigger show more
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingTop: 10, paddingBottom: 2, alignSelf: 'flex-start',
  },
  showMoreTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.caption, color: colors.lav },

  // Undo bar
  undoBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.slate, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  undoBarTxt: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.white },
  undoBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  undoBtnTxt: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.lavLight },
});
