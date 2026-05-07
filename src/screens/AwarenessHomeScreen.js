import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';

const ARTICLES = [
  { id: 'cgrp-education', icon: '🧠', title: 'What is a CGRP and how does it relate to migraines?', meta: '5 min · Education', color: colors.lavPale },
  { id: 'undertreated', icon: '📋', title: 'How to tell if you are being undertreated for migraines', meta: '4 min · Education', color: colors.sagePale },
  { id: 'hcp-conversation', icon: '💬', title: 'How to talk to your doctor about preventive options', meta: '6 min · HCP Prep', color: colors.lavPale },
];

export default function AwarenessHomeScreen({ navigation }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.greetingSm}>{greeting}</Text>
        <Text style={styles.greeting}>
          Where are you{' '}
          <Text style={styles.greetingItalic}>today?</Text>
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* hero card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Assessment')}
        >
          <LinearGradient
            colors={[colors.lav, '#6B5FAA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroBlob1} />
            <View style={styles.heroBlob2} />
            <Text style={styles.heroEy}>Self-assessment</Text>
            <Text style={styles.heroTitle}>Could preventive therapy be right for you?</Text>
            <Text style={styles.heroDesc}>Answer 5 quick questions about your migraine history and get a personalized signal.</Text>
            <Text style={styles.heroCta}>Take the assessment →</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Learn</Text>

        {ARTICLES.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={styles.artCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ArticleDetail', { articleId: a.id })}
          >
            <View style={[styles.artIcon, { backgroundColor: a.color }]}>
              <Text style={{ fontSize: 20 }}>{a.icon}</Text>
            </View>
            <View style={styles.artText}>
              <Text style={styles.artTitle}>{a.title}</Text>
              <Text style={styles.artMeta}>{a.meta}</Text>
            </View>
            <Text style={{ color: colors.slateLight, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>HCP Prep</Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('HCPPrep')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Prepare for your next appointment</Text>
            <Text style={styles.cardDesc}>Generate a summary of your migraine burden to share with your doctor.</Text>
          </View>
          <Text style={{ color: colors.lav, fontSize: 20 }}>→</Text>
        </TouchableOpacity>

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
  heroCard: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, overflow: 'hidden' },
  heroBlob1: {
    position: 'absolute', width: 180, height: 180, top: -50, right: -50,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 90,
  },
  heroBlob2: {
    position: 'absolute', width: 110, height: 110, bottom: -25, right: 50,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 55,
  },
  heroEy: {
    fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 1.8,
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 8,
  },
  heroTitle: {
    fontFamily: fonts.display, fontSize: 22, color: 'white', lineHeight: 29, marginBottom: 10,
  },
  heroDesc: { fontFamily: fonts.body, fontSize: 17, color: 'rgba(255,255,255,0.82)', lineHeight: 20 },
  heroCta: { fontFamily: fonts.bodyMedium, fontSize: 17, color: 'white', marginTop: 14 },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 1.5,
    color: colors.slateLight, textTransform: 'uppercase', marginTop: 18, marginBottom: 10,
  },
  artCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 13,
    backgroundColor: 'white', borderRadius: radius.md, padding: 14,
    marginBottom: 9, borderWidth: 1, borderColor: colors.border,
  },
  artIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  artText: { flex: 1 },
  artTitle: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate, lineHeight: 20, marginBottom: 4 },
  artMeta: { fontFamily: fonts.body, fontSize: 16, color: colors.slateLight },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.slate, marginBottom: 4 },
  cardDesc: { fontFamily: fonts.body, fontSize: 16, color: colors.slateLight, lineHeight: 18 },
});
