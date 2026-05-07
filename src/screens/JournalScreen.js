import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { saveJournalEntry, getJournalEntries } from '../services/storage';
import { colors, fonts, spacing, radius } from '../theme';

const IMPACTS = ['Stayed home', 'Worked through it', 'Missed activities', 'No impact'];

const TRIGGERS = [
  'Poor sleep', 'Stress', 'Skipped meal', 'Alcohol',
  'Caffeine change', 'Weather change', 'Bright light', 'Hormonal',
  'Dehydration', 'Physical exertion',
];

export default function JournalScreen({ navigation }) {
  const [hadMigraine, setHadMigraine] = useState(null);
  const [severity, setSeverity] = useState(4);
  const [treatments, setTreatments] = useState('');
  const [impacts, setImpacts] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [view, setView] = useState('entry'); // 'entry' | 'history'
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getJournalEntries().then(setRecentEntries);
    }, [])
  );

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

  async function handleSave() {
    if (hadMigraine === null) {
      Alert.alert('One more thing', 'Please indicate whether you had a migraine today.');
      return;
    }
    setSaving(true);
    const entry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      hadMigraine,
      severity: hadMigraine ? severity : null,
      treatments: treatments.trim(),
      functionalImpact: impacts,
      triggers: hadMigraine ? triggers : [],
    };
    try {
      const updated = await saveJournalEntry(entry);
      setRecentEntries(updated);
      setHadMigraine(null);
      setSeverity(4);
      setTreatments('');
      setImpacts([]);
      setTriggers([]);
      setView('history');
      Alert.alert('Entry saved', 'Your log has been saved.');
    } catch {
      Alert.alert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {view === 'entry' ? "Today's log" : 'Journal history'}
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <TouchableOpacity onPress={() => setView(view === 'entry' ? 'history' : 'entry')}>
            <Text style={styles.toggleView}>{view === 'entry' ? 'History' : '+ Log today'}</Text>
          </TouchableOpacity>
          {view === 'history' && (
            <TouchableOpacity onPress={() => navigation.navigate('Trends')}>
              <Text style={[styles.toggleView, { color: colors.sage, fontSize: 16 }]}>View trends →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {view === 'entry' ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {/* migraine toggle */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Did you have a migraine today?</Text>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleOpt, hadMigraine === true && styles.toggleYes]}
                onPress={() => setHadMigraine(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.toggleOptText, hadMigraine === true && { color: colors.terra }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOpt, hadMigraine === false && styles.toggleNo]}
                onPress={() => setHadMigraine(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.toggleOptText, hadMigraine === false && { color: colors.sage }]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>

          {hadMigraine && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Pain severity</Text>
              <Text style={styles.severityValue}>{Math.round(severity)}</Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={severity}
                onValueChange={setSeverity}
                minimumTrackTintColor={colors.lav}
                maximumTrackTintColor={colors.creamMid}
                thumbTintColor={colors.lav}
              />
              <View style={styles.severityLabels}>
                <Text style={styles.severityLabelText}>1: Mild</Text>
                <Text style={styles.severityLabelText}>10: Severe</Text>
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Treatments taken</Text>
            <TextInput
              style={styles.textarea}
              value={treatments}
              onChangeText={setTreatments}
              placeholder={"What did you take, if anything?\n'My rescue medication' or 'my preventive' is fine. No brand names needed."}
              placeholderTextColor={colors.slateLight}
              multiline
              numberOfLines={3}
            />
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
                  >
                    <Text style={[styles.impactOptText, impacts.includes(imp) && { color: colors.lav }]}>{imp}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {hadMigraine && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Possible triggers</Text>
              <View style={styles.impactGrid}>
                {TRIGGERS.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.impactOpt, triggers.includes(t) && styles.triggerOptSel]}
                    onPress={() => toggleTrigger(t)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.impactOptText, triggers.includes(t) && { color: colors.sage }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          {recentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📓</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyDesc}>Start logging daily to build a picture of your migraine patterns over time.</Text>
            </View>
          ) : (
            recentEntries.slice(0, 30).map(entry => (
              <View key={entry.id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <View style={[styles.historyDot, { backgroundColor: entry.hadMigraine ? colors.terra : colors.sage }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>
                      {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.historyStatus}>
                      {entry.hadMigraine ? `Migraine · severity ${entry.severity}` : 'No migraine'}
                    </Text>
                    {entry.treatments ? (
                      <Text style={styles.historyTreatment} numberOfLines={1}>{entry.treatments}</Text>
                    ) : null}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <View style={styles.historyTriggers}>
                        {entry.triggers.slice(0, 3).map(t => (
                          <View key={t} style={styles.historyTriggerChip}>
                            <Text style={styles.historyTriggerText}>{t}</Text>
                          </View>
                        ))}
                        {entry.triggers.length > 3 && (
                          <Text style={styles.historyTriggerMore}>+{entry.triggers.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {view === 'entry' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.88}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save entry'}</Text>
          </TouchableOpacity>
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
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.slate },
  date: { fontFamily: fonts.body, fontSize: 17, color: colors.slateLight, marginTop: 2 },
  toggleView: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.lav, marginTop: 4 },
  scroll: { flex: 1 },
  body: { padding: spacing.lg },
  fieldGroup: { marginBottom: 26 },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.2,
    textTransform: 'uppercase', color: colors.slateLight, marginBottom: 11,
  },
  toggle: { flexDirection: 'row', gap: 10 },
  toggleOpt: {
    flex: 1, padding: 14, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, alignItems: 'center',
  },
  toggleYes: { borderColor: colors.terra, backgroundColor: colors.terraPale },
  toggleNo: { borderColor: colors.sage, backgroundColor: colors.sagePale },
  toggleOptText: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  severityValue: {
    fontFamily: fonts.display, fontSize: 40, color: colors.lav,
    textAlign: 'center', lineHeight: 44, marginBottom: 8,
  },
  severityLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  severityLabelText: { fontFamily: fonts.body, fontSize: 17, color: colors.slateLight },
  textarea: {
    backgroundColor: colors.cream, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, padding: 13, fontFamily: fonts.body, fontSize: 16,
    color: colors.slate, lineHeight: 22, minHeight: 76, textAlignVertical: 'top',
  },
  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  impactOpt: {
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5,
    borderColor: colors.border, borderRadius: 12,
  },
  impactOptSel: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  triggerOptSel: { borderColor: colors.sage, backgroundColor: colors.sagePale },
  impactOptText: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid },
  footer: { padding: spacing.lg, paddingBottom: 32 },
  saveBtn: { backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: 'white' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.slate, marginBottom: 10 },
  emptyDesc: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, textAlign: 'center', lineHeight: 22 },
  historyCard: {
    backgroundColor: 'white', borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, marginBottom: 9,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyDate: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate },
  historyStatus: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid, marginTop: 1 },
  historyTreatment: { fontFamily: fonts.body, fontSize: 15, color: colors.slateLight, marginTop: 2 },
  historyTriggers: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  historyTriggerChip: {
    backgroundColor: colors.sagePale, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  historyTriggerText: { fontFamily: fonts.body, fontSize: 13, color: colors.sage },
  historyTriggerMore: { fontFamily: fonts.body, fontSize: 13, color: colors.slateLight, paddingVertical: 3 },
});
