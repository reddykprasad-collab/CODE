import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { useUserPath } from '../contexts/UserPathContext';
import { colors, fonts, spacing, radius } from '../theme';

const TOOLS = [
  {
    icon: '❓',
    label: 'Candidacy Assessment',
    desc: 'Answer 5 questions to see if preventive therapy may be right for you.',
    bg: colors.lavPale,
    route: 'Assessment',
  },
  {
    icon: '📋',
    label: 'HCP Prep',
    desc: 'Build a shareable summary of your migraine history for your doctor.',
    bg: colors.sagePale,
    route: 'HCPPrep',
  },
  {
    icon: '📈',
    label: 'My Trends',
    desc: 'View your migraine patterns, triggers, and day-of-week breakdown.',
    bg: colors.lavPale,
    route: 'Trends',
  },
];

const PERSONAS = [
  {
    key: 'awareness',
    name: 'Alex',
    role: 'Awareness path',
    desc: 'Newly diagnosed, exploring options',
    icon: '🔍',
  },
  {
    key: 'adherence',
    name: 'Jordan',
    role: 'Adherence path',
    desc: 'On treatment, tracking adherence',
    icon: '💊',
  },
];

export default function ToolsScreen({ navigation }) {
  const { userPath, setUserPath } = useUserPath();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>Everything you need to prepare and track.</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.route}
            style={styles.toolCard}
            onPress={() => navigation.navigate(tool.route)}
            activeOpacity={0.85}
          >
            <View style={[styles.toolIcon, { backgroundColor: tool.bg }]}>
              <Text style={{ fontSize: 22 }}>{tool.icon}</Text>
            </View>
            <View style={styles.toolText}>
              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.toolDesc}>{tool.desc}</Text>
            </View>
            <Text style={styles.toolChevron}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Demo: switch view</Text>
        <Text style={styles.sectionSub}>Tap a persona to see the full experience for each path.</Text>

        <View style={styles.personaRow}>
          {PERSONAS.map((p) => {
            const active = userPath === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.personaCard, active && styles.personaCardActive]}
                onPress={() => setUserPath(p.key)}
                activeOpacity={0.85}
              >
                <Text style={styles.personaIcon}>{p.icon}</Text>
                <Text style={[styles.personaName, active && styles.personaNameActive]}>{p.name}</Text>
                <Text style={[styles.personaRole, active && styles.personaRoleActive]}>{p.role}</Text>
                <Text style={styles.personaDesc}>{p.desc}</Text>
                {active && <View style={styles.activePip} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('PrivacyPolicy')}
          style={styles.privacyLink}
          activeOpacity={0.7}
        >
          <Text style={styles.privacyLinkText}>Privacy Policy</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 4 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.slate },
  subtitle: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, marginTop: 2 },
  scroll: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  toolCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: radius.lg, padding: spacing.md,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  toolIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  toolText: { flex: 1 },
  toolLabel: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate, marginBottom: 3 },
  toolDesc: { fontFamily: fonts.body, fontSize: 16, color: colors.slateLight, lineHeight: 20 },
  toolChevron: { fontFamily: fonts.body, fontSize: 22, color: colors.slateLight },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.5,
    textTransform: 'uppercase', color: colors.slateLight, marginBottom: 6,
  },
  sectionSub: { fontFamily: fonts.body, fontSize: 16, color: colors.slateLight, marginBottom: spacing.md },
  personaRow: { flexDirection: 'row', gap: 10 },
  personaCard: {
    flex: 1, backgroundColor: 'white', borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center',
  },
  personaCardActive: { borderColor: colors.lav, backgroundColor: colors.lavPale },
  personaIcon: { fontSize: 28, marginBottom: 8 },
  personaName: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate, marginBottom: 2 },
  personaNameActive: { color: colors.lav },
  personaRole: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.slateLight, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  personaRoleActive: { color: colors.lav },
  personaDesc: { fontFamily: fonts.body, fontSize: 15, color: colors.slateMid, textAlign: 'center', lineHeight: 18 },
  activePip: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lav, marginTop: 10,
  },
  privacyLink: { alignItems: 'center', paddingVertical: spacing.md },
  privacyLinkText: { fontFamily: fonts.body, fontSize: 14, color: colors.slateLight, textDecorationLine: 'underline' },
});
