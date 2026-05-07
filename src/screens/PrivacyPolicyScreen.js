import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';

const SECTIONS = [
  {
    heading: 'What this app stores',
    body: 'Migraine Companion stores the following data locally on your device only: your journal entries (migraine logs, severity, treatments, and triggers), your dose confirmation history and streak count, your reminder preferences, and your onboarding answers. None of this data leaves your device or is stored on any server.',
  },
  {
    heading: 'What leaves your device',
    body: 'Messages you send in the AI Chat tab are transmitted to Anthropic\'s API to generate responses. Anthropic\'s own privacy policy governs how those messages are handled. Do not share information in chat that you would not want transmitted over the internet. The AI does not retain memory of your conversations between sessions.',
  },
  {
    heading: 'What we do not collect',
    body: 'This app does not collect your name, email address, or any identifying information. It does not access your location. It does not read health records from other apps. It does not include analytics, advertising, or usage tracking of any kind.',
  },
  {
    heading: 'Data storage and deletion',
    body: 'All data is stored on your device using AsyncStorage, a standard local storage system. We have no servers and no database. Uninstalling the app permanently deletes all data stored by the app. There is no account to delete and no data to request.',
  },
  {
    heading: 'Children',
    body: 'This app is not intended for use by anyone under the age of 18. We do not knowingly collect any information from children.',
  },
  {
    heading: 'Health disclaimer',
    body: 'Migraine Companion provides general health education only. It is not a medical device and does not provide medical advice, diagnosis, or treatment. All content is for informational purposes only. Always consult a qualified healthcare provider before making any decisions about your health or treatment.',
  },
  {
    heading: 'Changes to this policy',
    body: 'If this policy changes in a meaningful way, the updated version will be included in the next app update with a revised date below.',
  },
  {
    heading: 'Contact',
    body: 'Questions about this policy can be sent to: privacy@migrainecompanion.app',
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.date}>Last updated: May 2026</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.leadCard}>
          <Text style={styles.leadText}>
            Migraine Companion does not collect, sell, or share your personal data. Everything you log stays on your device.
          </Text>
        </View>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { marginBottom: 10 },
  backText: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.slate, marginBottom: 4 },
  date: { fontFamily: fonts.body, fontSize: 15, color: colors.slateLight },
  scroll: { flex: 1 },
  body: { padding: spacing.lg },
  leadCard: {
    backgroundColor: colors.lavPale, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.lavLight, marginBottom: spacing.lg,
  },
  leadText: {
    fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.lav, lineHeight: 24,
  },
  section: { marginBottom: spacing.lg },
  sectionHeading: {
    fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate, marginBottom: 8,
  },
  sectionBody: {
    fontFamily: fonts.body, fontSize: 16, color: colors.slateMid, lineHeight: 24,
  },
});
